import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  created_by: string | null;
  vehicles?: {
    plate_number: string;
  };
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  };
}

export function useGovernorCommands(limit = 20) {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();

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
          created_by,
          vehicles:vehicle_id(plate_number),
          profiles:created_by(first_name, last_name)
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
    refetchInterval: 10000,
  });

  // Acknowledge command mutation
  const acknowledgeCommand = useMutation({
    mutationFn: async (logId: string) => {
      const { error } = await (supabase as any)
        .from("governor_command_logs")
        .update({
          status: "acknowledged",
          acknowledged_at: new Date().toISOString(),
        })
        .eq("id", logId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governor-command-logs"] });
    },
  });

  // Retry failed command mutation
  const retryCommand = useMutation({
    mutationFn: async (logId: string) => {
      // Get the original command
      const { data: log, error: fetchError } = await (supabase as any)
        .from("governor_command_logs")
        .select("*")
        .eq("id", logId)
        .single();

      if (fetchError) throw fetchError;

      // Re-invoke the edge function
      const { error } = await supabase.functions.invoke("send-governor-command", {
        body: {
          vehicleId: log.vehicle_id,
          commandType: log.command_type,
          speedLimit: log.command_data?.speed_limit,
          phoneNumber: log.phone_number,
          organizationId: log.organization_id,
          userId: log.created_by,
          isRetry: true,
          originalCommandId: logId,
        },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governor-command-logs"] });
    },
  });

  return {
    commandLogs: commandLogs || [],
    isLoading,
    refetch,
    acknowledgeCommand,
    retryCommand,
  };
}
