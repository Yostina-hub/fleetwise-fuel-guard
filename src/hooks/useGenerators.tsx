import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { toast } from "sonner";

export interface Generator {
  id: string;
  organization_id: string;
  asset_number: string | null;
  name: string;
  asset_group: string | null;
  asset_serial_number: string | null;
  asset_category: string | null;
  asset_type: string;
  parent_asset_id: string | null;
  owning_department: string | null;
  criticality: string;
  wip_accounting_class: string | null;
  asset_status: string;
  is_maintainable: boolean;
  is_gis_asset: boolean;
  operation_log_enabled: boolean;
  warranty_expiration: string | null;
  checked_out: boolean;
  model: string | null;
  serial_number: string | null;
  fuel_type: string;
  tank_capacity_liters: number | null;
  current_fuel_level_percent: number | null;
  status: string;
  area: string | null;
  location: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  hazard_class: string | null;
  safety_notes: string | null;
  lockout_tagout_required: boolean;
  ppe_required: string[] | null;
  inspection_frequency_days: number | null;
  manufacturer: string | null;
  manufacture_date: string | null;
  commission_date: string | null;
  purchase_cost: number | null;
  supplier: string | null;
  notes: string | null;
  last_refuel_date: string | null;
  created_at: string;
  updated_at: string;
}

export const useGenerators = () => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["generators", organizationId],
    queryFn: async () => {
      if (!organizationId) return [] as Generator[];
      const { data, error } = await supabase
        .from("generators")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Generator[];
    },
    enabled: !!organizationId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!organizationId) return;
    const channel = supabase
      .channel(`generators-${organizationId.slice(0, 8)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "generators", filter: `organization_id=eq.${organizationId}` },
        () => queryClient.invalidateQueries({ queryKey: ["generators", organizationId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, queryClient]);

  const createMutation = useMutation({
    mutationFn: async (payload: Partial<Generator>) => {
      if (!organizationId) throw new Error("No organization");
      // Map serial -> serial_number for legacy column compatibility
      const insertPayload: any = {
        ...payload,
        organization_id: organizationId,
        serial_number: (payload as any).serial_number ?? payload.asset_serial_number ?? null,
      };
      const { data, error } = await supabase
        .from("generators")
        .insert(insertPayload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Generator registered successfully");
      queryClient.invalidateQueries({ queryKey: ["generators", organizationId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<Generator> }) => {
      const updatePayload: any = {
        ...payload,
        serial_number: (payload as any).serial_number ?? payload.asset_serial_number ?? undefined,
      };
      const { data, error } = await supabase
        .from("generators")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Generator updated");
      queryClient.invalidateQueries({ queryKey: ["generators", organizationId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("generators").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Generator removed");
      queryClient.invalidateQueries({ queryKey: ["generators", organizationId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    generators: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    createGenerator: createMutation.mutateAsync,
    updateGenerator: updateMutation.mutateAsync,
    deleteGenerator: deleteMutation.mutateAsync,
    isMutating: createMutation.isPending || updateMutation.isPending,
  };
};
