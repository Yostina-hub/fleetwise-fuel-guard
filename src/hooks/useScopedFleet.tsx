/**
 * useScopedFleet
 * --------------
 * Returns the slice of vehicles and drivers the current user is allowed to
 * see / assign based on their `pool_memberships`. Org-wide roles
 * (super_admin, org_admin, fleet_owner, fleet_manager, operations_manager,
 * dispatcher, auditor) bypass scoping and see everything.
 *
 * Use this inside the Vehicle Request form, assignment dialogs, and any
 * picker that should respect pool boundaries.
 */
import { useMemo } from "react";
import { useDrivers, type Driver } from "./useDrivers";
import { useAvailableVehicles, type AvailableVehicle } from "./useAvailableVehicles";
import { usePoolMembership } from "./usePoolMembership";

export interface ScopedFleet {
  vehicles: AvailableVehicle[];
  availableVehicles: AvailableVehicle[];
  drivers: Driver[];
  poolCodes: string[];
  unrestricted: boolean;
  loading: boolean;
}

export const useScopedFleet = (): ScopedFleet => {
  const { allVehicles, available, loading: vLoading } = useAvailableVehicles();
  const { drivers, loading: dLoading } = useDrivers();
  const { poolCodes, unrestricted, loading: pLoading } = usePoolMembership();

  const filteredVehicles = useMemo(() => {
    if (unrestricted) return allVehicles;
    if (poolCodes.length === 0) return [];
    return allVehicles.filter(
      (v) => v.specific_pool && poolCodes.includes(v.specific_pool),
    );
  }, [allVehicles, poolCodes, unrestricted]);

  const filteredAvailable = useMemo(() => {
    if (unrestricted) return available;
    if (poolCodes.length === 0) return [];
    return available.filter(
      (v) => v.specific_pool && poolCodes.includes(v.specific_pool),
    );
  }, [available, poolCodes, unrestricted]);

  const filteredDrivers = useMemo(() => {
    if (unrestricted) return drivers;
    if (poolCodes.length === 0) return [];
    return drivers.filter(
      (d) => d.assigned_pool && poolCodes.includes(d.assigned_pool),
    );
  }, [drivers, poolCodes, unrestricted]);

  return {
    vehicles: filteredVehicles,
    availableVehicles: filteredAvailable,
    drivers: filteredDrivers,
    poolCodes,
    unrestricted,
    loading: vLoading || dLoading || pLoading,
  };
};
