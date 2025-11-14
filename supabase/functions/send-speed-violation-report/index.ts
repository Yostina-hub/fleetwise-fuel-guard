import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ViolationData {
  vehicle_id: string;
  plate_number: string;
  timestamp: string;
  speed: number;
  speed_limit: number;
  location: string;
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

    const { configId, test } = await req.json();

    // Fetch report configuration
    const { data: config, error: configError } = await supabase
      .from("email_report_configs")
      .select("*")
      .eq("id", configId)
      .single();

    if (configError) throw configError;

    // Determine date range based on frequency
    const now = new Date();
    let startDate: Date;
    
    if (config.frequency === "daily") {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 1);
    } else {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
    }

    // Fetch violations data
    const { data: violations, error: violationsError } = await supabase
      .from("vehicle_telemetry")
      .select(`
        *,
        vehicles!inner(plate_number, make, model)
      `)
      .in("vehicle_id", config.vehicle_ids)
      .gte("timestamp", startDate.toISOString())
      .lte("timestamp", now.toISOString())
      .gt("speed", 80)
      .order("timestamp", { ascending: false });

    if (violationsError) throw violationsError;

    // Generate CSV
    const csvData = generateCSV(violations || []);
    
    // Calculate statistics and trends
    const stats = calculateStatistics(violations || []);
    const trends = config.include_trend_analysis ? analyzeTrends(violations || []) : null;

    // Generate email HTML
    const emailHTML = generateEmailHTML(config, stats, trends, config.frequency);

    // Send email via SMTP
    await sendEmail({
      to: test ? [config.recipient_emails[0]] : config.recipient_emails,
      subject: test 
        ? `[TEST] ${config.name} - Speed Violation Report` 
        : `${config.name} - Speed Violation Report`,
      html: emailHTML,
      attachments: [{
        filename: `violations-${now.toISOString().split('T')[0]}.csv`,
        content: csvData,
      }],
    });

    return new Response(
      JSON.stringify({ success: true, violationsCount: violations?.length || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending report:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateCSV(violations: any[]): string {
  const headers = "Plate Number,Date,Time,Speed (km/h),Speed Limit (km/h),Violation Amount,Location\n";
  const rows = violations.map(v => {
    const date = new Date(v.timestamp);
    const violation = v.speed - 80;
    return `${v.vehicles.plate_number},${date.toLocaleDateString()},${date.toLocaleTimeString()},${v.speed},80,${violation},${v.location || 'N/A'}`;
  }).join("\n");
  
  return headers + rows;
}

function calculateStatistics(violations: any[]) {
  const groupedByVehicle = violations.reduce((acc, v) => {
    const key = v.vehicle_id;
    if (!acc[key]) {
      acc[key] = {
        plate: v.vehicles.plate_number,
        count: 0,
        maxSpeed: 0,
        totalViolation: 0,
      };
    }
    acc[key].count++;
    acc[key].maxSpeed = Math.max(acc[key].maxSpeed, v.speed);
    acc[key].totalViolation += (v.speed - 80);
    return acc;
  }, {} as Record<string, any>);

  return Object.values(groupedByVehicle);
}

function analyzeTrends(violations: any[]) {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const thisWeek = violations.filter(v => new Date(v.timestamp) >= weekAgo).length;
  const lastWeek = violations.filter(v => {
    const date = new Date(v.timestamp);
    return date >= twoWeeksAgo && date < weekAgo;
  }).length;

  const change = lastWeek === 0 ? 0 : ((thisWeek - lastWeek) / lastWeek) * 100;

  return {
    thisWeek,
    lastWeek,
    changePercent: change.toFixed(1),
    trend: change > 0 ? "increase" : change < 0 ? "decrease" : "stable",
  };
}

function generateEmailHTML(config: any, stats: any[], trends: any, frequency: string): string {
  const statsHTML = stats.map(s => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${s.plate}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${s.count}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${s.maxSpeed} km/h</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${s.totalViolation.toFixed(1)} km/h</td>
    </tr>
  `).join("");

  const trendsHTML = trends ? `
    <div style="margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 5px;">
      <h3 style="margin-top: 0;">Trend Analysis</h3>
      <p>This ${frequency === 'daily' ? 'day' : 'week'}: <strong>${trends.thisWeek}</strong> violations</p>
      <p>Previous ${frequency === 'daily' ? 'day' : 'week'}: <strong>${trends.lastWeek}</strong> violations</p>
      <p>Change: <strong style="color: ${trends.trend === 'increase' ? 'red' : 'green'}">
        ${trends.changePercent}% ${trends.trend}
      </strong></p>
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${config.name}</title>
    </head>
    <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f9f9f9;">
      <div style="max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h1 style="color: #333; margin-top: 0;">${config.name}</h1>
        <p style="color: #666;">Period: Last ${frequency === 'daily' ? '24 hours' : '7 days'}</p>
        
        <h2 style="color: #333; margin-top: 30px;">Violations Summary</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Vehicle</th>
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Violations</th>
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Max Speed</th>
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Total Over Limit</th>
            </tr>
          </thead>
          <tbody>
            ${statsHTML}
          </tbody>
        </table>
        
        ${trendsHTML}
        
        <p style="margin-top: 30px; color: #666; font-size: 14px;">
          A detailed CSV file with all violations is attached to this email.
        </p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #999; font-size: 12px; text-align: center;">
          This is an automated report from your Fleet Management System
        </p>
      </div>
    </body>
    </html>
  `;
}

async function sendEmail({ to, subject, html, attachments }: any) {
  const smtpHost = Deno.env.get("SMTP_HOST");
  const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587");
  const smtpUser = Deno.env.get("SMTP_USER");
  const smtpPassword = Deno.env.get("SMTP_PASSWORD");
  const smtpFrom = Deno.env.get("SMTP_FROM_EMAIL");

  if (!smtpHost || !smtpUser || !smtpPassword || !smtpFrom) {
    throw new Error("SMTP configuration missing. Please configure SMTP settings in secrets.");
  }

  // Connect to SMTP server
  const conn = await Deno.connect({
    hostname: smtpHost,
    port: smtpPort,
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // Helper to send and receive SMTP commands
  async function sendCommand(command: string) {
    await conn.write(encoder.encode(command + "\r\n"));
    const buffer = new Uint8Array(1024);
    const n = await conn.read(buffer);
    return decoder.decode(buffer.subarray(0, n || 0));
  }

  // SMTP conversation
  await sendCommand(`EHLO ${smtpHost}`);
  await sendCommand("STARTTLS");
  
  // AUTH LOGIN
  await sendCommand("AUTH LOGIN");
  await sendCommand(btoa(smtpUser));
  await sendCommand(btoa(smtpPassword));
  
  // Send email
  await sendCommand(`MAIL FROM:<${smtpFrom}>`);
  for (const recipient of to) {
    await sendCommand(`RCPT TO:<${recipient}>`);
  }
  
  await sendCommand("DATA");
  
  // Build email message
  const boundary = "----=_Part_0_" + Date.now();
  let message = `From: ${smtpFrom}\r\n`;
  message += `To: ${to.join(", ")}\r\n`;
  message += `Subject: ${subject}\r\n`;
  message += `MIME-Version: 1.0\r\n`;
  message += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;
  
  // HTML body
  message += `--${boundary}\r\n`;
  message += `Content-Type: text/html; charset=UTF-8\r\n\r\n`;
  message += `${html}\r\n\r\n`;
  
  // Attachments
  for (const attachment of attachments) {
    message += `--${boundary}\r\n`;
    message += `Content-Type: text/csv; name="${attachment.filename}"\r\n`;
    message += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n`;
    message += `Content-Transfer-Encoding: base64\r\n\r\n`;
    message += btoa(attachment.content) + "\r\n\r\n";
  }
  
  message += `--${boundary}--\r\n`;
  message += ".\r\n";
  
  await sendCommand(message);
  await sendCommand("QUIT");
  
  conn.close();
}
