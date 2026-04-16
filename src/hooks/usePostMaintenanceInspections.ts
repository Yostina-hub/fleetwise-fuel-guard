import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

export interface PostMaintenanceInspection {
  id: string;
  work_order_id: string;
  inspector_name: string | null;
  inspection_date: string;
  overall_result: string;
  checklist: any[];
  findings: string | null;
  corrective_actions: string | null;
  parts_replaced: any[];
  scrap_returned: boolean;
  scrap_form_url: string | null;
  notes: string | null;
  created_at: string;
  work_order?: { work_order_number: string; vehicle_id: string } | null;
}

export const usePostMaintenanceInspections = () => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  const { data: inspections = [], isLoading } = useQuery({
    queryKey: ["post-maintenance-inspections", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("post_maintenance_inspections")
        .select("*, work_order:work_orders(work_order_number, vehicle_id)")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as PostMaintenanceInspection[];
    },
    enabled: !!organizationId,
  });

  const createInspection = useMutation({
    mutationFn: async (payload: {
      work_order_id: string;
      inspector_name: string;
      overall_result: string;
      checklist?: any[];
      findings?: string;
      corrective_actions?: string;
      parts_replaced?: any[];
      scrap_returned?: boolean;
      notes?: string;
    }) => {
      if (!organizationId) throw new Error("No organization");
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("post_maintenance_inspections").insert({
        organization_id: organizationId,
        inspector_id: userData.user?.id,
        ...payload,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post-maintenance-inspections"] });
      toast.success("Post-maintenance inspection recorded");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return { inspections, isLoading, createInspection };
};
