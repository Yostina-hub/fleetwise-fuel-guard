import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse, getClientId } from "../_shared/rate-limiter.ts";
import { buildCorsHeaders, handleCorsPreflightRequest, secureJsonResponse } from "../_shared/cors.ts";

interface WhatsAppRequest {
  to: string;
  message: string;
  template_name?: string;
  template_params?: Record<string, string>;
}

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = buildCorsHeaders(req);

  try {
    const rl = checkRateLimit(getClientId(req), { maxRequests: 10, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return secureJsonResponse({ error: "Missing authorization header" }, req, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return secureJsonResponse({ error: "Invalid token" }, req, 401);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      return secureJsonResponse({ error: "User has no organization" }, req, 400);
    }

    // Get WhatsApp config from organization settings
    const { data: orgSettings } = await supabase
      .from("organization_settings")
      .select("sms_gateway_config")
      .eq("organization_id", profile.organization_id)
      .single();

    const config = orgSettings?.sms_gateway_config as Record<string, any> | null;
    const waConfig = config?.whatsapp;

    if (!waConfig || !waConfig.is_active) {
      return secureJsonResponse({ error: "WhatsApp not configured or inactive" }, req, 400);
    }

    let body: WhatsAppRequest;
    try {
      body = await req.json();
    } catch {
      return secureJsonResponse({ error: "Invalid request body" }, req, 400);
    }

    const { to, message, template_name, template_params } = body;
    if (!to || (!message && !template_name)) {
      return secureJsonResponse({ error: "Missing 'to' and 'message' or 'template_name'" }, req, 400);
    }

    // Normalize phone to +251 format
    let phone = to.replace(/\s+/g, "");
    if (phone.startsWith("0")) phone = "+251" + phone.slice(1);
    if (!phone.startsWith("+")) phone = "+" + phone;

    const provider = waConfig.provider || "meta";
    let result;

    switch (provider) {
      case "meta":
        result = await sendMetaWhatsApp(phone, message, template_name, template_params, waConfig);
        break;
      case "twilio":
        result = await sendTwilioWhatsApp(phone, message, waConfig);
        break;
      default:
        return secureJsonResponse({ error: `Unknown WhatsApp provider: ${provider}` }, req, 400);
    }

    // Audit log
    await supabase.from("audit_logs").insert({
      organization_id: profile.organization_id,
      user_id: user.id,
      action: "send_whatsapp",
      resource_type: "whatsapp",
      resource_id: phone.slice(0, 4) + "****" + phone.slice(-2),
      status: result.success ? "success" : "error",
      new_values: { provider, template_name },
      error_message: result.error,
    });

    if (!result.success) {
      return secureJsonResponse({ error: result.error }, req, 500);
    }

    return secureJsonResponse({ success: true, messageId: result.messageId }, req, 200);
  } catch (error: unknown) {
    console.error("WhatsApp function error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Meta (WhatsApp Business API) via Cloud API
async function sendMetaWhatsApp(
  to: string,
  message: string | undefined,
  templateName: string | undefined,
  templateParams: Record<string, string> | undefined,
  config: Record<string, any>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const phoneNumberId = config.phone_number_id;
    const accessToken = config.access_token;
    const apiUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

    let payload: Record<string, any>;

    if (templateName) {
      payload = {
        messaging_product: "whatsapp",
        to: to.replace("+", ""),
        type: "template",
        template: {
          name: templateName,
          language: { code: config.language || "en" },
          components: templateParams ? [{
            type: "body",
            parameters: Object.values(templateParams).map(v => ({ type: "text", text: v })),
          }] : undefined,
        },
      };
    } else {
      payload = {
        messaging_product: "whatsapp",
        to: to.replace("+", ""),
        type: "text",
        text: { body: message },
      };
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.text();
      return { success: false, error: `Meta WhatsApp API error: ${errData}` };
    }

    const data = await response.json();
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Twilio WhatsApp
async function sendTwilioWhatsApp(
  to: string,
  message: string,
  config: Record<string, any>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const accountSid = config.account_sid;
    const authToken = config.auth_token;
    const fromNumber = config.from_number;

    const apiUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const formData = new URLSearchParams();
    formData.append("To", `whatsapp:${to}`);
    formData.append("From", `whatsapp:${fromNumber}`);
    formData.append("Body", message);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errData = await response.json();
      return { success: false, error: errData.message || "Twilio WhatsApp error" };
    }

    const data = await response.json();
    return { success: true, messageId: data.sid };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
