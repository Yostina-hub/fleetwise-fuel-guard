import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { toast } from "sonner";

export interface Department {
  id: string;
  organization_id: string;
  code: string | null;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useDepartments = () => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["departments", organizationId],
    queryFn: async () => {
      if (!organizationId) return [] as Department[];
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data || []) as Department[];
    },
    enabled: !!organizationId,
  });

  const create = useMutation({
    mutationFn: async (payload: { name: string; code?: string; description?: string }) => {
      if (!organizationId) throw new Error("No organization");
      const { data, error } = await supabase
        .from("departments")
        .insert({
          organization_id: organizationId,
          name: payload.name.trim(),
          code: payload.code?.trim() || null,
          description: payload.description?.trim() || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Department;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments", organizationId] });
      toast.success("Department added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { departments: query.data || [], isLoading: query.isLoading, create };
};
