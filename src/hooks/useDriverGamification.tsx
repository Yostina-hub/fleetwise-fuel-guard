import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";

export interface Achievement {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  badge_emoji: string;
  badge_color: string;
  category: string;
  xp_reward: number;
  requirements: Record<string, any>;
  is_active: boolean;
  created_at: string;
}

export interface EarnedAchievement {
  id: string;
  driver_id: string;
  achievement_id: string;
  earned_at: string;
  xp_earned: number;
  achievement?: Achievement;
}

export interface GamificationStats {
  driver_id: string;
  organization_id: string;
  total_xp: number;
  current_level: number;
  current_streak_days: number;
  longest_streak_days: number;
  last_active_date: string | null;
  achievements_count: number;
  weekly_rank: number | null;
  monthly_rank: number | null;
  all_time_rank: number | null;
  perfect_trips: number;
  eco_score: number;
  reliability_score: number;
  updated_at: string;
}

export interface XPEntry {
  id: string;
  driver_id: string;
  xp_amount: number;
  reason: string;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
}

// Calculate level from XP
export const calculateLevel = (xp: number): number => {
  // Each level requires progressively more XP: Level N = N * 500 XP
  // Level 1: 0-499, Level 2: 500-1499, Level 3: 1500-2999, etc.
  let level = 1;
  let requiredXP = 0;
  while (requiredXP <= xp) {
    requiredXP += level * 500;
    if (requiredXP <= xp) level++;
  }
  return level;
};

// XP needed for next level
export const xpForNextLevel = (currentLevel: number): number => {
  let totalXP = 0;
  for (let i = 1; i <= currentLevel; i++) {
    totalXP += i * 500;
  }
  return totalXP;
};

// XP progress within current level
export const xpProgress = (totalXP: number, currentLevel: number): number => {
  const previousLevelTotal = xpForNextLevel(currentLevel - 1);
  const currentLevelTotal = xpForNextLevel(currentLevel);
  const xpInLevel = totalXP - previousLevelTotal;
  const xpNeeded = currentLevelTotal - previousLevelTotal;
  return Math.min(100, Math.round((xpInLevel / xpNeeded) * 100));
};

export const useDriverGamification = (driverId?: string) => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all achievements
  const { data: achievements = [], isLoading: achievementsLoading } = useQuery({
    queryKey: ["driver-achievements", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("driver_achievements")
        .select("*")
        .eq("is_active", true)
        .order("category", { ascending: true });
      if (error) throw error;
      return data as Achievement[];
    },
    enabled: !!organizationId,
  });

  // Fetch earned achievements for a driver
  const { data: earnedAchievements = [], isLoading: earnedLoading } = useQuery({
    queryKey: ["driver-earned-achievements", driverId],
    queryFn: async () => {
      if (!driverId) return [];
      const { data, error } = await (supabase as any)
        .from("driver_earned_achievements")
        .select(`
          *,
          achievement:achievement_id (*)
        `)
        .eq("driver_id", driverId)
        .order("earned_at", { ascending: false });
      if (error) throw error;
      return data as EarnedAchievement[];
    },
    enabled: !!driverId,
  });

  // Fetch gamification stats for a driver
  const { data: stats } = useQuery({
    queryKey: ["driver-gamification-stats", driverId],
    queryFn: async () => {
      if (!driverId) return null;
      const { data, error } = await (supabase as any)
        .from("driver_gamification_stats")
        .select("*")
        .eq("driver_id", driverId)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      return data as GamificationStats | null;
    },
    enabled: !!driverId,
  });

  // Fetch XP history for a driver
  const { data: xpHistory = [] } = useQuery({
    queryKey: ["driver-xp-history", driverId],
    queryFn: async () => {
      if (!driverId) return [];
      const { data, error } = await (supabase as any)
        .from("driver_xp_ledger")
        .select("*")
        .eq("driver_id", driverId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as XPEntry[];
    },
    enabled: !!driverId,
  });

  // Fetch leaderboard (all drivers with stats)
  const { data: leaderboard = [], isLoading: leaderboardLoading } = useQuery({
    queryKey: ["driver-leaderboard", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("driver_gamification_stats")
        .select(`
          *,
          driver:driver_id (
            id,
            first_name,
            last_name,
            avatar_url,
            safety_score
          )
        `)
        .order("total_xp", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  // Award XP to driver
  const awardXP = useMutation({
    mutationFn: async ({ 
      driverId, 
      amount, 
      reason, 
      referenceId, 
      referenceType 
    }: { 
      driverId: string; 
      amount: number; 
      reason: string; 
      referenceId?: string;
      referenceType?: string;
    }) => {
      if (!organizationId) throw new Error("No organization");
      
      // Add XP to ledger
      const { error: xpError } = await (supabase as any)
        .from("driver_xp_ledger")
        .insert({
          organization_id: organizationId,
          driver_id: driverId,
          xp_amount: amount,
          reason,
          reference_id: referenceId || null,
          reference_type: referenceType || null,
        });
      if (xpError) throw xpError;

      // Update or create gamification stats
      const { data: existingStats } = await (supabase as any)
        .from("driver_gamification_stats")
        .select("*")
        .eq("driver_id", driverId)
        .maybeSingle();

      if (existingStats) {
        const newTotalXP = existingStats.total_xp + amount;
        const newLevel = calculateLevel(newTotalXP);
        
        const { error: updateError } = await (supabase as any)
          .from("driver_gamification_stats")
          .update({
            total_xp: newTotalXP,
            current_level: newLevel,
            last_active_date: new Date().toISOString().split('T')[0],
            updated_at: new Date().toISOString(),
          })
          .eq("driver_id", driverId);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await (supabase as any)
          .from("driver_gamification_stats")
          .insert({
            driver_id: driverId,
            organization_id: organizationId,
            total_xp: amount,
            current_level: calculateLevel(amount),
            last_active_date: new Date().toISOString().split('T')[0],
          });
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-gamification-stats"] });
      queryClient.invalidateQueries({ queryKey: ["driver-xp-history"] });
      queryClient.invalidateQueries({ queryKey: ["driver-leaderboard"] });
      toast({ title: "XP awarded successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to award XP", description: error.message, variant: "destructive" });
    },
  });

  // Award achievement to driver
  const awardAchievement = useMutation({
    mutationFn: async ({ driverId, achievementId }: { driverId: string; achievementId: string }) => {
      if (!organizationId) throw new Error("No organization");
      
      const achievement = achievements.find(a => a.id === achievementId);
      if (!achievement) throw new Error("Achievement not found");

      // Check if already earned
      const { data: existing } = await (supabase as any)
        .from("driver_earned_achievements")
        .select("id")
        .eq("driver_id", driverId)
        .eq("achievement_id", achievementId)
        .maybeSingle();

      if (existing) throw new Error("Achievement already earned");

      // Award achievement
      const { error: achievementError } = await (supabase as any)
        .from("driver_earned_achievements")
        .insert({
          organization_id: organizationId,
          driver_id: driverId,
          achievement_id: achievementId,
          xp_earned: achievement.xp_reward,
        });
      if (achievementError) throw achievementError;

      // Award XP
      await awardXP.mutateAsync({
        driverId,
        amount: achievement.xp_reward,
        reason: "achievement_earned",
        referenceId: achievementId,
        referenceType: "achievement",
      });

      // Update achievements count
      const { error: statsError } = await (supabase as any)
        .from("driver_gamification_stats")
        .update({
          achievements_count: (await (supabase as any)
            .from("driver_earned_achievements")
            .select("*", { count: "exact", head: true })
            .eq("driver_id", driverId)).count || 0,
          updated_at: new Date().toISOString(),
        })
        .eq("driver_id", driverId);
      if (statsError) throw statsError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-earned-achievements"] });
      queryClient.invalidateQueries({ queryKey: ["driver-gamification-stats"] });
      toast({ title: "🏆 Achievement Unlocked!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to award achievement", description: error.message, variant: "destructive" });
    },
  });

  return {
    achievements,
    earnedAchievements,
    stats,
    xpHistory,
    leaderboard,
    isLoading: achievementsLoading || earnedLoading || leaderboardLoading,
    awardXP,
    awardAchievement,
    calculateLevel,
    xpForNextLevel,
    xpProgress,
  };
};
