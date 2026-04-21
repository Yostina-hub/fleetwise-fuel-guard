/**
 * usePendingRatings
 * -----------------
 * Returns the list of vehicle requests created by the current user that are
 * complete (status completed/closed OR driver checked-out) but have not yet
 * been rated. Used to block new request creation and to drive the dashboard
 * "Trips awaiting your rating" widget.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";

export interface PendingRatingTrip {
  id: string;
  request_number: string;
  purpose: string;
  destination: string | null;
  departure_place: string | null;
  needed_from: string;
  completed_at: string | null;
  driver_checked_out_at: string | null;
  assigned_vehicle_id: string | null;
  assigned_driver_id: string | null;
  vehicles?: { plate_number: string | null; make: string | null; model: string | null } | null;
  drivers?: { full_name: string | null } | null;
}

export function usePendingRatings(enabled = true) {
  const { user } = useAuth();
  const { organizationId } = useOrganization();

  return useQuery({
    queryKey: ["pending-ratings", user?.id, organizationId],
    enabled: enabled && !!user?.id && !!organizationId,
    staleTime: 30_000,
    queryFn: async (): Promise<PendingRatingTrip[]> => {
      const { data, error } = await supabase
        .from("vehicle_requests")
        .select(`
          id, request_number, purpose, destination, departure_place,
          needed_from, completed_at, driver_checked_out_at,
          assigned_vehicle_id, assigned_driver_id,
          vehicles:assigned_vehicle_id ( plate_number, make, model ),
          drivers:assigned_driver_id ( full_name )
        `)
        .eq("requester_id", user!.id)
        .eq("organization_id", organizationId!)
        .is("rated_at", null)
        .or("status.in.(completed,closed),driver_checked_out_at.not.is.null")
        .order("completed_at", { ascending: false, nullsFirst: false })
        .limit(20);

      if (error) throw error;
      return (data ?? []) as unknown as PendingRatingTrip[];
    },
  });
}
