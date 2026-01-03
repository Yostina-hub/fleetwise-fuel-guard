import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GovernorCommand {
  vehicleId: string;
  commandType: "set_speed_limit" | "enable_governor" | "disable_governor" | "emergency_stop";
  speedLimit?: number;
  phoneNumber?: string;
  organizationId: string;
  userId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const command: GovernorCommand = await req.json();
    console.log("Received governor command:", command);

    // Validate required fields
    if (!command.vehicleId || !command.commandType || !command.organizationId) {
      throw new Error("Missing required fields: vehicleId, commandType, organizationId");
    }

    // Get vehicle details
    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("plate_number, make, model")
      .eq("id", command.vehicleId)
      .single();

    if (vehicleError) {
      console.error("Vehicle fetch error:", vehicleError);
      throw new Error("Vehicle not found");
    }

    // Get device info for the vehicle (for phone number if needed)
    const { data: device } = await supabase
      .from("devices")
      .select("sim_msisdn, imei")
      .eq("vehicle_id", command.vehicleId)
      .single();

    const phoneNumber = command.phoneNumber || device?.sim_msisdn;

    // Build command message based on type
    let smsMessage = "";
    let commandData: Record<string, any> = {};

    switch (command.commandType) {
      case "set_speed_limit":
        smsMessage = `SETSPEED,${command.speedLimit || 80}#`;
        commandData = { speed_limit: command.speedLimit };
        break;
      case "enable_governor":
        smsMessage = "GOVERNOR,ON#";
        commandData = { governor_active: true };
        break;
      case "disable_governor":
        smsMessage = "GOVERNOR,OFF#";
        commandData = { governor_active: false };
        break;
      case "emergency_stop":
        smsMessage = "STOP,1#";
        commandData = { emergency_stop: true };
        break;
      default:
        throw new Error("Invalid command type");
    }

    // Log the command
    const { data: commandLog, error: logError } = await supabase
      .from("governor_command_logs")
      .insert({
        vehicle_id: command.vehicleId,
        organization_id: command.organizationId,
        command_type: command.commandType,
        command_data: commandData,
        phone_number: phoneNumber,
        sms_content: smsMessage,
        status: "pending",
        sent_by: command.userId,
      })
      .select()
      .single();

    if (logError) {
      console.error("Command log error:", logError);
      throw new Error("Failed to log command");
    }

    console.log("Command logged:", commandLog.id);

    // Send notification email about the command
    try {
      await sendCommandNotification({
        vehicle,
        command,
        smsMessage,
        phoneNumber,
        commandLogId: commandLog.id,
      });
      console.log("Notification email sent");
    } catch (emailError) {
      console.warn("Email notification failed:", emailError);
      // Don't fail the command if email fails
    }

    // Update command status to sent
    await supabase
      .from("governor_command_logs")
      .update({ 
        status: "sent", 
        sent_at: new Date().toISOString() 
      })
      .eq("id", commandLog.id);

    // Update speed_governor_config if applicable
    if (command.commandType === "set_speed_limit" || 
        command.commandType === "enable_governor" || 
        command.commandType === "disable_governor") {
      
      const updateData: Record<string, any> = {};
      
      if (command.commandType === "set_speed_limit") {
        updateData.max_speed_limit = command.speedLimit;
      } else if (command.commandType === "enable_governor") {
        updateData.governor_active = true;
      } else if (command.commandType === "disable_governor") {
        updateData.governor_active = false;
      }

      // Check if config exists
      const { data: existingConfig } = await supabase
        .from("speed_governor_config")
        .select("id")
        .eq("vehicle_id", command.vehicleId)
        .eq("organization_id", command.organizationId)
        .single();

      if (existingConfig) {
        await supabase
          .from("speed_governor_config")
          .update(updateData)
          .eq("id", existingConfig.id);
      } else {
        await supabase
          .from("speed_governor_config")
          .insert({
            vehicle_id: command.vehicleId,
            organization_id: command.organizationId,
            max_speed_limit: command.speedLimit || 80,
            governor_active: command.commandType !== "disable_governor",
          });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        commandId: commandLog.id,
        message: `Command ${command.commandType} sent successfully`,
        smsContent: smsMessage,
        targetPhone: phoneNumber || "Not configured"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending governor command:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function sendCommandNotification({ vehicle, command, smsMessage, phoneNumber, commandLogId }: any) {
  const smtpHost = Deno.env.get("SMTP_HOST");
  const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587");
  const smtpUser = Deno.env.get("SMTP_USER");
  const smtpPassword = Deno.env.get("SMTP_PASSWORD");
  const smtpFrom = Deno.env.get("SMTP_FROM_EMAIL");
  const notificationEmail = Deno.env.get("ADMIN_NOTIFICATION_EMAIL") || smtpFrom;

  if (!smtpHost || !smtpUser || !smtpPassword || !smtpFrom) {
    console.log("SMTP not configured, skipping email notification");
    return;
  }

  const commandTypeLabels: Record<string, string> = {
    set_speed_limit: "Set Speed Limit",
    enable_governor: "Enable Governor",
    disable_governor: "Disable Governor",
    emergency_stop: "Emergency Stop",
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Governor Command Sent</title>
    </head>
    <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f9f9f9;">
      <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h1 style="color: #333; margin-top: 0;">🚗 Governor Command Sent</h1>
        
        <div style="background: #f0f9ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #0369a1;">Command Details</h3>
          <p><strong>Vehicle:</strong> ${vehicle.plate_number} (${vehicle.make} ${vehicle.model})</p>
          <p><strong>Command Type:</strong> ${commandTypeLabels[command.commandType] || command.commandType}</p>
          ${command.speedLimit ? `<p><strong>Speed Limit:</strong> ${command.speedLimit} km/h</p>` : ''}
          <p><strong>Target Phone:</strong> ${phoneNumber || 'Not configured'}</p>
          <p><strong>SMS Content:</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 3px;">${smsMessage}</code></p>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          Command ID: ${commandLogId}<br>
          Sent at: ${new Date().toLocaleString()}
        </p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #999; font-size: 12px; text-align: center;">
          This is an automated notification from your Fleet Management System
        </p>
      </div>
    </body>
    </html>
  `;

  // Simple SMTP send (reusing pattern from speed violation report)
  const conn = await Deno.connect({
    hostname: smtpHost,
    port: smtpPort,
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  async function sendCommand(cmd: string) {
    await conn.write(encoder.encode(cmd + "\r\n"));
    const buffer = new Uint8Array(1024);
    const n = await conn.read(buffer);
    return decoder.decode(buffer.subarray(0, n || 0));
  }

  try {
    await sendCommand(`EHLO ${smtpHost}`);
    await sendCommand("STARTTLS");
    await sendCommand("AUTH LOGIN");
    await sendCommand(btoa(smtpUser));
    await sendCommand(btoa(smtpPassword));
    await sendCommand(`MAIL FROM:<${smtpFrom}>`);
    await sendCommand(`RCPT TO:<${notificationEmail}>`);
    await sendCommand("DATA");

    let message = `From: ${smtpFrom}\r\n`;
    message += `To: ${notificationEmail}\r\n`;
    message += `Subject: Governor Command: ${commandTypeLabels[command.commandType]} - ${vehicle.plate_number}\r\n`;
    message += `MIME-Version: 1.0\r\n`;
    message += `Content-Type: text/html; charset=UTF-8\r\n\r\n`;
    message += `${html}\r\n.\r\n`;

    await sendCommand(message);
    await sendCommand("QUIT");
  } finally {
    conn.close();
  }
}
