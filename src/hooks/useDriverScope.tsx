import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useOrganization } from "@/hooks/useOrganization";

/**
 * Determines if the current user is "driver-only" (has the driver role and
 * no elevated operational role) and resolves their drivers.id.
 *
 * Use this in any list/table query to scope rows to the driver's own data.
 *
 *   const { isDriverOnly, driverId, userId, loading } = useDriverScope();
 *   if (isDriverOnly && driverId) query = query.or(`driver_id.eq.${driverId},requested_by.eq.${userId}`);
 */
export const useDriverScope = () => {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const { isSuperAdmin, hasRole, loading: permsLoading } = usePermissions();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);

  // A user is "driver-only" if they have the driver role and none of the
  // elevated operational roles. Mirrors public.is_driver_only() in the DB.
  const elevatedRoles = [
    "super_admin",
    "org_admin",
    "operations_manager",
    "fleet_owner",
    "fleet_manager",
    "dispatcher",
    "operator",
    "auditor",
    "technician",
    "maintenance_lead",
    "mechanic",
    "fuel_controller",
  ];

  const hasElevated =
    isSuperAdmin || elevatedRoles.some((r) => hasRole(r));
  const isDriverOnly = hasRole("driver") && !hasElevated;

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!user || !organizationId || !isDriverOnly) {
        if (!cancelled) {
          setDriverId(null);
          setResolving(false);
        }
        return;
      }
      setResolving(true);
      const { data } = await supabase
        .from("drivers")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) {
        setDriverId(data?.id || null);
        setResolving(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [user, organizationId, isDriverOnly]);

  return {
    isDriverOnly,
    driverId,
    userId: user?.id || null,
    loading: permsLoading || resolving,
  };
};
