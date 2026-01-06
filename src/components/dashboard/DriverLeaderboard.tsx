import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, TrendingUp, TrendingDown, Minus, Medal, AlertTriangle, Route } from "lucide-react";
import { DriverRanking } from "@/hooks/useExecutiveMetrics";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";

interface DriverLeaderboardProps {
  rankings: DriverRanking[];
  loading?: boolean;
}

const DriverLeaderboard = ({ rankings, loading }: DriverLeaderboardProps) => {
  const { formatDistance } = useOrganizationSettings();

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2: return <Medal className="w-5 h-5 text-gray-400" />;
      case 3: return <Medal className="w-5 h-5 text-amber-600" />;
      default: return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-success" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-destructive" />;
      default: return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-success bg-success/10';
    if (score >= 75) return 'text-primary bg-primary/10';
    if (score >= 60) return 'text-warning bg-warning/10';
    return 'text-destructive bg-destructive/10';
  };

  if (loading) {
    return (
      <Card className="glass-strong">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Driver Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-strong h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Driver Leaderboard
          </CardTitle>
          <Badge variant="outline" className="text-xs">Top 10</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {rankings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No driver data available
            </div>
          ) : (
            rankings.map((driver) => (
              <div
                key={driver.id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all hover:bg-muted/50 ${
                  driver.rank <= 3 ? 'bg-gradient-to-r from-warning/5 to-transparent' : ''
                }`}
              >
                <div className="w-8 flex justify-center">
                  {getRankBadge(driver.rank)}
                </div>
                
                <Avatar className="h-10 w-10">
                  <AvatarImage src={driver.avatar} alt={driver.name} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {driver.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{driver.name}</span>
                    {getTrendIcon(driver.trend)}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Route className="w-3 h-3" />
                      {driver.tripsCompleted} trips
                    </span>
                    <span>{formatDistance(driver.totalDistance)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {driver.violations > 0 && (
                    <Badge variant="destructive" className="text-xs gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {driver.violations}
                    </Badge>
                  )}
                  <div className={`px-3 py-1.5 rounded-full text-sm font-bold ${getScoreColor(driver.safetyScore)}`}>
                    {driver.safetyScore.toFixed(0)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DriverLeaderboard;
