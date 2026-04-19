/**
 * useCurrentDriverId — resolves the driver record (if any) linked to the
 * authenticated user. Returns `null` for non-driver users so the header
 * notification bell can hide cleanly.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";

export function useCurrentDriverId(): string | null {
  const { user } = useAuth();
  const { organizationId } = useOrganization();

  const { data } = useQuery({
    queryKey: ["current-driver-id", user?.id, organizationId],
    enabled: !!user?.id && !!organizationId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("id")
        .eq("organization_id", organizationId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) return null;
      return data?.id ?? null;
    },
  });

  return data ?? null;
}
