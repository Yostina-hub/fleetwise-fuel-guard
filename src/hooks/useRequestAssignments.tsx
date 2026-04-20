/**
 * useRequestAssignments
 * ---------------------
 * Loads all per-vehicle assignments for a vehicle_request from the
 * `vehicle_request_assignments` table. This is what powers the
 * multi-vehicle visibility everywhere in the UI (table summary,
 * detail-dialog "Assigned Fleet" section, per-driver check-in/out).
 *
 * For single-vehicle requests this returns an empty list and callers
 * fall back to the parent `assigned_vehicle_id` / `assigned_driver_id`.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RequestAssignment {
  id: string;
  vehicle_request_id: string;
  organization_id: string;
  vehicle_id: string;
  driver_id: string | null;
  status: string;
  assigned_at: string;
  driver_checked_in_at: string | null;
  driver_checked_out_at: string | null;
  checkin_odometer: number | null;
  checkout_odometer: number | null;
  notes: string | null;
  vehicle?: { plate_number: string; make: string | null; model: string | null } | null;
  driver?: { first_name: string | null; last_name: string | null; phone: string | null } | null;
}

export const useRequestAssignments = (
  requestId: string | null | undefined,
  enabled = true,
) => {
  return useQuery({
    queryKey: ["vehicle-request-assignments", requestId],
    queryFn: async (): Promise<RequestAssignment[]> => {
      if (!requestId) return [];
      const { data, error } = await (supabase as any)
        .from("vehicle_request_assignments")
        .select(
          "id, vehicle_request_id, organization_id, vehicle_id, driver_id, status, assigned_at, driver_checked_in_at, driver_checked_out_at, checkin_odometer, checkout_odometer, notes, vehicle:vehicle_id(plate_number, make, model), driver:driver_id(first_name, last_name, phone)",
        )
        .eq("vehicle_request_id", requestId)
        .order("assigned_at", { ascending: true });
      if (error) throw error;
      return (data || []) as RequestAssignment[];
    },
    enabled: !!requestId && enabled,
    staleTime: 15_000,
  });
};
