import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "./useOrganization";
import { useEffect, useRef } from "react";

export interface PenaltyConfig {
  id: string;
  organization_id: string;
  violation_type: string;
  severity: string;
  penalty_points: number;
  monetary_fine: number;
  warning_count_before_suspension: number;
  suspension_days: number;
  auto_apply: boolean;
  speed_threshold_kmh: number | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DriverPenalty {
  id: string;
  organization_id: string;
  driver_id: string;
  vehicle_id: string | null;
  penalty_config_id: string | null;
  violation_type: string;
  severity: string;
  penalty_points: number;
  monetary_fine: number;
  violation_time: string;
  violation_details: Record<string, any>;
  location_name: string | null;
  lat: number | null;
  lng: number | null;
  speed_kmh: number | null;
  speed_limit_kmh: number | null;
  geofence_id: string | null;
  geofence_name: string | null;
  status: string;
  appeal_reason: string | null;
  appeal_submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  is_auto_applied: boolean;
  created_at: string;
  driver?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  vehicle?: {
    id: string;
    plate_number: string;
  };
}

export interface DriverPenaltySummary {
  id: string;
  organization_id: string;
  driver_id: string;
  total_penalty_points: number;
  total_fines: number;
  total_violations: number;
  overspeed_count: number;
  geofence_count: number;
  warning_count: number;
  suspension_count: number;
  is_suspended: boolean;
  suspension_start_date: string | null;
  suspension_end_date: string | null;
  last_violation_at: string | null;
  driver?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
}

export const usePenaltyConfigs = () => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const { data: configs, isLoading } = useQuery({
    queryKey: ["penalty-configs", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("penalty_configurations" as any)
        .select("*")
        .eq("organization_id", organizationId)
        .order("violation_type")
        .order("severity");

      if (error) throw error;
      return data as unknown as PenaltyConfig[];
    },
    enabled: !!organizationId,
  });

  // Real-time subscription
  useEffect(() => {
    if (!organizationId) return;
    
    const channel = supabase
      .channel(`penalty-configs-${organizationId.slice(0, 8)}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'penalty_configurations',
        filter: `organization_id=eq.${organizationId}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["penalty-configs"] });
      })
      .subscribe();
    
    channelRef.current = channel;
    
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [organizationId, queryClient]);

  const updateConfig = useMutation({
    mutationFn: async (config: Partial<PenaltyConfig> & { id: string }) => {
      const { data, error } = await supabase
        .from("penalty_configurations" as any)
        .update(config)
        .eq("id", config.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["penalty-configs"] });
      toast({ title: "Success", description: "Penalty configuration updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createConfig = useMutation({
    mutationFn: async (config: Omit<PenaltyConfig, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from("penalty_configurations" as any)
        .insert(config)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["penalty-configs"] });
      toast({ title: "Success", description: "Penalty configuration created" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteConfig = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("penalty_configurations" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["penalty-configs"] });
      toast({ title: "Success", description: "Penalty configuration deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return {
    configs,
    isLoading,
    updateConfig,
    createConfig,
    deleteConfig,
  };
};

export const useDriverPenalties = (driverId?: string) => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: penalties, isLoading } = useQuery({
    queryKey: ["driver-penalties", organizationId, driverId],
    queryFn: async () => {
      if (!organizationId) return [];
      let query = supabase
        .from("driver_penalties" as any)
        .select(`
          *,
          driver:driver_id(id, first_name, last_name),
          vehicle:vehicle_id(id, plate_number)
        `)
        .eq("organization_id", organizationId)
        .order("violation_time", { ascending: false });

      if (driverId) {
        query = query.eq("driver_id", driverId);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as unknown as DriverPenalty[];
    },
    enabled: !!organizationId,
  });

  const updatePenaltyStatus = useMutation({
    mutationFn: async ({ id, status, review_notes }: { id: string; status: string; review_notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("driver_penalties" as any)
        .update({
          status,
          review_notes,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-penalties"] });
      queryClient.invalidateQueries({ queryKey: ["driver-penalty-summaries"] });
      toast({ title: "Success", description: "Penalty status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return {
    penalties,
    isLoading,
    updatePenaltyStatus,
  };
};

export const useDriverPenaltySummaries = () => {
  const { organizationId } = useOrganization();

  const { data: summaries, isLoading } = useQuery({
    queryKey: ["driver-penalty-summaries", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("driver_penalty_summary" as any)
        .select(`
          *,
          driver:driver_id(id, first_name, last_name, avatar_url)
        `)
        .eq("organization_id", organizationId)
        .order("total_penalty_points", { ascending: false });

      if (error) throw error;
      return data as unknown as DriverPenaltySummary[];
    },
    enabled: !!organizationId,
  });

  return {
    summaries,
    isLoading,
  };
};
