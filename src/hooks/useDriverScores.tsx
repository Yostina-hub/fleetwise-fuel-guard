import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface DriverScore {
  id: string;
  driver_id: string;
  vehicle_id: string;
  score_period_start: string;
  score_period_end: string;
  overall_score: number;
  safety_rating: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  speeding_score: number;
  braking_score: number;
  acceleration_score: number;
  idle_score: number;
  speed_violations: number;
  harsh_braking_events: number;
  harsh_acceleration_events: number;
  total_drive_time: number;
  total_idle_time: number;
  total_distance: number;
  risk_factors: string[];
  recommendations: string[];
  trend: 'improving' | 'stable' | 'declining';
  created_at: string;
}

export const useDriverScores = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: driverScores, isLoading } = useQuery({
    queryKey: ["driver-scores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("latest_driver_scores" as any)
        .select("*")
        .order("overall_score", { ascending: true });

      if (error) throw error;
      return data as unknown as DriverScore[];
    },
  });

  const { data: scoreHistory } = useQuery({
    queryKey: ["driver-score-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("driver_behavior_scores" as any)
        .select("*")
        .order("score_period_end", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as unknown as DriverScore[];
    },
  });

  const calculateScore = useMutation({
    mutationFn: async ({ 
      driverId, 
      vehicleId, 
      startDate, 
      endDate 
    }: { 
      driverId: string; 
      vehicleId: string; 
      startDate: string; 
      endDate: string; 
    }) => {
      const { data, error } = await supabase.functions.invoke("calculate-driver-scores", {
        body: { driverId, vehicleId, startDate, endDate },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-scores"] });
      queryClient.invalidateQueries({ queryKey: ["driver-score-history"] });
      toast({
        title: "Success",
        description: "Driver score calculated successfully",
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

  return {
    driverScores,
    scoreHistory,
    isLoading,
    calculateScore,
  };
};
