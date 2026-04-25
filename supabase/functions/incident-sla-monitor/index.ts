// ============================================================================
// incident-sla-monitor
// ----------------------------------------------------------------------------
// Scans incidents (severity='critical') and incident_tickets (priority='urgent')
// whose 10-minute SLA deadline has passed without resolution and:
//   1. Stamps sla_breached_at = now()
//   2. Sends a push notification to organisation supervisors/admins
//   3. Sets sla_breach_notified = true so we don't double-notify
//
// Designed to be invoked once per minute by pg_cron.
// ============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BreachRow {
  id: string;
  organization_id: string;
  severity?: string;
  priority?: string;
  incident_number?: string;
  ticket_number?: string;
  subject?: string;
  description?: string;
  assigned_to?: string | null;
  sla_deadline_at: string;
  status?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  try {
    const nowIso = new Date().toISOString();
    let incidentsBreached = 0;
    let ticketsBreached = 0;
    let notificationsSent = 0;

    // ------------------------------------------------------------------
    // 1. Critical incidents past their SLA deadline
    // ------------------------------------------------------------------
    const { data: incidents, error: incErr } = await supabase
      .from("incidents")
      .select(
        "id, organization_id, severity, incident_number, description, assigned_to, sla_deadline_at, status",
      )
      .eq("severity", "critical")
      .is("sla_breached_at", null)
      .not("sla_deadline_at", "is", null)
      .lt("sla_deadline_at", nowIso)
      .neq("status", "resolved")
      .neq("status", "closed");

    if (incErr) console.error("[sla-monitor] incidents fetch error:", incErr);

    for (const inc of (incidents ?? []) as BreachRow[]) {
      // Mark breached
      await supabase
        .from("incidents")
        .update({
          sla_breached_at: nowIso,
          sla_breach_notified: true,
        })
        .eq("id", inc.id)
        .is("sla_breached_at", null);
      incidentsBreached++;

      // Notify supervisors/admins in the same organisation
      const sent = await notifySupervisors(supabase, inc.organization_id, {
        title: `🚨 Critical Incident SLA Breached`,
        body: `Incident ${inc.incident_number ?? ""} has exceeded its 10-minute response SLA.`,
        url: `/incidents-management?incident=${inc.id}`,
        kind: "incident_sla_breach",
      });
      notificationsSent += sent;
    }

    // ------------------------------------------------------------------
    // 2. Urgent incident tickets past their SLA deadline
    // ------------------------------------------------------------------
    const { data: tickets, error: tixErr } = await supabase
      .from("incident_tickets")
      .select(
        "id, organization_id, priority, ticket_number, subject, assigned_to, sla_deadline_at, status",
      )
      .eq("priority", "urgent")
      .is("sla_breached_at", null)
      .not("sla_deadline_at", "is", null)
      .lt("sla_deadline_at", nowIso)
      .neq("status", "resolved")
      .neq("status", "closed");

    if (tixErr) console.error("[sla-monitor] tickets fetch error:", tixErr);

    for (const t of (tickets ?? []) as BreachRow[]) {
      await supabase
        .from("incident_tickets")
        .update({
          sla_breached_at: nowIso,
          sla_breach_notified: true,
        })
        .eq("id", t.id)
        .is("sla_breached_at", null);
      ticketsBreached++;

      const sent = await notifySupervisors(supabase, t.organization_id, {
        title: `🚨 Urgent Ticket SLA Breached`,
        body: `Ticket ${t.ticket_number ?? ""} — "${t.subject ?? ""}" exceeded its 10-minute SLA.`,
        url: `/incidents-management?tab=tickets&ticket=${t.id}`,
        kind: "incident_ticket_sla_breach",
      });
      notificationsSent += sent;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        ranAt: nowIso,
        incidentsBreached,
        ticketsBreached,
        notificationsSent,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (e) {
    console.error("[sla-monitor] fatal:", e);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
async function notifySupervisors(
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
  payload: { title: string; body: string; url: string; kind: string },
): Promise<number> {
  // Find supervisors / admins / fleet managers in the org via user_roles.
  const targetRoles = [
    "super_admin",
    "admin",
    "fleet_manager",
    "operations_manager",
    "supervisor",
    "dispatcher",
  ];

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("user_id, role")
    .eq("organization_id", organizationId)
    .in("role", targetRoles);

  if (error || !profiles?.length) return 0;

  // Persist an in-app notification per user. (Push delivery is handled by
  // the existing send-push-notification function listening on this table.)
  const rows = profiles.map((p: any) => ({
    user_id: p.user_id,
    organization_id: organizationId,
    title: payload.title,
    message: payload.body,
    link: payload.url,
    type: payload.kind,
    metadata: { severity: "critical", auto_generated: true },
    created_at: new Date().toISOString(),
  }));

  const { error: notifErr } = await supabase
    .from("notifications")
    .insert(rows);

  if (notifErr) {
    console.error("[sla-monitor] notification insert failed:", notifErr);
    return 0;
  }
  return rows.length;
}
