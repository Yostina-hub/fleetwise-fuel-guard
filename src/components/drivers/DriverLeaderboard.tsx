import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDriverGamification, xpProgress } from "@/hooks/useDriverGamification";
import { useDrivers } from "@/hooks/useDrivers";
import { 
  Trophy, 
  Medal, 
  Crown, 
  Flame, 
  Star, 
  TrendingUp, 
  TrendingDown,
  Minus,
  Zap,
  Target,
  Award,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

const getRankBadge = (rank: number) => {
  if (rank === 1) return { icon: Crown, color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/30" };
  if (rank === 2) return { icon: Medal, color: "text-gray-400", bg: "bg-gray-400/10 border-gray-400/30" };
  if (rank === 3) return { icon: Medal, color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/30" };
  return { icon: Star, color: "text-primary", bg: "bg-primary/10 border-primary/30" };
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

const getLevelColor = (level: number): string => {
  if (level <= 5) return "text-gray-500";
  if (level <= 10) return "text-green-500";
  if (level <= 20) return "text-blue-500";
  if (level <= 35) return "text-purple-500";
  if (level <= 50) return "text-orange-500";
  if (level <= 75) return "text-pink-500";
  return "text-yellow-500";
};

export const DriverLeaderboard = () => {
  const { leaderboard, isLoading } = useDriverGamification();
  const { drivers } = useDrivers();

  if (isLoading) {
    return (
      <Card className="glass-strong">
        <CardContent className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Map drivers with gamification stats
  const driversWithStats = drivers.map(driver => {
    const stats = leaderboard.find((s: any) => s.driver_id === driver.id);
    return {
      ...driver,
      stats: stats || {
        total_xp: 0,
        current_level: 1,
        current_streak_days: 0,
        achievements_count: 0,
        perfect_trips: 0,
      }
    };
  }).sort((a, b) => (b.stats?.total_xp || 0) - (a.stats?.total_xp || 0));

  const topThree = driversWithStats.slice(0, 3);
  const rest = driversWithStats.slice(3);

  return (
    <div className="space-y-6">
      {/* Top 3 Podium */}
      <Card className="glass-strong overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/20 via-yellow-500/20 to-orange-500/20 border-b">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-yellow-500" />
            <div>
              <CardTitle>Driver Leaderboard</CardTitle>
              <CardDescription>Top performers based on XP and achievements</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {topThree.length >= 3 ? (
            <div className="flex items-end justify-center gap-4 mb-8">
              {/* 2nd Place */}
              <div className="flex flex-col items-center">
                <Avatar className="w-16 h-16 border-4 border-gray-400 shadow-lg mb-2">
                  <AvatarImage src={topThree[1]?.avatar_url || undefined} />
                  <AvatarFallback className="text-lg bg-gray-400/20">
                    {topThree[1]?.first_name?.[0]}{topThree[1]?.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="w-20 h-24 bg-gradient-to-t from-gray-500/30 to-gray-400/10 rounded-t-lg flex flex-col items-center justify-center border border-gray-400/30">
                  <Medal className="w-6 h-6 text-gray-400 mb-1" />
                  <span className="text-2xl font-bold">2</span>
                </div>
                <div className="text-center mt-2">
                  <p className="font-semibold text-sm">{topThree[1]?.first_name} {topThree[1]?.last_name?.[0]}.</p>
                  <p className="text-xs text-muted-foreground">{topThree[1]?.stats?.total_xp?.toLocaleString() || 0} XP</p>
                </div>
              </div>

              {/* 1st Place */}
              <div className="flex flex-col items-center -mt-8">
                <div className="relative">
                  <Avatar className="w-20 h-20 border-4 border-yellow-400 shadow-xl mb-2">
                    <AvatarImage src={topThree[0]?.avatar_url || undefined} />
                    <AvatarFallback className="text-xl bg-yellow-400/20">
                      {topThree[0]?.first_name?.[0]}{topThree[0]?.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <Crown className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 text-yellow-400" />
                </div>
                <div className="w-24 h-32 bg-gradient-to-t from-yellow-500/30 to-yellow-400/10 rounded-t-lg flex flex-col items-center justify-center border border-yellow-400/30">
                  <Trophy className="w-8 h-8 text-yellow-500 mb-1" />
                  <span className="text-3xl font-bold">1</span>
                </div>
                <div className="text-center mt-2">
                  <p className="font-bold">{topThree[0]?.first_name} {topThree[0]?.last_name?.[0]}.</p>
                  <p className="text-sm text-yellow-500 font-semibold">{topThree[0]?.stats?.total_xp?.toLocaleString() || 0} XP</p>
                  <Badge className="bg-yellow-500/20 text-yellow-600 mt-1">
                    <Flame className="w-3 h-3 mr-1" />
                    Champion
                  </Badge>
                </div>
              </div>

              {/* 3rd Place */}
              <div className="flex flex-col items-center">
                <Avatar className="w-16 h-16 border-4 border-orange-400 shadow-lg mb-2">
                  <AvatarImage src={topThree[2]?.avatar_url || undefined} />
                  <AvatarFallback className="text-lg bg-orange-400/20">
                    {topThree[2]?.first_name?.[0]}{topThree[2]?.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="w-20 h-20 bg-gradient-to-t from-orange-500/30 to-orange-400/10 rounded-t-lg flex flex-col items-center justify-center border border-orange-400/30">
                  <Medal className="w-6 h-6 text-orange-400 mb-1" />
                  <span className="text-2xl font-bold">3</span>
                </div>
                <div className="text-center mt-2">
                  <p className="font-semibold text-sm">{topThree[2]?.first_name} {topThree[2]?.last_name?.[0]}.</p>
                  <p className="text-xs text-muted-foreground">{topThree[2]?.stats?.total_xp?.toLocaleString() || 0} XP</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Not enough drivers to show leaderboard</p>
            </div>
          )}

          {/* Rest of the leaderboard */}
          {rest.length > 0 && (
            <ScrollArea className="h-80">
              <div className="space-y-2">
                {rest.map((driver, index) => {
                  const rank = index + 4;
                  const level = driver.stats?.current_level || 1;
                  const progress = xpProgress(driver.stats?.total_xp || 0, level);

                  return (
                    <div 
                      key={driver.id}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-primary/20"
                    >
                      <span className="w-8 text-center font-bold text-muted-foreground">#{rank}</span>
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={driver.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {driver.first_name?.[0]}{driver.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{driver.first_name} {driver.last_name}</p>
                          <Badge variant="outline" className={cn("text-xs", getLevelColor(level))}>
                            Lv.{level} {getLevelTitle(level)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={progress} className="h-1.5 flex-1" />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {driver.stats?.total_xp?.toLocaleString() || 0} XP
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-center">
                          <div className="flex items-center gap-1">
                            <Flame className="w-4 h-4 text-orange-500" />
                            <span className="font-bold">{driver.stats?.current_streak_days || 0}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">Streak</span>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center gap-1">
                            <Award className="w-4 h-4 text-yellow-500" />
                            <span className="font-bold">{driver.stats?.achievements_count || 0}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">Badges</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Trophy className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{driversWithStats.filter(d => (d.stats?.total_xp || 0) > 0).length}</p>
                <p className="text-xs text-muted-foreground">Active Participants</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Flame className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {Math.max(...driversWithStats.map(d => d.stats?.current_streak_days || 0), 0)}
                </p>
                <p className="text-xs text-muted-foreground">Longest Streak</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Zap className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {driversWithStats.reduce((sum, d) => sum + (d.stats?.total_xp || 0), 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Total Fleet XP</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Target className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {driversWithStats.reduce((sum, d) => sum + (d.stats?.perfect_trips || 0), 0)}
                </p>
                <p className="text-xs text-muted-foreground">Perfect Trips</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
