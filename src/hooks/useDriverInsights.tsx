import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";

export interface AIInsight {
  id: string;
  organization_id: string;
  driver_id: string;
  insight_type: 'risk_prediction' | 'coaching_tip' | 'performance_trend' | 'fuel_optimization' | 'route_suggestion';
  severity: 'info' | 'warning' | 'critical' | 'positive';
  title: string;
  description: string;
  action_items: string[];
  confidence_score: number | null;
  data_points_used: number | null;
  valid_until: string | null;
  is_acknowledged: boolean;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  created_at: string;
}

export interface WeeklyStats {
  id: string;
  organization_id: string;
  driver_id: string;
  week_start: string;
  week_end: string;
  trips_completed: number;
  distance_km: number;
  driving_hours: number;
  fuel_consumed_liters: number;
  fuel_efficiency_km_per_liter: number | null;
  on_time_deliveries: number;
  total_deliveries: number;
  safety_score: number | null;
  harsh_events_count: number;
  idle_time_minutes: number;
  revenue_generated: number;
  xp_earned: number;
  rank_change: number;
  created_at: string;
}

export interface DriverGoal {
  id: string;
  organization_id: string;
  driver_id: string | null;
  title: string;
  description: string | null;
  goal_type: 'personal' | 'team' | 'org_wide' | 'challenge';
  metric: string;
  target_value: number;
  current_value: number;
  start_date: string;
  end_date: string;
  xp_reward: number;
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  completed_at: string | null;
  created_at: string;
}

export interface DriverReward {
  id: string;
  organization_id: string;
  driver_id: string;
  reward_type: 'bonus' | 'gift_card' | 'time_off' | 'recognition' | 'certificate';
  title: string;
  description: string | null;
  value_amount: number | null;
  currency: string;
  issued_by: string | null;
  issued_at: string;
  redeemed_at: string | null;
  expires_at: string | null;
  status: 'active' | 'redeemed' | 'expired' | 'cancelled';
}

export const useDriverInsights = (driverId?: string) => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch AI insights for a driver
  const { data: insights = [], isLoading: insightsLoading } = useQuery({
    queryKey: ["driver-ai-insights", driverId],
    queryFn: async () => {
      if (!driverId) return [];
      const { data, error } = await (supabase as any)
        .from("driver_ai_insights")
        .select("*")
        .eq("driver_id", driverId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as AIInsight[];
    },
    enabled: !!driverId,
  });

  // Fetch unacknowledged insights (for alerts)
  const { data: unacknowledgedInsights = [] } = useQuery({
    queryKey: ["driver-insights-unacked", driverId],
    queryFn: async () => {
      if (!driverId) return [];
      const { data, error } = await (supabase as any)
        .from("driver_ai_insights")
        .select("*")
        .eq("driver_id", driverId)
        .eq("is_acknowledged", false)
        .order("severity", { ascending: true }) // critical first
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AIInsight[];
    },
    enabled: !!driverId,
  });

  // Fetch weekly stats for a driver
  const { data: weeklyStats = [], isLoading: statsLoading } = useQuery({
    queryKey: ["driver-weekly-stats", driverId],
    queryFn: async () => {
      if (!driverId) return [];
      const { data, error } = await (supabase as any)
        .from("driver_weekly_stats")
        .select("*")
        .eq("driver_id", driverId)
        .order("week_start", { ascending: false })
        .limit(12); // Last 12 weeks
      if (error) throw error;
      return data as WeeklyStats[];
    },
    enabled: !!driverId,
  });

  // Fetch goals for a driver
  const { data: goals = [], isLoading: goalsLoading } = useQuery({
    queryKey: ["driver-goals", driverId],
    queryFn: async () => {
      if (!driverId) return [];
      const { data, error } = await (supabase as any)
        .from("driver_goals")
        .select("*")
        .or(`driver_id.eq.${driverId},driver_id.is.null`)
        .eq("status", "active")
        .order("end_date", { ascending: true });
      if (error) throw error;
      return data as DriverGoal[];
    },
    enabled: !!driverId,
  });

  // Fetch rewards for a driver
  const { data: rewards = [], isLoading: rewardsLoading } = useQuery({
    queryKey: ["driver-rewards", driverId],
    queryFn: async () => {
      if (!driverId) return [];
      const { data, error } = await (supabase as any)
        .from("driver_rewards")
        .select("*")
        .eq("driver_id", driverId)
        .order("issued_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as DriverReward[];
    },
    enabled: !!driverId,
  });

  // Acknowledge insight
  const acknowledgeInsight = useMutation({
    mutationFn: async (insightId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await (supabase as any)
        .from("driver_ai_insights")
        .update({
          is_acknowledged: true,
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: userData.user?.id,
        })
        .eq("id", insightId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-ai-insights"] });
      queryClient.invalidateQueries({ queryKey: ["driver-insights-unacked"] });
    },
  });

  // Create a goal
  const createGoal = useMutation({
    mutationFn: async (goal: Partial<DriverGoal>) => {
      if (!organizationId) throw new Error("No organization");
      
      const { error } = await (supabase as any)
        .from("driver_goals")
        .insert({
          ...goal,
          organization_id: organizationId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-goals"] });
      toast({ title: "Goal created!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create goal", description: error.message, variant: "destructive" });
    },
  });

  // Update goal progress
  const updateGoalProgress = useMutation({
    mutationFn: async ({ goalId, currentValue }: { goalId: string; currentValue: number }) => {
      const goal = goals.find(g => g.id === goalId);
      if (!goal) throw new Error("Goal not found");

      const completed = currentValue >= goal.target_value;
      
      const { error } = await (supabase as any)
        .from("driver_goals")
        .update({
          current_value: currentValue,
          status: completed ? "completed" : "active",
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq("id", goalId);
      if (error) throw error;

      return { completed, xpReward: completed ? goal.xp_reward : 0 };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["driver-goals"] });
      if (data.completed) {
        toast({ title: "🎯 Goal Completed!", description: `You earned ${data.xpReward} XP!` });
      }
    },
  });

  // Issue reward
  const issueReward = useMutation({
    mutationFn: async (reward: Partial<DriverReward>) => {
      if (!organizationId) throw new Error("No organization");
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await (supabase as any)
        .from("driver_rewards")
        .insert({
          ...reward,
          organization_id: organizationId,
          issued_by: userData.user?.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-rewards"] });
      toast({ title: "Reward issued!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to issue reward", description: error.message, variant: "destructive" });
    },
  });

  // Calculate trends from weekly stats
  const calculateTrends = () => {
    if (weeklyStats.length < 2) return null;

    const current = weeklyStats[0];
    const previous = weeklyStats[1];

    return {
      tripsChange: current.trips_completed - previous.trips_completed,
      distanceChange: current.distance_km - previous.distance_km,
      safetyScoreChange: (current.safety_score || 0) - (previous.safety_score || 0),
      fuelEfficiencyChange: (current.fuel_efficiency_km_per_liter || 0) - (previous.fuel_efficiency_km_per_liter || 0),
      revenueChange: current.revenue_generated - previous.revenue_generated,
      harshEventsChange: current.harsh_events_count - previous.harsh_events_count,
    };
  };

  return {
    insights,
    unacknowledgedInsights,
    weeklyStats,
    goals,
    rewards,
    trends: calculateTrends(),
    isLoading: insightsLoading || statsLoading || goalsLoading || rewardsLoading,
    acknowledgeInsight,
    createGoal,
    updateGoalProgress,
    issueReward,
  };
};
