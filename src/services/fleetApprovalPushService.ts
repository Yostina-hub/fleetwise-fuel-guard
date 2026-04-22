// Sends a push notification to fleet operators and fleet managers
// in an organization when a vehicle request is approved.
//
// Best-effort, never throws — caller continues on failure.
import { supabase } from "@/integrations/supabase/client";

const FLEET_OPS_ROLES = [
  "fleet_manager",
  "operator",
  "operations_manager",
] as const;

interface NotifyApprovedArgs {
  organizationId: string;
  requestNumber: string;
  requesterName?: string | null;
  departure?: string | null;
  destination?: string | null;
  neededFrom?: string | null;
  requestId?: string;
}

export async function notifyFleetOpsRequestApproved(args: NotifyApprovedArgs): Promise<void> {
  const {
    organizationId,
    requestNumber,
    requesterName,
    departure,
    destination,
    neededFrom,
    requestId,
  } = args;

  try {
    // Find user_ids of fleet operators / fleet managers in this org.
    const { data: roleRows, error } = await (supabase as any)
      .from("user_roles")
      .select("user_id, role, profiles!inner(organization_id)")
      .in("role", FLEET_OPS_ROLES as unknown as string[])
      .eq("profiles.organization_id", organizationId);

    if (error) {
      console.warn("[fleetApprovalPush] role lookup failed:", error.message);
      return;
    }

    const userIds = Array.from(
      new Set((roleRows || []).map((r: any) => r.user_id).filter(Boolean)),
    ) as string[];

    if (userIds.length === 0) {
      console.info("[fleetApprovalPush] no fleet ops/managers in org", organizationId);
      return;
    }

    const route = departure && destination ? `${departure} → ${destination}` : destination || departure || "";
    const when = neededFrom
      ? new Date(neededFrom).toLocaleString("en-GB", {
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : "";

    const bodyParts = [
      requesterName ? `By ${requesterName}` : null,
      route || null,
      when ? `Needed ${when}` : null,
    ].filter(Boolean);

    const payload = {
      title: `Request ${requestNumber} approved`,
      body: bodyParts.join(" • ") || "A vehicle request has been approved and is ready for assignment.",
      tag: `vehicle-request-approved-${requestNumber}`,
      data: {
        type: "vehicle_request",
        request_id: requestId,
        request_number: requestNumber,
        url: "/vehicle-requests",
      },
      actions: [
        { action: "view", title: "Open" },
        { action: "dismiss", title: "Dismiss" },
      ],
    };

    const { error: pushErr } = await supabase.functions.invoke("send-push-notification", {
      body: {
        user_ids: userIds,
        organization_id: organizationId,
        payload,
      },
    });

    if (pushErr) {
      console.warn("[fleetApprovalPush] push invoke failed:", pushErr.message);
    }
  } catch (e) {
    console.warn("[fleetApprovalPush] unexpected error:", (e as Error).message);
  }
}
