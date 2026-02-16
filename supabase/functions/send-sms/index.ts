import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse, getClientId } from "../_shared/rate-limiter.ts";
import { buildCorsHeaders, handleCorsPreflightRequest, secureJsonResponse } from "../_shared/cors.ts";
import { validatePhone, validateString, validateAll } from "../_shared/validation.ts";

interface SmsRequest {
  to: string;
  message: string;
  type?: string;
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

    // Get the authorization header to identify the user/org
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      return new Response(
        JSON.stringify({ error: "User has no organization" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get SMS gateway config for the organization
    const { data: smsConfig } = await supabase
      .from("organization_settings")
      .select("sms_gateway_config")
      .eq("organization_id", profile.organization_id)
      .single();

    const gatewayConfig = smsConfig?.sms_gateway_config as Record<string, any> | null;
    
    if (!gatewayConfig || !gatewayConfig.is_active) {
      return new Response(
        JSON.stringify({ error: "SMS gateway not configured or inactive" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let smsBody: SmsRequest;
    try {
      smsBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing request body' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { to, message, type } = smsBody;

    if (!to || !message) {
      return new Response(
        JSON.stringify({ error: "Missing 'to' or 'message' field" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send SMS based on provider
    const provider = gatewayConfig.provider || "ethiotelecom";
    let result;

    switch (provider) {
      case "ethiotelecom":
        result = await sendEthioTelecomSms(to, message, gatewayConfig);
        break;
      case "africastalking":
        result = await sendAfricasTalkingSms(to, message, gatewayConfig);
        break;
      case "twilio":
        result = await sendTwilioSms(to, message, gatewayConfig);
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Unknown provider: ${provider}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Log the SMS attempt
    await supabase.from("audit_logs").insert({
      organization_id: profile.organization_id,
      user_id: user.id,
      action: "send_sms",
      resource_type: "sms",
      resource_id: to,
      status: result.success ? "success" : "error",
      new_values: { type, provider, to_masked: maskPhone(to) },
      error_message: result.error,
    });

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, messageId: result.messageId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("SMS function error:", error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Ethio Telecom SMS API
async function sendEthioTelecomSms(
  to: string,
  message: string,
  config: Record<string, any>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Ethio Telecom API endpoint (placeholder - actual endpoint varies)
    const apiUrl = config.api_url || "https://api.ethiotelecom.et/sms/send";
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.api_key}`,
      },
      body: JSON.stringify({
        to,
        message,
        from: config.sender_id || config.short_code,
        username: config.username,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Ethio Telecom API error: ${errorText}` };
    }

    const data = await response.json();
    return { success: true, messageId: data.messageId || data.id };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

// Africa's Talking SMS API
async function sendAfricasTalkingSms(
  to: string,
  message: string,
  config: Record<string, any>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const apiUrl = "https://api.africastalking.com/version1/messaging";
    
    const formData = new URLSearchParams();
    formData.append("username", config.username);
    formData.append("to", to);
    formData.append("message", message);
    if (config.sender_id) {
      formData.append("from", config.sender_id);
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "apiKey": config.api_key,
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Africa's Talking API error: ${errorText}` };
    }

    const data = await response.json();
    return { 
      success: true, 
      messageId: data.SMSMessageData?.Recipients?.[0]?.messageId 
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

// Twilio SMS API
async function sendTwilioSms(
  to: string,
  message: string,
  config: Record<string, any>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const accountSid = config.account_sid || config.username;
    const authToken = config.api_key || config.api_secret;
    const fromNumber = config.sender_id || config.from_number;

    const apiUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append("To", to);
    formData.append("From", fromNumber);
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
      const errorData = await response.json();
      return { success: false, error: errorData.message || "Twilio API error" };
    }

    const data = await response.json();
    return { success: true, messageId: data.sid };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

function maskPhone(phone: string): string {
  if (phone.length <= 6) return "***";
  return phone.slice(0, 4) + "****" + phone.slice(-2);
}
