/**
 * useVehicleRequestScope
 * ----------------------
 * Determines what slice of `vehicle_requests` the current user is allowed
 * to see in the main /vehicle-requests table. Mirrors the same role tiers
 * used elsewhere (see useDriverScope) so RLS-style visibility stays
 * consistent across the app.
 *
 * Scope tiers (most → least privileged):
 *   - "all"        → super_admin, org_admin, fleet_owner, fleet_manager,
 *                    operations_manager, dispatcher, auditor
 *   - "operator"   → operator: pool/assignment work queue + own filed
 *                    requests (union)
 *   - "driver"     → driver: requests assigned to their driver record
 *                    (primary or any vehicle_request_assignments row) +
 *                    own filed requests (union)
 *   - "self"       → everyone else (basic user, requester, unknown role):
 *                    only requests they personally filed
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useOrganization } from "@/hooks/useOrganization";

export type VRScopeTier = "all" | "operator" | "driver" | "self";

export interface VRScope {
  tier: VRScopeTier;
  userId: string | null;
  driverId: string | null;
  /**
   * vehicle_request IDs where this driver appears in
   * vehicle_request_assignments (multi-vehicle requests). Empty for
   * non-driver tiers. Lets drivers see ALL of their assigned trips, not
   * just the primary one stored on `vehicle_requests.assigned_driver_id`.
   */
  assignedRequestIds: string[];
  loading: boolean;
}

const ALL_ACCESS_ROLES = [
  "super_admin",
  "org_admin",
  "fleet_owner",
  "fleet_manager",
  "operations_manager",
  "dispatcher",
  "auditor",
];

export const useVehicleRequestScope = (): VRScope => {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const { isSuperAdmin, hasRole, loading: permsLoading } = usePermissions();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [assignedRequestIds, setAssignedRequestIds] = useState<string[]>([]);
  const [resolvingDriver, setResolvingDriver] = useState(true);

  const tier: VRScopeTier = useMemo(() => {
    if (isSuperAdmin) return "all";
    if (ALL_ACCESS_ROLES.some((r) => hasRole(r))) return "all";
    if (hasRole("operator")) return "operator";
    if (hasRole("driver")) return "driver";
    return "self";
  }, [isSuperAdmin, hasRole]);

  // Resolve drivers.id + multi-vehicle assignment IDs for driver-tier users.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!user || !organizationId || tier !== "driver") {
        if (!cancelled) {
          setDriverId(null);
          setAssignedRequestIds([]);
          setResolvingDriver(false);
        }
        return;
      }
      setResolvingDriver(true);
      const { data: drv } = await supabase
        .from("drivers")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .maybeSingle();
      const dId = drv?.id || null;
      let reqIds: string[] = [];
      if (dId) {
        const { data: assigns } = await (supabase as any)
          .from("vehicle_request_assignments")
          .select("vehicle_request_id")
          .eq("driver_id", dId);
        reqIds = Array.from(
          new Set(
            (assigns || [])
              .map((a: any) => a.vehicle_request_id)
              .filter(Boolean),
          ),
        );
      }
      if (!cancelled) {
        setDriverId(dId);
        setAssignedRequestIds(reqIds);
        setResolvingDriver(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [user, organizationId, tier]);

  return {
    tier,
    userId: user?.id || null,
    driverId,
    assignedRequestIds,
    loading: permsLoading || (tier === "driver" && resolvingDriver),
  };
};

/**
 * Apply the visibility scope to a Supabase query builder. Caller is
 * responsible for organization filter — this only adds row-level
 * restrictions per the user's role tier.
 *
 *   let q = supabase.from("vehicle_requests").select("*").eq("organization_id", orgId);
 *   q = applyVRScope(q, scope);
 */
export function applyVRScope<T>(query: T, scope: VRScope): T {
  // `query` is a PostgrestFilterBuilder — kept generic so call sites that
  // already cast to `any` (legacy pattern in this app) still work.
  const q = query as any;
  switch (scope.tier) {
    case "all":
      return q as T;
    case "operator":
      // Operators (Fleet Operators) need to see the full org request queue
      // so that approved requests reach them for vehicle/driver assignment.
      // RLS on vehicle_requests already restricts visibility to the same org,
      // so no additional filter is required here. Previously we used a
      // narrow .or(...) filter that excluded approved requests in some
      // PostgREST parsing edge cases, causing approved requests to never
      // reach operators after the approval step.
      return q as T;
    case "driver": {
      if (!scope.userId) return q.eq("requester_id", "__never__") as T;
      const orParts: string[] = [`requester_id.eq.${scope.userId}`];
      if (scope.driverId) {
        orParts.push(`assigned_driver_id.eq.${scope.driverId}`);
      }
      if (scope.assignedRequestIds.length > 0) {
        // Cap the IN list to avoid overly long URLs (PostgREST limit ~8KB).
        const capped = scope.assignedRequestIds.slice(0, 200);
        orParts.push(`id.in.(${capped.join(",")})`);
      }
      return q.or(orParts.join(",")) as T;
    }
    case "self":
    default:
      if (!scope.userId) return q.eq("requester_id", "__never__") as T;
      return q.eq("requester_id", scope.userId) as T;
  }
}
