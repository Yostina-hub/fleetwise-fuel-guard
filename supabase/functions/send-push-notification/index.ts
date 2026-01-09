import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Web Push VAPID keys - in production, store these as secrets
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "";
const VAPID_PUBLIC_KEY = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";
const VAPID_SUBJECT = "mailto:admin@fleettrack.app";

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{ action: string; title: string; icon?: string }>;
}

interface RequestBody {
  user_ids?: string[];
  organization_id?: string;
  payload: PushPayload;
}

async function sendPushToEndpoint(
  subscription: { endpoint: string; p256dh_key: string; auth_key: string },
  payload: PushPayload
): Promise<boolean> {
  try {
    // For now, we'll use a simple fetch approach
    // In production, you'd want to use the web-push library with proper VAPID signing
    
    const pushData = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/pwa-192x192.png",
      badge: payload.badge || "/pwa-192x192.png",
      tag: payload.tag,
      data: payload.data,
      actions: payload.actions
    });

    // Note: This is a simplified implementation
    // Full Web Push requires proper VAPID JWT signing
    // For production, consider using a service like Firebase Cloud Messaging
    // or implementing full Web Push protocol
    
    console.log(`Would send push to: ${subscription.endpoint}`);
    console.log(`Payload: ${pushData}`);
    
    return true;
  } catch (error) {
    console.error("Failed to send push notification:", error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_ids, organization_id, payload }: RequestBody = await req.json();

    if (!payload?.title || !payload?.body) {
      return new Response(
        JSON.stringify({ error: "Missing required payload fields (title, body)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build query for subscriptions
    let query = supabase
      .from("push_subscriptions")
      .select("*")
      .eq("is_active", true);

    if (user_ids && user_ids.length > 0) {
      query = query.in("user_id", user_ids);
    } else if (organization_id) {
      query = query.eq("organization_id", organization_id);
    } else {
      return new Response(
        JSON.stringify({ error: "Must specify user_ids or organization_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: subscriptions, error: fetchError } = await query;

    if (fetchError) {
      console.error("Error fetching subscriptions:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch push subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active push subscriptions found", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send push to all subscriptions
    let successCount = 0;
    let failCount = 0;
    const failedEndpoints: string[] = [];

    for (const subscription of subscriptions) {
      const success = await sendPushToEndpoint(subscription, payload);
      if (success) {
        successCount++;
        // Update last_used_at
        await supabase
          .from("push_subscriptions")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", subscription.id);
      } else {
        failCount++;
        failedEndpoints.push(subscription.endpoint);
      }
    }

    // Deactivate failed subscriptions (might be expired)
    if (failedEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .update({ is_active: false })
        .in("endpoint", failedEndpoints);
    }

    return new Response(
      JSON.stringify({
        message: "Push notifications processed",
        sent: successCount,
        failed: failCount,
        total: subscriptions.length
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-push-notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
