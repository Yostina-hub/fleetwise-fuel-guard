import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Trophy, 
  Medal,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  Users
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Skeleton } from "@/components/ui/skeleton";

interface DriverScore {
  driver_id: string;
  driver_name: string;
  compliance_score: number;
  violations_count: number;
  trend: "up" | "down" | "stable";
  total_distance_km: number;
}

export const DriverSpeedLeaderboard = () => {
  const { organizationId } = useOrganization();
  const [showAll, setShowAll] = useState(false);

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ["driver-speed-leaderboard", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      // Fetch drivers with their violation counts
      const { data: drivers, error: driversError } = await supabase
        .from("drivers")
        .select("id, first_name, last_name, total_distance_km")
        .eq("organization_id", organizationId)
        .eq("status", "active")
        .limit(20);

      if (driversError) throw driversError;

      // Fetch violation counts for each driver (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const driverScores: DriverScore[] = await Promise.all(
        (drivers || []).map(async (driver) => {
          const { count: violationsCount } = await supabase
            .from("speed_violations")
            .select("*", { count: "exact", head: true })
            .eq("driver_id", driver.id)
            .gte("violation_time", thirtyDaysAgo.toISOString());

          // Calculate compliance score (100 - violations penalty)
          const violationPenalty = Math.min((violationsCount || 0) * 5, 50);
          const complianceScore = Math.max(100 - violationPenalty, 50);

          // Determine trend (randomly for now, should be based on historical data)
          const trends: Array<"up" | "down" | "stable"> = ["up", "down", "stable"];
          const trend = (violationsCount || 0) === 0 ? "up" : 
                       (violationsCount || 0) > 5 ? "down" : "stable";

          return {
            driver_id: driver.id,
            driver_name: `${driver.first_name} ${driver.last_name}`,
            compliance_score: complianceScore,
            violations_count: violationsCount || 0,
            trend,
            total_distance_km: driver.total_distance_km || 0
          };
        })
      );

      // Sort by compliance score descending
      return driverScores.sort((a, b) => b.compliance_score - a.compliance_score);
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  const displayedDrivers = showAll ? leaderboard : leaderboard?.slice(0, 5);

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" aria-hidden="true" />;
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" aria-hidden="true" />;
    if (index === 2) return <Medal className="h-5 w-5 text-amber-600" aria-hidden="true" />;
    return <span className="w-5 text-center font-bold text-muted-foreground">{index + 1}</span>;
  };

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    if (trend === "up") return <TrendingUp className="h-4 w-4 text-green-500" aria-hidden="true" />;
    if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-500" aria-hidden="true" />;
    return <Minus className="h-4 w-4 text-gray-400" aria-hidden="true" />;
  };

  const getScoreBadge = (score: number) => {
    if (score >= 95) return <Badge className="bg-green-600">Excellent</Badge>;
    if (score >= 85) return <Badge className="bg-blue-600">Good</Badge>;
    if (score >= 70) return <Badge variant="secondary">Fair</Badge>;
    return <Badge variant="destructive">Needs Improvement</Badge>;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-1.5 rounded-lg bg-yellow-500/10">
                <Trophy className="h-4 w-4 text-yellow-600" aria-hidden="true" />
              </div>
              Speed Compliance Leaderboard
            </CardTitle>
            <CardDescription>
              Top drivers by speed compliance this month
            </CardDescription>
          </div>
          <Badge variant="outline" className="gap-1">
            <Users className="h-3 w-3" aria-hidden="true" />
            {leaderboard?.length || 0} Drivers
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16 ml-auto" />
              </div>
            ))}
          </div>
        ) : !displayedDrivers || displayedDrivers.length === 0 ? (
          <div className="text-center py-8" role="status" aria-label="No drivers found">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" aria-hidden="true" />
            <p className="text-muted-foreground">No driver data available</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayedDrivers.map((driver, index) => (
              <div
                key={driver.driver_id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-muted/50 ${
                  index === 0 ? "bg-yellow-500/5 border border-yellow-500/20" : "bg-muted/30"
                }`}
              >
                <div className="flex items-center justify-center w-8">
                  {getRankIcon(index)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{driver.driver_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {driver.violations_count} violations • {driver.total_distance_km.toFixed(0)} km
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getTrendIcon(driver.trend)}
                  <div className="text-right">
                    <p className="font-bold text-lg">{driver.compliance_score}%</p>
                  </div>
                  {getScoreBadge(driver.compliance_score)}
                </div>
              </div>
            ))}

            {leaderboard && leaderboard.length > 5 && (
              <Button
                variant="ghost"
                className="w-full mt-2"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? "Show Less" : `View All ${leaderboard.length} Drivers`}
                <ChevronRight className={`h-4 w-4 ml-1 transition-transform ${showAll ? "rotate-90" : ""}`} aria-hidden="true" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
