import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeviceCommand {
  id: string;
  device_id: string;
  vehicle_id: string | null;
  command_type: string;
  command_payload: Record<string, any>;
  priority: string;
  status: string;
  organization_id: string;
}

interface SmsGatewayConfig {
  provider: string;
  api_key: string;
  api_secret: string | null;
  sender_id: string | null;
  username: string | null;
  environment: string;
}

interface Device {
  id: string;
  imei: string;
  tracker_model: string;
  sim_msisdn: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { command_id, organization_id } = await req.json();

    console.log("Processing device command:", { command_id, organization_id });

    // Get the pending command
    let query = supabase
      .from("device_commands")
      .select("*")
      .eq("status", "pending");

    if (command_id) {
      query = query.eq("id", command_id);
    } else if (organization_id) {
      query = query.eq("organization_id", organization_id);
    }

    const { data: commands, error: cmdError } = await query.limit(10);

    if (cmdError) {
      console.error("Error fetching commands:", cmdError);
      throw cmdError;
    }

    if (!commands || commands.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No pending commands", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${commands.length} pending commands`);

    const results = [];

    for (const command of commands as DeviceCommand[]) {
      try {
        // Get device info
        const { data: device, error: deviceError } = await supabase
          .from("devices")
          .select("id, imei, tracker_model, sim_msisdn")
          .eq("id", command.device_id)
          .single();

        if (deviceError || !device) {
          console.error("Device not found:", command.device_id);
          await updateCommandStatus(supabase, command.id, "failed", "Device not found");
          results.push({ id: command.id, status: "failed", error: "Device not found" });
          continue;
        }

        if (!device.sim_msisdn) {
          console.error("No SIM number for device:", device.imei);
          await updateCommandStatus(supabase, command.id, "failed", "No SIM MSISDN configured for device");
          results.push({ id: command.id, status: "failed", error: "No SIM MSISDN" });
          continue;
        }

        // Get SMS gateway config
        const { data: smsConfig, error: smsError } = await supabase
          .from("sms_gateway_config")
          .select("*")
          .eq("organization_id", command.organization_id)
          .eq("is_active", true)
          .eq("is_default", true)
          .single();

        if (smsError || !smsConfig) {
          console.error("No SMS gateway configured");
          await updateCommandStatus(supabase, command.id, "failed", "No SMS gateway configured");
          results.push({ id: command.id, status: "failed", error: "No SMS gateway" });
          continue;
        }

        // Build SMS message based on command type
        const smsMessage = buildSmsCommand(command, device);
        console.log(`Sending SMS to ${device.sim_msisdn}: ${smsMessage}`);

        // Send SMS
        const smsResult = await sendSms(smsConfig, device.sim_msisdn, smsMessage);

        if (smsResult.success) {
          await updateCommandStatus(supabase, command.id, "sent", null, {
            sms_sent_to: device.sim_msisdn,
            sms_message: smsMessage,
            provider_response: smsResult.response,
          });
          results.push({ id: command.id, status: "sent", phone: device.sim_msisdn });
        } else {
          await updateCommandStatus(supabase, command.id, "failed", smsResult.error || "SMS send failed");
          results.push({ id: command.id, status: "failed", error: smsResult.error });
        }
      } catch (err) {
        console.error("Error processing command:", command.id, err);
        await updateCommandStatus(supabase, command.id, "failed", String(err));
        results.push({ id: command.id, status: "failed", error: String(err) });
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in process-device-commands:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildSmsCommand(command: DeviceCommand, device: Device): string {
  const model = device.tracker_model?.toLowerCase() || "";
  const payload = command.command_payload || {};

  // Handle get_location command
  if (command.command_type === "get_location") {
    if (model.includes("coban") || model.includes("303") || model.includes("tk103")) {
      return payload.sms_command || "fix001s***n123456";
    } else if (model.includes("teltonika") || model.includes("fmb")) {
      return payload.command || "getinfo";
    }
    return "fix001s***n123456"; // Default to TK103 format
  }

  // Handle set_speed_limit
  if (command.command_type === "set_speed_limit") {
    const limit = payload.speed_limit || 80;
    if (model.includes("coban") || model.includes("303") || model.includes("tk103")) {
      return `speed123456 ${limit}`;
    }
    return `setspeed ${limit}`;
  }

  // Handle engine_cut
  if (command.command_type === "engine_cut" || command.command_type === "relay_on") {
    if (model.includes("coban") || model.includes("303") || model.includes("tk103")) {
      return "relay123456";
    }
    return "setdigout 1";
  }

  // Handle engine_restore
  if (command.command_type === "engine_restore" || command.command_type === "relay_off") {
    if (model.includes("coban") || model.includes("303") || model.includes("tk103")) {
      return "norelay123456";
    }
    return "setdigout 0";
  }

  // Handle restart
  if (command.command_type === "restart") {
    if (model.includes("coban") || model.includes("303") || model.includes("tk103")) {
      return "reset123456";
    } else if (model.includes("teltonika")) {
      return "cpureset";
    }
    return "reset";
  }

  // Default: use sms_command from payload if provided
  return payload.sms_command || payload.command || command.command_type;
}

async function sendSms(
  config: SmsGatewayConfig,
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; response?: any; error?: string }> {
  try {
    if (config.provider === "ethiotelecom") {
      return await sendEthioTelecomSms(config, phoneNumber, message);
    } else if (config.provider === "africastalking") {
      return await sendAfricasTalkingSms(config, phoneNumber, message);
    } else if (config.provider === "twilio") {
      return await sendTwilioSms(config, phoneNumber, message);
    }
    return { success: false, error: `Unknown provider: ${config.provider}` };
  } catch (err) {
    console.error("SMS send error:", err);
    return { success: false, error: String(err) };
  }
}

async function sendEthioTelecomSms(
  config: SmsGatewayConfig,
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; response?: any; error?: string }> {
  // Ethio Telecom SMS Gateway API
  // Note: This uses the standard Ethio Telecom bulk SMS API format
  // You may need to adjust the endpoint based on your specific integration
  
  const baseUrl = "https://api.ethiotelecom.et/v1/sms/send";
  
  // Normalize phone number to Ethiopian format
  let normalizedPhone = phoneNumber.replace(/\s+/g, "").replace(/^0/, "+251");
  if (!normalizedPhone.startsWith("+251")) {
    normalizedPhone = "+251" + normalizedPhone.replace(/^\+/, "");
  }

  const payload = {
    username: config.username,
    password: config.api_key,
    to: normalizedPhone,
    message: message,
    from: config.sender_id || "INFO",
  };

  console.log("Ethio Telecom SMS request:", { to: normalizedPhone, from: payload.from });

  try {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.api_key}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log("Ethio Telecom response:", data);

    // Check for success based on Ethio Telecom API response format
    if (response.ok && (data.status === "success" || data.status === "sent" || data.messageId)) {
      return { success: true, response: data };
    }

    return {
      success: false,
      error: data.message || data.error || "Ethio Telecom SMS send failed",
      response: data,
    };
  } catch (err) {
    console.error("Ethio Telecom API error:", err);
    return { success: false, error: String(err) };
  }
}

async function sendAfricasTalkingSms(
  config: SmsGatewayConfig,
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; response?: any; error?: string }> {
  const baseUrl = config.environment === "production"
    ? "https://api.africastalking.com/version1/messaging"
    : "https://api.sandbox.africastalking.com/version1/messaging";

  const formData = new URLSearchParams();
  formData.append("username", config.username || "");
  formData.append("to", phoneNumber);
  formData.append("message", message);
  if (config.sender_id) {
    formData.append("from", config.sender_id);
  }

  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "apiKey": config.api_key,
      "Accept": "application/json",
    },
    body: formData.toString(),
  });

  const data = await response.json();
  console.log("Africa's Talking response:", data);

  if (data.SMSMessageData?.Recipients?.[0]?.status === "Success") {
    return { success: true, response: data };
  }

  return {
    success: false,
    error: data.SMSMessageData?.Message || "SMS send failed",
    response: data,
  };
}

async function sendTwilioSms(
  config: SmsGatewayConfig,
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; response?: any; error?: string }> {
  const accountSid = config.username;
  const authToken = config.api_secret;

  if (!accountSid || !authToken) {
    return { success: false, error: "Twilio credentials missing" };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const formData = new URLSearchParams();
  formData.append("To", phoneNumber);
  formData.append("Body", message);
  formData.append("From", config.sender_id || config.api_key);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": "Basic " + btoa(`${accountSid}:${authToken}`),
    },
    body: formData.toString(),
  });

  const data = await response.json();
  console.log("Twilio response:", data);

  if (data.sid) {
    return { success: true, response: data };
  }

  return { success: false, error: data.message || "Twilio send failed", response: data };
}

async function updateCommandStatus(
  supabase: any,
  commandId: string,
  status: string,
  errorMessage: string | null,
  responseData?: any
) {
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "sent") {
    updateData.sent_at = new Date().toISOString();
  }

  if (errorMessage) {
    updateData.error_message = errorMessage;
  }

  if (responseData) {
    updateData.response_data = responseData;
  }

  const { error } = await supabase
    .from("device_commands")
    .update(updateData)
    .eq("id", commandId);

  if (error) {
    console.error("Failed to update command status:", error);
  }
}
