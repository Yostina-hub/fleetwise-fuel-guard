// Hourly sweep — fires inspection reminders at configured lead-day buckets.
// Triple delivery: compliance_calendar row + alerts row + email (best effort).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface DueRow {
  id: string;
  organization_id: string;
  vehicle_id: string;
  inspection_type: string;
  next_due_date: string;
  source: string;
}

interface SettingsRow {
  organization_id: string;
  annual_lead_days: number[];
  email_recipients: string[];
}

const sevForBucket = (b: number): "low" | "medium" | "high" =>
  b <= 1 ? "high" : b <= 7 ? "medium" : "low";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Pull all upcoming due dates within max possible bucket window (90d cushion)
  const horizon = new Date(today);
  horizon.setUTCDate(horizon.getUTCDate() + 90);

  const { data: dueRows, error: dueErr } = await sb
    .from("inspection_due_dates")
    .select("id, organization_id, vehicle_id, inspection_type, next_due_date, source")
    .eq("inspection_type", "annual")
    .not("next_due_date", "is", null)
    .gte("next_due_date", today.toISOString().slice(0, 10))
    .lte("next_due_date", horizon.toISOString().slice(0, 10));

  if (dueErr) {
    return new Response(JSON.stringify({ error: dueErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!dueRows?.length) {
    return new Response(JSON.stringify({ ok: true, processed: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Settings cache
  const orgIds = [...new Set(dueRows.map(r => r.organization_id))];
  const { data: settingsRows } = await sb
    .from("inspection_settings")
    .select("organization_id, annual_lead_days, email_recipients")
    .in("organization_id", orgIds);
  const settingsByOrg = new Map<string, SettingsRow>(
    (settingsRows ?? []).map(s => [s.organization_id, s as SettingsRow])
  );

  // Vehicle plates for messaging
  const vehIds = [...new Set(dueRows.map(r => r.vehicle_id))];
  const { data: vehRows } = await sb
    .from("vehicles")
    .select("id, plate_number, make, model")
    .in("id", vehIds);
  const vehById = new Map((vehRows ?? []).map((v: any) => [v.id, v]));

  let fired = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of dueRows as DueRow[]) {
    const due = new Date(row.next_due_date + "T00:00:00Z");
    const daysUntil = Math.round((due.getTime() - today.getTime()) / 86400000);
    const settings = settingsByOrg.get(row.organization_id);
    const buckets = settings?.annual_lead_days ?? [60, 30, 7, 1];
    if (!buckets.includes(daysUntil)) { skipped++; continue; }

    // Idempotency
    const { data: existing } = await sb
      .from("inspection_reminder_log")
      .select("id")
      .eq("vehicle_id", row.vehicle_id)
      .eq("inspection_type", row.inspection_type)
      .eq("due_date", row.next_due_date)
      .eq("lead_bucket", daysUntil)
      .maybeSingle();
    if (existing) { skipped++; continue; }

    const veh = vehById.get(row.vehicle_id);
    const plate = veh?.plate_number ?? "Unknown plate";
    const sev = sevForBucket(daysUntil);
    const title = `Annual inspection due in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`;
    const message = `Vehicle ${plate} (${veh?.make ?? ""} ${veh?.model ?? ""}) is due for annual inspection on ${row.next_due_date}.`;

    const channels: Record<string, boolean> = {};

    // 1) Compliance calendar
    const { error: calErr } = await sb.from("compliance_calendar").insert({
      organization_id: row.organization_id,
      title,
      description: message,
      category: "inspection",
      entity_type: "vehicle",
      entity_id: row.vehicle_id,
      deadline: row.next_due_date,
      reminder_days_before: daysUntil,
      status: "pending",
    });
    channels.compliance_calendar = !calErr;
    if (calErr) errors.push(`cal:${calErr.message}`);

    // 2) Alert
    const { error: alertErr } = await sb.from("alerts").insert({
      organization_id: row.organization_id,
      vehicle_id: row.vehicle_id,
      alert_type: "inspection_due",
      severity: sev,
      title,
      message,
      alert_time: new Date().toISOString(),
      status: "active",
    });
    channels.alert = !alertErr;
    if (alertErr) errors.push(`alert:${alertErr.message}`);

    // 3) Email — best effort
    const recipients = settings?.email_recipients ?? [];
    if (recipients.length) {
      try {
        const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_ROLE}`,
          },
          body: JSON.stringify({
            to: recipients,
            subject: `[FMG] ${title} — ${plate}`,
            html: `<p>${message}</p><p>Source: ${row.source}</p>`,
          }),
        });
        await emailRes.text();
        channels.email = emailRes.ok;
      } catch (e) {
        channels.email = false;
        errors.push(`email:${(e as Error).message}`);
      }
    }

    // 4) Log idempotency record
    await sb.from("inspection_reminder_log").insert({
      organization_id: row.organization_id,
      vehicle_id: row.vehicle_id,
      inspection_type: row.inspection_type,
      due_date: row.next_due_date,
      lead_bucket: daysUntil,
      channels,
    });

    // 5) Audit
    await sb.from("audit_logs").insert({
      organization_id: row.organization_id,
      action: "inspection_reminder_fired",
      resource_type: "vehicle_inspection",
      resource_id: row.vehicle_id,
      status: "success",
      new_values: { due_date: row.next_due_date, bucket: daysUntil, channels },
    });

    fired++;
  }

  return new Response(
    JSON.stringify({ ok: true, fired, skipped, errors: errors.slice(0, 10) }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
