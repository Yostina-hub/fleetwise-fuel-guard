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
 *   - "driver"     → driver: only requests assigned to their driver record
 *                    + own filed requests (union)
 *   - "self"       → everyone else (basic user, requester, unknown role):
 *                    only requests they personally filed
 *
 * Components apply this by calling `applyScope(query, scope)` on the
 * Supabase query builder before executing.
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
  const [resolvingDriver, setResolvingDriver] = useState(true);

  const tier: VRScopeTier = useMemo(() => {
    if (isSuperAdmin) return "all";
    if (ALL_ACCESS_ROLES.some((r) => hasRole(r))) return "all";
    if (hasRole("operator")) return "operator";
    if (hasRole("driver")) return "driver";
    return "self";
  }, [isSuperAdmin, hasRole]);

  // Resolve drivers.id for driver-tier users so we can filter
  // assigned_driver_id in addition to requester_id.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!user || !organizationId || tier !== "driver") {
        if (!cancelled) {
          setDriverId(null);
          setResolvingDriver(false);
        }
        return;
      }
      setResolvingDriver(true);
      const { data } = await supabase
        .from("drivers")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) {
        setDriverId(data?.id || null);
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
      // Operators see anything that's been routed into the pool review/
      // assignment workflow, plus anything they personally filed.
      if (!scope.userId) return q.eq("requester_id", "__never__") as T;
      return q.or(
        `requester_id.eq.${scope.userId},pool_review_status.not.is.null,assigned_vehicle_id.not.is.null,status.in.(pending,approved,assigned)`
      ) as T;
    case "driver":
      if (!scope.userId) return q.eq("requester_id", "__never__") as T;
      if (scope.driverId) {
        return q.or(
          `assigned_driver_id.eq.${scope.driverId},requester_id.eq.${scope.userId}`
        ) as T;
      }
      return q.eq("requester_id", scope.userId) as T;
    case "self":
    default:
      if (!scope.userId) return q.eq("requester_id", "__never__") as T;
      return q.eq("requester_id", scope.userId) as T;
  }
}
