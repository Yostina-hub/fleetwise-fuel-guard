import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";

export interface EmailReportConfig {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly';
  day_of_week?: number;
  time_of_day: string;
  recipient_emails: string[];
  vehicle_ids: string[];
  include_trend_analysis: boolean;
  is_active: boolean;
  organization_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const useEmailReports = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  const { data: reportConfigs, isLoading } = useQuery({
    queryKey: ["email-report-configs", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_report_configs" as any)
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as EmailReportConfig[];
    },
    enabled: !!organizationId,
  });

  const createReportConfig = useMutation({
    mutationFn: async (config: Omit<EmailReportConfig, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'organization_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      if (!organizationId) throw new Error("Organization not found");

      const { data, error } = await supabase
        .from("email_report_configs" as any)
        .insert({
          ...config,
          created_by: user.id,
          organization_id: organizationId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-report-configs"] });
      toast({
        title: "Success",
        description: "Email report schedule created",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateReportConfig = useMutation({
    mutationFn: async ({ id, ...config }: Partial<EmailReportConfig> & { id: string }) => {
      const { data, error } = await supabase
        .from("email_report_configs" as any)
        .update(config)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-report-configs"] });
      toast({
        title: "Success",
        description: "Email report schedule updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteReportConfig = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("email_report_configs" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-report-configs"] });
      toast({
        title: "Success",
        description: "Email report schedule deleted",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testReport = useMutation({
    mutationFn: async (configId: string) => {
      const { data, error } = await supabase.functions.invoke("send-speed-violation-report", {
        body: { configId, test: true },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Test email sent",
        description: "Check your inbox for the test report",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error sending test",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    reportConfigs,
    isLoading,
    createReportConfig,
    updateReportConfig,
    deleteReportConfig,
    testReport,
  };
};
