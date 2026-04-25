/**
 * usePoolMembership
 * -----------------
 * Resolves which fleet pools the current user belongs to, and which they
 * manage. Backed by `public.pool_memberships`.
 *
 *   const { poolCodes, managedPoolCodes, isManagerOf, hasAnyMembership, loading } = usePoolMembership();
 *
 * Roles with org-wide reach (super_admin, org_admin, fleet_owner,
 * fleet_manager, operations_manager, dispatcher, auditor) automatically
 * get `unrestricted = true` — used by callers to skip pool filtering.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useOrganization } from "@/hooks/useOrganization";

const ORG_WIDE_ROLES = [
  "super_admin",
  "org_admin",
  "fleet_owner",
  "fleet_manager",
  "operations_manager",
  "dispatcher",
  "auditor",
];

export interface PoolMembership {
  pool_code: string;
  role: "member" | "manager";
}

export interface PoolMembershipResult {
  /** All pool codes the user belongs to (member or manager). */
  poolCodes: string[];
  /** Pool codes the user manages. */
  managedPoolCodes: string[];
  /** True for roles with org-wide reach — pool filtering should be skipped. */
  unrestricted: boolean;
  /** True when the user has at least one membership row. */
  hasAnyMembership: boolean;
  /** Helper. */
  isManagerOf: (poolCode: string) => boolean;
  /** Helper. */
  belongsTo: (poolCode: string) => boolean;
  loading: boolean;
}

export const usePoolMembership = (): PoolMembershipResult => {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const { isSuperAdmin, hasRole, loading: permsLoading } = usePermissions();
  const [memberships, setMemberships] = useState<PoolMembership[]>([]);
  const [loading, setLoading] = useState(true);

  const unrestricted = useMemo(
    () => isSuperAdmin || ORG_WIDE_ROLES.some((r) => hasRole(r)),
    [isSuperAdmin, hasRole],
  );

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!user || !organizationId) {
        if (!cancelled) {
          setMemberships([]);
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      const { data } = await (supabase as any)
        .from("pool_memberships")
        .select("pool_code, role")
        .eq("user_id", user.id)
        .eq("organization_id", organizationId);
      if (!cancelled) {
        setMemberships((data as PoolMembership[]) || []);
        setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [user, organizationId]);

  const poolCodes = useMemo(
    () => Array.from(new Set(memberships.map((m) => m.pool_code))),
    [memberships],
  );
  const managedPoolCodes = useMemo(
    () =>
      Array.from(
        new Set(memberships.filter((m) => m.role === "manager").map((m) => m.pool_code)),
      ),
    [memberships],
  );

  return {
    poolCodes,
    managedPoolCodes,
    unrestricted,
    hasAnyMembership: memberships.length > 0,
    isManagerOf: (code) => managedPoolCodes.includes(code),
    belongsTo: (code) => poolCodes.includes(code),
    loading: permsLoading || loading,
  };
};
