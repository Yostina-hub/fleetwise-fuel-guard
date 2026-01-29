import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import { Trophy, Medal, Star, TrendingUp, TrendingDown, Minus, Route, AlertTriangle, Flame } from "lucide-react";
import { DriverRanking } from "@/hooks/useExecutiveMetrics";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import AnimatedMetricRing from "./AnimatedMetricRing";

interface DriverPerformanceCardProps {
  rankings: DriverRanking[];
  loading?: boolean;
}

const DriverPerformanceCard = ({ rankings, loading }: DriverPerformanceCardProps) => {
  const { formatDistance } = useOrganizationSettings();

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2: return <Medal className="w-5 h-5 text-gray-400" />;
      case 3: return <Medal className="w-5 h-5 text-amber-600" />;
      default: return <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-muted-foreground bg-muted rounded-full">#{rank}</span>;
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-3 h-3 text-success" />;
      case 'down': return <TrendingDown className="w-3 h-3 text-destructive" />;
      default: return <Minus className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'hsl(var(--success))';
    if (score >= 75) return 'hsl(var(--primary))';
    if (score >= 60) return 'hsl(var(--warning))';
    return 'hsl(var(--destructive))';
  };

  const topDriver = rankings[0];
  const avgScore = rankings.length > 0 
    ? rankings.reduce((sum, r) => sum + r.safetyScore, 0) / rankings.length 
    : 0;

  if (loading) {
    return (
      <Card className="bg-[#1a2332] border-[#2a3a4d]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Driver Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] bg-white/10 rounded-lg animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#1a2332] border-[#2a3a4d] h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Driver Performance
          </CardTitle>
          <Badge variant="outline" className="gap-1 bg-orange-500/20 text-orange-400 border-orange-500/50">
            <Flame className="w-3 h-3 text-orange-500" />
            Top 10
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Top Driver Highlight */}
        {topDriver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-transparent border border-yellow-500/20"
          >
            <div className="absolute top-2 right-2">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            </div>
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 ring-2 ring-yellow-500/50">
                <AvatarImage src={topDriver.avatar} alt={topDriver.name} />
                <AvatarFallback className="bg-yellow-500/20 text-yellow-600 text-lg font-bold">
                  {topDriver.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-white">{topDriver.name}</h4>
                  <Badge variant="secondary" className="text-xs bg-yellow-500/20 text-yellow-400 border-yellow-500/50">MVP</Badge>
                </div>
                <p className="text-sm text-white/60">
                  {topDriver.tripsCompleted} trips · {formatDistance(topDriver.totalDistance)}
                </p>
              </div>
              <AnimatedMetricRing
                value={topDriver.safetyScore}
                size={64}
                strokeWidth={6}
                color="hsl(var(--success))"
                suffix=""
              />
            </div>
          </motion.div>
        )}

        {/* Fleet Average */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-[#0d1520]">
          <span className="text-sm text-white/60">Fleet Average Score</span>
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 rounded-full bg-[#2a3a4d] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${avgScore}%` }}
                transition={{ duration: 1, delay: 0.5 }}
                className="h-full rounded-full"
                style={{ backgroundColor: getScoreColor(avgScore) }}
              />
            </div>
            <span className="font-bold text-white">{avgScore.toFixed(0)}</span>
          </div>
        </div>

        {/* Leaderboard */}
        <ScrollArea className="h-[280px]">
          <div className="space-y-2 pr-2">
            {rankings.map((driver, index) => (
              <motion.div
                key={driver.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all hover:bg-[#0d1520] ${
                  driver.rank <= 3 ? 'bg-gradient-to-r from-primary/10 to-transparent' : ''
                }`}
              >
                <div className="w-8 flex justify-center">
                  {getRankIcon(driver.rank)}
                </div>
                
                <Avatar className="h-9 w-9">
                  <AvatarImage src={driver.avatar} alt={driver.name} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xs">
                    {driver.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate text-white">{driver.name}</span>
                    {getTrendIcon(driver.trend)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/60">
                    <span className="flex items-center gap-1">
                      <Route className="w-3 h-3" />
                      {driver.tripsCompleted}
                    </span>
                    {driver.violations > 0 && (
                      <Badge variant="destructive" className="text-xs h-4 px-1">
                        <AlertTriangle className="w-2 h-2 mr-0.5" />
                        {driver.violations}
                      </Badge>
                    )}
                  </div>
                </div>

                <div 
                  className="w-12 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
                  style={{ 
                    backgroundColor: `${getScoreColor(driver.safetyScore)}20`,
                    color: getScoreColor(driver.safetyScore)
                  }}
                >
                  {driver.safetyScore.toFixed(0)}
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default DriverPerformanceCard;
