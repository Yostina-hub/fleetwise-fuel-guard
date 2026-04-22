/**
 * useDefaultMapStyle — reads the organization-wide default map style
 * (`organization_settings.default_map_style`). Super-admins set it once;
 * every map dialog/component uses it as the default. Falls back to
 * "streets" when not configured.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

export type MapStyleKey = "streets" | "satellite" | "dark";

const isMapStyle = (v: unknown): v is MapStyleKey =>
  v === "streets" || v === "satellite" || v === "dark";

export function useDefaultMapStyle(): MapStyleKey {
  const { organizationId } = useOrganization();

  const { data } = useQuery({
    queryKey: ["org-default-map-style", organizationId],
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("organization_settings")
        .select("default_map_style")
        .eq("organization_id", organizationId!)
        .maybeSingle();
      const v = data?.default_map_style;
      return isMapStyle(v) ? v : "streets";
    },
  });

  return data ?? "streets";
}
