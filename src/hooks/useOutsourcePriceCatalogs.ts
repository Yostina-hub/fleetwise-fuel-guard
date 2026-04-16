import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

export interface PriceCatalog {
  id: string;
  organization_id: string;
  catalog_name: string;
  zone_region: string | null;
  resource_type: "vehicle" | "driver" | "combined";
  vehicle_class: string | null;
  driver_grade: string | null;
  unit: string;
  base_rate: number;
  overtime_rate: number | null;
  fuel_included: boolean;
  driver_included: boolean;
  currency: string;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  notes: string | null;
}

export const useOutsourcePriceCatalogs = (zone?: string) => {
  const { organizationId } = useOrganization();
  const qc = useQueryClient();

  const { data: catalogs = [], isLoading } = useQuery({
    queryKey: ["outsource-price-catalogs", organizationId, zone],
    queryFn: async () => {
      if (!organizationId) return [];
      let q = supabase
        .from("outsource_price_catalogs")
        .select("*")
        .eq("organization_id", organizationId)
        .order("effective_from", { ascending: false });
      if (zone) q = q.eq("zone_region", zone);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as PriceCatalog[];
    },
    enabled: !!organizationId,
  });

  const upsert = useMutation({
    mutationFn: async (payload: Partial<PriceCatalog> & { catalog_name: string; resource_type: string; base_rate: number }) => {
      if (!organizationId) throw new Error("No org");
      const row = { ...payload, organization_id: organizationId };
      if (payload.id) {
        const { error } = await supabase.from("outsource_price_catalogs").update(row).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("outsource_price_catalogs").insert(row as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outsource-price-catalogs"] });
      toast.success("Catalog saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("outsource_price_catalogs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outsource-price-catalogs"] });
      toast.success("Catalog deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { catalogs, isLoading, upsert, remove };
};
