import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, TrendingDown, Minus, Award, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DriverScore {
  id: string;
  driver_id: string;
  overall_score: number;
  speeding_score: number;
  braking_score: number;
  acceleration_score: number;
  idle_score: number;
  safety_rating: string;
  speed_violations: number;
  harsh_braking_events: number;
  harsh_acceleration_events: number;
  total_distance: number;
  total_drive_time: number;
  total_idle_time: number;
  trend: string;
  risk_factors: string[];
  recommendations: string[];
  score_period_start: string;
  score_period_end: string;
  driver?: { first_name: string; last_name: string } | null;
  vehicle?: { plate_number: string } | null;
}

interface DriverScoresTableProps {
  scores: DriverScore[];
}

const getTrendIcon = (trend: string | null) => {
  switch (trend) {
    case "improving":
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    case "declining":
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    default:
      return <Minus className="w-4 h-4 text-muted-foreground" />;
  }
};

const getScoreColor = (score: number) => {
  if (score >= 90) return "text-green-500";
  if (score >= 70) return "text-amber-500";
  return "text-red-500";
};

const getRatingBadge = (rating: string) => {
  switch (rating?.toLowerCase()) {
    case "excellent":
      return "bg-green-500/20 text-green-600";
    case "good":
      return "bg-blue-500/20 text-blue-600";
    case "average":
      return "bg-amber-500/20 text-amber-600";
    case "poor":
      return "bg-red-500/20 text-red-600";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export const DriverScoresTable = ({ scores }: DriverScoresTableProps) => {
  // Get latest score per driver
  const latestScores = Object.values(
    scores.reduce((acc, score) => {
      if (!acc[score.driver_id] || 
          new Date(score.score_period_end) > new Date(acc[score.driver_id].score_period_end)) {
        acc[score.driver_id] = score;
      }
      return acc;
    }, {} as Record<string, DriverScore>)
  ).sort((a, b) => b.overall_score - a.overall_score);

  const avgScore = latestScores.length > 0
    ? latestScores.reduce((sum, s) => sum + s.overall_score, 0) / latestScores.length
    : 0;
  const topPerformers = latestScores.filter(s => s.overall_score >= 90).length;
  const needsCoaching = latestScores.filter(s => s.overall_score < 70).length;

  if (latestScores.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No Driver Scores</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            No driver behavior scores available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Drivers Scored</div>
            <div className="text-2xl font-bold text-foreground">{latestScores.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Average Score</div>
            <div className={cn("text-2xl font-bold", getScoreColor(avgScore))}>
              {avgScore.toFixed(0)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Top Performers</div>
              <div className="text-2xl font-bold text-green-500">{topPerformers}</div>
            </div>
            <Award className="w-8 h-8 text-green-500/30" />
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Needs Coaching</div>
              <div className="text-2xl font-bold text-amber-500">{needsCoaching}</div>
            </div>
            <AlertTriangle className="w-8 h-8 text-amber-500/30" />
          </CardContent>
        </Card>
      </div>

      {/* Scores Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-primary" />
            Driver Behavior Scores
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-y">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Driver</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Overall</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Rating</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Speed</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Braking</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Acceleration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Violations</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Trend</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Period</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {latestScores.map((score, index) => (
                  <tr key={score.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                        index === 0 ? "bg-amber-500 text-white" :
                        index === 1 ? "bg-gray-400 text-white" :
                        index === 2 ? "bg-amber-700 text-white" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {score.driver ? `${score.driver.first_name} ${score.driver.last_name}` : "Unknown Driver"}
                      </div>
                      {score.vehicle?.plate_number && (
                        <div className="text-xs text-muted-foreground">{score.vehicle.plate_number}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xl font-bold", getScoreColor(score.overall_score))}>
                        {score.overall_score}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium capitalize",
                        getRatingBadge(score.safety_rating)
                      )}>
                        {score.safety_rating}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("font-medium", getScoreColor(score.speeding_score))}>
                        {score.speeding_score}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("font-medium", getScoreColor(score.braking_score))}>
                        {score.braking_score}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("font-medium", getScoreColor(score.acceleration_score))}>
                        {score.acceleration_score}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-col gap-1 text-xs">
                        <span>Speed: {score.speed_violations}</span>
                        <span>Brake: {score.harsh_braking_events}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {getTrendIcon(score.trend)}
                        <span className="text-xs capitalize">{score.trend || "stable"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {format(new Date(score.score_period_start), "MMM dd")} - 
                      {format(new Date(score.score_period_end), "MMM dd")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
