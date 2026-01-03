import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GovernorCommand {
  vehicleId: string;
  vehicleIds?: string[]; // For batch commands
  commandType: "set_speed_limit" | "enable_governor" | "disable_governor" | "emergency_stop";
  speedLimit?: number;
  phoneNumber?: string;
  organizationId: string;
  userId: string;
  isBatch?: boolean;
  isRetry?: boolean;
  originalCommandId?: string;
}

interface SmtpConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  smtp_from_email: string;
  smtp_from_name: string | null;
  use_tls: boolean;
}

// Speed limit validation constants
const MIN_SPEED_LIMIT = 20;
const MAX_SPEED_LIMIT = 180;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

// Helper function for retry logic
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = MAX_RETRY_ATTEMPTS,
  delayMs: number = RETRY_DELAY_MS
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Attempt ${attempt}/${maxAttempts} failed:`, lastError.message);
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  throw lastError;
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

    // Handle batch commands
    if (command.isBatch && command.vehicleIds && command.vehicleIds.length > 0) {
      const results = await processBatchCommands(supabase, command);
      return new Response(
        JSON.stringify({ 
          success: true, 
          batch: true,
          results,
          message: `Batch command sent to ${results.filter(r => r.success).length}/${results.length} vehicles`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate required fields for single command
    if (!command.vehicleId || !command.commandType || !command.organizationId) {
      throw new Error("Missing required fields: vehicleId, commandType, organizationId");
    }

    // Validate speed limit if setting it
    if (command.commandType === "set_speed_limit") {
      if (!command.speedLimit || command.speedLimit < MIN_SPEED_LIMIT || command.speedLimit > MAX_SPEED_LIMIT) {
        throw new Error(`Speed limit must be between ${MIN_SPEED_LIMIT} and ${MAX_SPEED_LIMIT} km/h`);
      }
    }

    // Process single command
    const result = await processSingleCommand(supabase, command);
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending governor command:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

interface BatchResult {
  vehicleId: string;
  plate: string;
  success: boolean;
  commandId?: string;
  error?: string;
}

async function processBatchCommands(supabase: any, command: GovernorCommand): Promise<BatchResult[]> {
  const results: BatchResult[] = [];
  
  for (const vehicleId of command.vehicleIds || []) {
    try {
      const singleCommand = { ...command, vehicleId, isBatch: false };
      const result = await processSingleCommand(supabase, singleCommand);
      results.push({
        vehicleId,
        plate: result.plate || vehicleId,
        success: true,
        commandId: result.commandId,
      });
    } catch (error) {
      const { data: vehicle } = await supabase
        .from("vehicles")
        .select("plate_number")
        .eq("id", vehicleId)
        .single();
      
      results.push({
        vehicleId,
        plate: vehicle?.plate_number || vehicleId,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
  
  return results;
}

async function processSingleCommand(supabase: any, command: GovernorCommand) {

  // Get vehicle details with retry
  const vehicle = await withRetry(async () => {
    const { data, error } = await supabase
      .from("vehicles")
      .select("plate_number, make, model")
      .eq("id", command.vehicleId)
      .single();
    if (error) throw new Error("Vehicle not found");
    return data;
  });

  // Get device info for the vehicle
  const { data: device } = await supabase
    .from("devices")
    .select("sim_msisdn, imei")
    .eq("vehicle_id", command.vehicleId)
    .single();

  const phoneNumber = command.phoneNumber || device?.sim_msisdn;

  // Get user info for audit trail
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", command.userId)
    .single();

    // Build command message based on type
    let smsMessage = "";
    let commandData: Record<string, unknown> = {
      sent_by_name: userProfile?.full_name || "Unknown",
      sent_by_email: userProfile?.email || null,
      is_retry: command.isRetry || false,
      original_command_id: command.originalCommandId || null,
    };

    switch (command.commandType) {
      case "set_speed_limit":
        smsMessage = `SETSPEED,${command.speedLimit}#`;
        commandData.speed_limit = command.speedLimit;
        break;
      case "enable_governor":
        smsMessage = "GOVERNOR,ON#";
        commandData.governor_active = true;
        break;
      case "disable_governor":
        smsMessage = "GOVERNOR,OFF#";
        commandData.governor_active = false;
        break;
      case "emergency_stop":
        smsMessage = "STOP,1#";
        commandData.emergency_stop = true;
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
        created_by: command.userId,
      })
      .select()
      .single();

    if (logError) {
      console.error("Command log error:", logError);
      throw new Error("Failed to log command");
    }

    console.log("Command logged:", commandLog.id);

    // Fetch SMTP configuration from database
    const { data: smtpConfig } = await supabase
      .from("smtp_configurations")
      .select("*")
      .eq("organization_id", command.organizationId)
      .eq("is_active", true)
      .order("is_default", { ascending: false })
      .limit(1)
      .single();

    // Send notification email about the command
    if (smtpConfig) {
      try {
        await sendCommandNotification({
          vehicle,
          command,
          smsMessage,
          phoneNumber,
          commandLogId: commandLog.id,
          smtpConfig,
          userProfile,
        });
        console.log("Notification email sent");
      } catch (emailError) {
        console.warn("Email notification failed:", emailError);
        // Don't fail the command if email fails
      }
    } else {
      console.log("No SMTP configuration found, skipping email notification");
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
      
      const updateData: Record<string, unknown> = {};
      
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

  return { 
    success: true, 
    commandId: commandLog.id,
    plate: vehicle.plate_number,
    message: `Command ${command.commandType} sent successfully`,
    smsContent: smsMessage,
    targetPhone: phoneNumber || "Not configured"
  };
}

interface NotificationParams {
  vehicle: { plate_number: string; make: string; model: string };
  command: GovernorCommand;
  smsMessage: string;
  phoneNumber: string | null;
  commandLogId: string;
  smtpConfig: SmtpConfig;
  userProfile: { full_name: string | null; email: string | null } | null;
}

async function sendCommandNotification({ 
  vehicle, 
  command, 
  smsMessage, 
  phoneNumber, 
  commandLogId,
  smtpConfig,
  userProfile,
}: NotificationParams) {
  const { smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_email, smtp_from_name } = smtpConfig;

  if (!smtp_host || !smtp_user || !smtp_password || !smtp_from_email) {
    console.log("SMTP configuration incomplete, skipping email notification");
    return;
  }

  const commandTypeLabels: Record<string, string> = {
    set_speed_limit: "Set Speed Limit",
    enable_governor: "Enable Governor",
    disable_governor: "Disable Governor",
    emergency_stop: "Emergency Stop",
  };

  const senderName = userProfile?.full_name || "System";
  const senderEmail = userProfile?.email || "Unknown";
  const fromHeader = smtp_from_name ? `${smtp_from_name} <${smtp_from_email}>` : smtp_from_email;

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
        
        <div style="background: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #92400e;">Sent By</h3>
          <p><strong>User:</strong> ${senderName}</p>
          <p><strong>Email:</strong> ${senderEmail}</p>
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

  // Simple SMTP send
  const conn = await Deno.connect({
    hostname: smtp_host,
    port: smtp_port,
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
    await sendCommand(`EHLO ${smtp_host}`);
    await sendCommand("STARTTLS");
    await sendCommand("AUTH LOGIN");
    await sendCommand(btoa(smtp_user));
    await sendCommand(btoa(smtp_password));
    await sendCommand(`MAIL FROM:<${smtp_from_email}>`);
    await sendCommand(`RCPT TO:<${smtp_from_email}>`); // Send to self for now (admin notification)
    await sendCommand("DATA");

    let message = `From: ${fromHeader}\r\n`;
    message += `To: ${smtp_from_email}\r\n`;
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
