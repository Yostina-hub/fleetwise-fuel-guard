import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useDriverGamification, xpProgress, xpForNextLevel, Achievement, EarnedAchievement } from "@/hooks/useDriverGamification";
import { 
  Trophy, 
  Star, 
  Lock, 
  CheckCircle,
  Flame,
  Zap,
  Target,
  Award,
  Loader2,
  Sparkles,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DriverAchievementsPanelProps {
  driverId: string;
  driverName: string;
}

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'safety': return 'bg-green-500/10 text-green-500 border-green-500/30';
    case 'efficiency': return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
    case 'consistency': return 'bg-purple-500/10 text-purple-500 border-purple-500/30';
    case 'milestone': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
    default: return 'bg-primary/10 text-primary border-primary/30';
  }
};

const getLevelTitle = (level: number): string => {
  if (level <= 5) return "Rookie";
  if (level <= 10) return "Apprentice";
  if (level <= 20) return "Professional";
  if (level <= 35) return "Expert";
  if (level <= 50) return "Master";
  if (level <= 75) return "Elite";
  return "Legend";
};

export const DriverAchievementsPanel = ({ driverId, driverName }: DriverAchievementsPanelProps) => {
  const { 
    achievements, 
    earnedAchievements, 
    stats, 
    xpHistory,
    isLoading,
  } = useDriverGamification(driverId);

  if (isLoading) {
    return (
      <Card className="glass-strong">
        <CardContent className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const earnedIds = new Set(earnedAchievements.map(e => e.achievement_id));
  const totalXP = stats?.total_xp || 0;
  const currentLevel = stats?.current_level || 1;
  const progress = xpProgress(totalXP, currentLevel);
  const nextLevelXP = xpForNextLevel(currentLevel);
  const prevLevelXP = xpForNextLevel(currentLevel - 1);
  const xpInLevel = totalXP - prevLevelXP;
  const xpNeeded = nextLevelXP - prevLevelXP;

  return (
    <div className="space-y-6">
      {/* XP & Level Card */}
      <Card className="glass-strong overflow-hidden">
        <div className="bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">{driverName}</h3>
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/20 text-primary border-primary/30">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Level {currentLevel} - {getLevelTitle(currentLevel)}
                </Badge>
                {(stats?.current_streak_days || 0) > 0 && (
                  <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">
                    <Flame className="w-3 h-3 mr-1" />
                    {stats?.current_streak_days} Day Streak
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">{totalXP.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total XP</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Progress to Level {currentLevel + 1}</span>
              <span className="text-muted-foreground">{xpInLevel} / {xpNeeded} XP</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>
        </div>

        <CardContent className="pt-4">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-yellow-500">{stats?.achievements_count || 0}</div>
              <div className="text-xs text-muted-foreground">Achievements</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-500">{stats?.perfect_trips || 0}</div>
              <div className="text-xs text-muted-foreground">Perfect Trips</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-500">{(stats?.eco_score || 0).toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">Eco Score</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-500">{(stats?.reliability_score || 0).toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">Reliability</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievements Grid */}
      <Card className="glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <CardTitle>Achievements</CardTitle>
            </div>
            <Badge variant="outline">
              {earnedAchievements.length} / {achievements.length} Unlocked
            </Badge>
          </div>
          <CardDescription>Collect badges by completing challenges and milestones</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <TooltipProvider>
              {achievements.map((achievement) => {
                const isEarned = earnedIds.has(achievement.id);
                const earnedData = earnedAchievements.find(e => e.achievement_id === achievement.id);

                return (
                  <Tooltip key={achievement.id}>
                    <TooltipTrigger asChild>
                      <div 
                        className={cn(
                          "relative p-4 rounded-xl border-2 text-center transition-all cursor-pointer hover:scale-105",
                          isEarned 
                            ? "bg-gradient-to-b from-yellow-500/10 to-transparent border-yellow-500/40 shadow-lg shadow-yellow-500/10" 
                            : "bg-muted/30 border-muted-foreground/20 opacity-60 grayscale"
                        )}
                      >
                        {isEarned && (
                          <div className="absolute -top-2 -right-2">
                            <CheckCircle className="w-5 h-5 text-green-500 fill-green-500" />
                          </div>
                        )}
                        <div className="text-4xl mb-2">
                          {isEarned ? achievement.badge_emoji : '🔒'}
                        </div>
                        <p className="text-xs font-semibold truncate">{achievement.name}</p>
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs mt-2", getCategoryColor(achievement.category))}
                        >
                          +{achievement.xp_reward} XP
                        </Badge>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <div className="space-y-1">
                        <p className="font-semibold">{achievement.badge_emoji} {achievement.name}</p>
                        <p className="text-sm text-muted-foreground">{achievement.description}</p>
                        <Badge className={getCategoryColor(achievement.category)}>
                          {achievement.category}
                        </Badge>
                        {isEarned && earnedData && (
                          <p className="text-xs text-green-500 mt-2">
                            ✓ Earned on {format(new Date(earnedData.earned_at), "MMM d, yyyy")}
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>

      {/* Recent XP Activity */}
      <Card className="glass">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-500" />
            <CardTitle>Recent XP Activity</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {xpHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No XP activity yet</p>
            </div>
          ) : (
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {xpHistory.slice(0, 10).map((entry) => (
                  <div 
                    key={entry.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        entry.xp_amount > 0 ? "bg-green-500/10" : "bg-red-500/10"
                      )}>
                        {entry.xp_amount > 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium capitalize">
                          {entry.reason.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(entry.created_at), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>
                    <Badge className={entry.xp_amount > 0 ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}>
                      {entry.xp_amount > 0 ? '+' : ''}{entry.xp_amount} XP
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
