/**
 * useSharedRideMembership
 * -----------------------
 * Given a list of vehicle_request IDs, returns a map of
 *   { [vehicleRequestId]: { rideId, poolCode, departureAt, originLabel,
 *                           destinationLabel, role: 'passenger' } }
 *
 * Used by Trip Management & Dispatch boards to render a "Shared" badge on
 * the trip card without re-querying for every card individually.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

export interface SharedRideMembership {
  rideId: string;
  poolCode: string | null;
  departureAt: string | null;
  originLabel: string | null;
  destinationLabel: string | null;
  status: string | null;
}

export const useSharedRideMembership = (vehicleRequestIds: string[]) => {
  const { organizationId } = useOrganization();

  // Stable key — sort once, reuse.
  const idsKey = useMemo(
    () => [...new Set(vehicleRequestIds)].filter(Boolean).sort().join(","),
    [vehicleRequestIds],
  );

  const query = useQuery({
    queryKey: ["shared-ride-membership", organizationId, idsKey],
    enabled: !!organizationId && idsKey.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const ids = idsKey.split(",").filter(Boolean);
      if (ids.length === 0) return {} as Record<string, SharedRideMembership>;

      const { data, error } = await (supabase as any)
        .from("shared_ride_passengers")
        .select(
          `vehicle_request_id, status,
           shared_ride:shared_ride_id (
             id, pool_code, departure_at, origin_label, destination_label
           )`,
        )
        .eq("organization_id", organizationId)
        .in("vehicle_request_id", ids)
        .neq("status", "cancelled");

      if (error) throw error;

      const map: Record<string, SharedRideMembership> = {};
      (data ?? []).forEach((row: any) => {
        if (!row?.vehicle_request_id || !row?.shared_ride) return;
        map[row.vehicle_request_id] = {
          rideId: row.shared_ride.id,
          poolCode: row.shared_ride.pool_code ?? null,
          departureAt: row.shared_ride.departure_at ?? null,
          originLabel: row.shared_ride.origin_label ?? null,
          destinationLabel: row.shared_ride.destination_label ?? null,
          status: row.status ?? null,
        };
      });
      return map;
    },
  });

  return {
    membership: query.data ?? {},
    isLoading: query.isLoading,
  };
};
