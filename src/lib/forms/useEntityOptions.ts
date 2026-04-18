/**
 * Shared entity-picker queries for the Forms Renderer.
 *
 * These are intentionally lightweight (id + display name only) and cached
 * per-organization so multiple entity fields on one form share data.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useVehiclesLite(organizationId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["forms-vehicles-lite", organizationId],
    enabled: !!organizationId && enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("vehicles")
        .select("id, plate_number, make, model")
        .eq("organization_id", organizationId!)
        .order("plate_number");
      return data ?? [];
    },
  });
}

export function useDriversLite(organizationId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["forms-drivers-lite", organizationId],
    enabled: !!organizationId && enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("drivers")
        .select("id, first_name, last_name, license_number")
        .eq("organization_id", organizationId!)
        .order("first_name");
      return data ?? [];
    },
  });
}

export function useAssetsLite(organizationId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["forms-assets-lite", organizationId],
    enabled: !!organizationId && enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("fleet_assets")
        .select("id, name, asset_type")
        .eq("organization_id", organizationId!)
        .order("name");
      return data ?? [];
    },
  });
}

export function useGeofencesLite(organizationId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["forms-geofences-lite", organizationId],
    enabled: !!organizationId && enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("geofences")
        .select("id, name")
        .eq("organization_id", organizationId!)
        .order("name");
      return data ?? [];
    },
  });
}

export function useUsersLite(organizationId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["forms-users-lite", organizationId],
    enabled: !!organizationId && enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("organization_id", organizationId!)
        .order("full_name");
      return data ?? [];
    },
  });
}
