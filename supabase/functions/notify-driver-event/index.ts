/**
 * notify-driver-event — fans out a single driver_notifications row to the
 * driver's preferred channels (push, SMS, WhatsApp) using the existing
 * send-* edge functions.
 *
 * Triggered by the `fanout_driver_notification` Postgres trigger via pg_net,
 * but can also be invoked directly with `{ notification_id }`.
 *
 * Channel selection per driver:
 *   1. notification_preferences row (push / sms / whatsapp booleans), if any
 *   2. Otherwise: in-app only (already delivered by the DB insert)
 *
 * In-app delivery is unaffected — this function only adds external channels.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildCorsHeaders,
  handleCorsPreflightRequest,
  secureJsonResponse,
} from "../_shared/cors.ts";

interface Payload {
  notification_id: string;
}

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = buildCorsHeaders(req);

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(url, serviceKey);

    let body: Payload;
    try {
      body = await req.json();
    } catch {
      return secureJsonResponse({ error: "Invalid JSON body" }, req, 400);
    }

    if (!body.notification_id || typeof body.notification_id !== "string") {
      return secureJsonResponse({ error: "notification_id required" }, req, 400);
    }

    // Load the notification + the driver's contact info.
    const { data: notif, error: notifErr } = await supabase
      .from("driver_notifications")
      .select(
        "id, organization_id, driver_id, user_id, kind, title, body, link, payload",
      )
      .eq("id", body.notification_id)
      .maybeSingle();

    if (notifErr || !notif) {
      return secureJsonResponse(
        { error: "Notification not found", details: notifErr?.message },
        req,
        404,
      );
    }

    const { data: driver } = await supabase
      .from("drivers")
      .select("id, user_id, phone, first_name, last_name")
      .eq("id", notif.driver_id)
      .maybeSingle();

    if (!driver) {
      return secureJsonResponse({ error: "Driver not found" }, req, 404);
    }

    // Look up notification preferences (best-effort).
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("push_enabled, sms_enabled, whatsapp_enabled, email_enabled")
      .eq("user_id", driver.user_id || "00000000-0000-0000-0000-000000000000")
      .maybeSingle();

    const channels = {
      push: prefs?.push_enabled ?? true,        // default ON
      sms: prefs?.sms_enabled ?? false,
      whatsapp: prefs?.whatsapp_enabled ?? false,
    };

    const message = `${notif.title}${notif.body ? "\n" + notif.body : ""}`;
    const results: Record<string, unknown> = { in_app: "delivered" };

    // 1) Push — only when we have a driver auth user.
    if (channels.push && driver.user_id) {
      try {
        const r = await supabase.functions.invoke("send-push-notification", {
          body: {
            user_id: driver.user_id,
            title: notif.title,
            body: notif.body || "",
            data: { link: notif.link, kind: notif.kind, notification_id: notif.id },
          },
        });
        results.push = r.error ? { error: r.error.message } : "queued";
      } catch (e) {
        results.push = { error: (e as Error).message };
      }
    }

    // 2) SMS — only when phone is on file.
    if (channels.sms && driver.phone) {
      try {
        const r = await supabase.functions.invoke("send-sms", {
          body: { to: driver.phone, message, type: notif.kind },
        });
        results.sms = r.error ? { error: r.error.message } : "queued";
      } catch (e) {
        results.sms = { error: (e as Error).message };
      }
    }

    // 3) WhatsApp — same gating as SMS.
    if (channels.whatsapp && driver.phone) {
      try {
        const r = await supabase.functions.invoke("send-whatsapp", {
          body: { to: driver.phone, message, type: notif.kind },
        });
        results.whatsapp = r.error ? { error: r.error.message } : "queued";
      } catch (e) {
        results.whatsapp = { error: (e as Error).message };
      }
    }

    return secureJsonResponse({ ok: true, notification_id: notif.id, results }, req);
  } catch (error) {
    console.error("notify-driver-event error:", error);
    return secureJsonResponse(
      { error: "Internal error", details: (error as Error).message },
      req,
      500,
    );
  }
});
