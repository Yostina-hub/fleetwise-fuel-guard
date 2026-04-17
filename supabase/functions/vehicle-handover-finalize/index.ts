// Vehicle Handover finalizer
// Triggered by useWorkflow.performAction when a `vehicle_handover` workflow
// reaches the `archived` (terminal) stage. Responsibilities:
//   1. Update vehicles.assigned_driver_id to the new received_by_driver_id
//   2. Close the prior driver_vehicle_assignment row and insert a fresh one
//   3. Fan out in-app notifications to:
//        • The transferee (delivered_by user — best-effort lookup by created_by)
//        • The receiver (received_by_driver_id → drivers.user_id)
//        • All fleet admins / fleet managers / operations managers in the org
//
// Designed to be idempotent: re-invoking with the same workflow_instance_id
// will simply re-confirm the assignment and re-send notifications (notifications
// table dedupe is up to the caller).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  workflow_instance_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) {
      return json({ error: "missing bearer token" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = (await req.json().catch(() => ({}))) as Body;
    if (!body.workflow_instance_id) {
      return json({ error: "workflow_instance_id required" }, 400);
    }

    // 1. Load the workflow instance
    const { data: instance, error: instErr } = await admin
      .from("workflow_instances")
      .select(
        "id, organization_id, workflow_type, reference_number, vehicle_id, driver_id, created_by, data, title",
      )
      .eq("id", body.workflow_instance_id)
      .maybeSingle();

    if (instErr || !instance) {
      return json({ error: "instance not found", details: instErr?.message }, 404);
    }
    if (instance.workflow_type !== "vehicle_handover") {
      return json({ error: "not a vehicle_handover workflow" }, 400);
    }

    const data = (instance.data as any) || {};
    const orgId = instance.organization_id as string;
    const vehicleId = (instance.vehicle_id as string | null) ||
      (data.__vehicle_id as string | null) ||
      (data.vehicle_id as string | null);
    const newDriverId = (data.received_by_driver_id as string | null) ||
      (instance.driver_id as string | null);

    const updates: Record<string, any> = {};
    let assignmentChanged = false;

    // 2. Update vehicles.assigned_driver_id + log assignment history
    if (vehicleId && newDriverId) {
      const { data: veh } = await admin
        .from("vehicles")
        .select("id, assigned_driver_id, plate_number")
        .eq("id", vehicleId)
        .maybeSingle();

      if (veh && veh.assigned_driver_id !== newDriverId) {
        // Close prior current assignments for this vehicle
        await admin
          .from("driver_vehicle_assignments")
          .update({
            is_current: false,
            unassigned_at: new Date().toISOString(),
            reason: `Replaced via Vehicle Handover ${instance.reference_number}`,
          })
          .eq("vehicle_id", vehicleId)
          .eq("is_current", true);

        // Insert new current assignment
        await admin.from("driver_vehicle_assignments").insert({
          organization_id: orgId,
          vehicle_id: vehicleId,
          driver_id: newDriverId,
          assigned_at: new Date().toISOString(),
          is_current: true,
          reason: `Assigned via Vehicle Handover ${instance.reference_number}`,
        });

        await admin
          .from("vehicles")
          .update({ assigned_driver_id: newDriverId })
          .eq("id", vehicleId);

        updates.vehicle = { plate: veh.plate_number, prior: veh.assigned_driver_id, next: newDriverId };
        assignmentChanged = true;
      }
    }

    // 3. Notification fan-out
    const recipients = new Set<string>();

    // 3a. Transferee (workflow creator, typically the outgoing custodian)
    if (instance.created_by) recipients.add(instance.created_by as string);

    // 3b. Receiver (driver → user_id)
    if (newDriverId) {
      const { data: drv } = await admin
        .from("drivers")
        .select("user_id, first_name, last_name")
        .eq("id", newDriverId)
        .maybeSingle();
      if (drv?.user_id) recipients.add(drv.user_id);
    }

    // 3c. Fleet admins / fleet managers / operations managers in the org
    const { data: admins } = await admin
      .from("user_roles")
      .select("user_id, role")
      .eq("organization_id", orgId)
      .in("role", ["fleet_manager", "operations_manager", "org_admin"]);
    (admins || []).forEach((r: any) => r.user_id && recipients.add(r.user_id));

    const refTitle = instance.title || instance.reference_number;
    const message = `Vehicle Handover ${instance.reference_number} has been archived${
      assignmentChanged ? ` and the vehicle has been re-assigned.` : `.`
    }`;

    let notifiedCount = 0;
    for (const userId of recipients) {
      const { error: nErr } = await admin.rpc("send_notification", {
        _user_id: userId,
        _type: "vehicle_handover_archived",
        _title: `Handover archived: ${refTitle}`,
        _message: message,
        _link: "/sop/vehicle-handover",
        _metadata: {
          workflow_instance_id: instance.id,
          reference_number: instance.reference_number,
          vehicle_id: vehicleId,
          new_driver_id: newDriverId,
        },
      });
      if (!nErr) notifiedCount++;
    }

    return json({
      ok: true,
      workflow_instance_id: instance.id,
      assignment_changed: assignmentChanged,
      notified: notifiedCount,
      updates,
    });
  } catch (e) {
    console.error("vehicle-handover-finalize error", e);
    return json({ error: (e as Error).message }, 500);
  }

  function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
