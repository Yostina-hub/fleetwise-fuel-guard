import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

export interface GovernorCommandLog {
  id: string;
  vehicle_id: string;
  command_type: string;
  command_data: Record<string, any>;
  phone_number: string | null;
  sms_content: string | null;
  status: string;
  sent_at: string | null;
  acknowledged_at: string | null;
  created_at: string;
  sent_by: string | null;
  vehicles?: {
    plate_number: string;
  };
}

export function useGovernorCommands(limit = 20) {
  const { organizationId } = useOrganization();

  const { data: commandLogs, isLoading, refetch } = useQuery({
    queryKey: ["governor-command-logs", organizationId, limit],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await (supabase as any)
        .from("governor_command_logs")
        .select(`
          id,
          vehicle_id,
          command_type,
          command_data,
          phone_number,
          sms_content,
          status,
          sent_at,
          acknowledged_at,
          created_at,
          sent_by,
          vehicles:vehicle_id(plate_number)
        `)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching command logs:", error);
        throw error;
      }

      return data as GovernorCommandLog[];
    },
    enabled: !!organizationId,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  return {
    commandLogs: commandLogs || [],
    isLoading,
    refetch,
  };
}
