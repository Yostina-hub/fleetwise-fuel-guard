import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { startOfDay, subDays } from "date-fns";
import type { Json } from "@/integrations/supabase/types";

export interface SpeedGovernorConfig {
  id: string;
  vehicle_id: string;
  max_speed_limit: number;
  governor_active: boolean;
  device_id: string | null;
  device_model: string | null;
  firmware_version: string | null;
  last_config_update: string | null;
}

export interface SpeedViolation {
  id: string;
  vehicle_id: string;
  driver_id: string | null;
  violation_time: string;
  speed_kmh: number;
  speed_limit_kmh: number;
  duration_seconds: number | null;
  lat: number | null;
  lng: number | null;
  location_name: string | null;
  severity: string;
  is_acknowledged: boolean;
  vehicles?: { plate_number: string };
  drivers?: { first_name: string; last_name: string };
}

export interface GovernorKPIs {
  activeGovernors: number;
  totalGovernors: number;
  complianceRate: number;
  todayViolations: number;
  yesterdayViolations: number;
  avgSpeedLimit: number;
  alertsSent24h: number;
}

export interface ViolationFilters {
  vehicleId?: string;
  severity?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export const useSpeedGovernor = () => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch KPIs
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ["speed-governor-kpis", organizationId],
    queryFn: async (): Promise<GovernorKPIs> => {
      const today = startOfDay(new Date());
      const yesterday = startOfDay(subDays(new Date(), 1));

      // Get governor configs
      const { data: configs, error: configError } = await supabase
        .from("speed_governor_config")
        .select("*")
        .eq("organization_id", organizationId!);

      if (configError) throw configError;

      const activeGovernors = configs?.filter(c => c.governor_active).length || 0;
      const totalGovernors = configs?.length || 0;
      const avgSpeedLimit = configs?.length 
        ? Math.round(configs.reduce((acc, c) => acc + c.max_speed_limit, 0) / configs.length)
        : 80;

      // Get today's violations
      const { count: todayCount } = await supabase
        .from("speed_violations")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId!)
        .gte("violation_time", today.toISOString());

      // Get yesterday's violations
      const { count: yesterdayCount } = await supabase
        .from("speed_violations")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId!)
        .gte("violation_time", yesterday.toISOString())
        .lt("violation_time", today.toISOString());

      // Get alerts sent in last 24 hours from driver_events (speed warnings)
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const { count: alertsCount } = await supabase
        .from("driver_events")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId!)
        .eq("event_type", "speeding")
        .gte("event_time", last24h.toISOString());

      return {
        activeGovernors,
        totalGovernors,
        complianceRate: totalGovernors > 0 ? Math.round((activeGovernors / totalGovernors) * 100) : 0,
        todayViolations: todayCount || 0,
        yesterdayViolations: yesterdayCount || 0,
        avgSpeedLimit,
        alertsSent24h: alertsCount || 0
      };
    },
    enabled: !!organizationId,
    refetchInterval: 30000,
  });

  // Fetch governor configs
  const { data: governorConfigs, isLoading: configsLoading } = useQuery({
    queryKey: ["speed-governor-configs", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("speed_governor_config")
        .select(`
          *,
          vehicles(id, plate_number)
        `)
        .eq("organization_id", organizationId!);

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  // Update governor config
  const updateConfig = useMutation({
    mutationFn: async ({ vehicleId, maxSpeedLimit, governorActive }: {
      vehicleId: string;
      maxSpeedLimit?: number;
      governorActive?: boolean;
    }) => {
      if (!organizationId) throw new Error("Organization not found");
      
      // Check if config exists
      const { data: existing } = await supabase
        .from("speed_governor_config")
        .select("id")
        .eq("vehicle_id", vehicleId)
        .single();

      const updateData: { [key: string]: Json } = {
        last_config_update: new Date().toISOString(),
      };
      if (maxSpeedLimit !== undefined) updateData.max_speed_limit = maxSpeedLimit;
      if (governorActive !== undefined) updateData.governor_active = governorActive;

      if (existing) {
        const { error } = await supabase
          .from("speed_governor_config")
          .update(updateData)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("speed_governor_config")
          .insert([{
            organization_id: organizationId,
            vehicle_id: vehicleId,
            max_speed_limit: maxSpeedLimit || 80,
            governor_active: governorActive ?? false,
          }]);
        if (error) throw error;
      }

      // Log the command
      await supabase
        .from("governor_command_logs")
        .insert([{
          organization_id: organizationId,
          vehicle_id: vehicleId,
          command_type: maxSpeedLimit !== undefined ? "set_speed_limit" : "toggle_governor",
          command_data: updateData as Json,
          status: "sent",
          sent_at: new Date().toISOString(),
        }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["speed-governor-configs"] });
      queryClient.invalidateQueries({ queryKey: ["speed-governor-kpis"] });
      toast({
        title: "Configuration Updated",
        description: "Speed governor settings have been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Acknowledge violation
  const acknowledgeViolation = useMutation({
    mutationFn: async (violationId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("speed_violations")
        .update({
          is_acknowledged: true,
          acknowledged_by: user?.id,
          acknowledged_at: new Date().toISOString(),
        })
        .eq("id", violationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["speed-violations"] });
      toast({
        title: "Violation Acknowledged",
        description: "The violation has been marked as reviewed.",
      });
    },
  });

  return {
    kpis,
    kpisLoading,
    governorConfigs,
    configsLoading,
    updateConfig,
    acknowledgeViolation,
    organizationId,
  };
};

// Separate hook for violations with pagination
export const useSpeedViolations = (
  page: number = 0, 
  pageSize: number = 20, 
  filters?: ViolationFilters
) => {
  const { organizationId } = useOrganization();
  
  return useQuery({
    queryKey: ["speed-violations", organizationId, page, pageSize, filters],
    queryFn: async () => {
      let query = supabase
        .from("speed_violations")
        .select(`
          *,
          vehicles(plate_number),
          drivers(first_name, last_name)
        `, { count: "exact" })
        .eq("organization_id", organizationId!)
        .order("violation_time", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (filters?.vehicleId) {
        query = query.eq("vehicle_id", filters.vehicleId);
      }
      if (filters?.severity) {
        query = query.eq("severity", filters.severity);
      }
      if (filters?.dateFrom) {
        query = query.gte("violation_time", filters.dateFrom.toISOString());
      }
      if (filters?.dateTo) {
        query = query.lte("violation_time", filters.dateTo.toISOString());
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return { violations: data as SpeedViolation[], totalCount: count || 0 };
    },
    enabled: !!organizationId,
  });
};
