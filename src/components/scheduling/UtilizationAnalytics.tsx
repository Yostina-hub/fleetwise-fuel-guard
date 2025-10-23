import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { addDays } from "date-fns";

export const UtilizationAnalytics = () => {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["utilization-analytics"],
    queryFn: async () => {
      const now = new Date();
      const last7Days = addDays(now, -7);
      const last14Days = addDays(now, -14);

      // Get all active vehicles
      const { data: vehicles } = await supabase
        .from("vehicles" as any)
        .select("id, plate_number")
        .eq("status", "active");

      // Get assignments for last 7 days
      const { data: recentAssignments } = await supabase
        .from("trip_assignments" as any)
        .select("vehicle_id, created_at")
        .gte("created_at", last7Days.toISOString());

      // Get assignments for previous 7 days (for comparison)
      const { data: previousAssignments } = await supabase
        .from("trip_assignments" as any)
        .select("vehicle_id, created_at")
        .gte("created_at", last14Days.toISOString())
        .lt("created_at", last7Days.toISOString());

      // Calculate utilization per vehicle
      const vehicleUtil = (vehicles || []).map((vehicle: any) => {
        const recentCount = recentAssignments?.filter((a: any) => a.vehicle_id === vehicle.id).length || 0;
        const previousCount = previousAssignments?.filter((a: any) => a.vehicle_id === vehicle.id).length || 0;
        
        // Utilization percentage (out of 7 days, assuming max 1 trip per day)
        const utilization = (recentCount / 7) * 100;
        const previousUtil = (previousCount / 7) * 100;
        const trend = utilization - previousUtil;

        return {
          ...vehicle,
          utilization: Math.round(utilization),
          trend: Math.round(trend),
          tripCount: recentCount,
        };
      });

      // Sort by utilization
      vehicleUtil.sort((a, b) => b.utilization - a.utilization);

      // Calculate overall metrics
      const avgUtilization = vehicleUtil.reduce((sum, v) => sum + v.utilization, 0) / (vehicleUtil.length || 1);
      const underutilized = vehicleUtil.filter(v => v.utilization < 30).length;
      const overutilized = vehicleUtil.filter(v => v.utilization > 70).length;

      return {
        vehicles: vehicleUtil,
        avgUtilization: Math.round(avgUtilization),
        underutilized,
        overutilized,
        totalVehicles: vehicleUtil.length,
      };
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading analytics...</div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.avgUtilization}%</div>
            <Progress value={analytics.avgUtilization} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Underutilized
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {analytics.underutilized}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {"<"}30% utilization
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              High Demand
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {analytics.overutilized}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {">"}70% utilization
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Vehicles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{analytics.totalVehicles}</div>
            <div className="text-xs text-muted-foreground mt-2">Active fleet</div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Utilization Table */}
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Utilization (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.vehicles.slice(0, 15).map((vehicle: any) => (
              <div key={vehicle.id} className="flex items-center gap-4">
                <div className="flex-shrink-0 w-32 font-medium text-sm">
                  {vehicle.plate_number}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Progress value={vehicle.utilization} className="flex-1" />
                    <span className="text-sm font-medium w-12 text-right">
                      {vehicle.utilization}%
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {vehicle.tripCount} trips
                  </div>
                </div>

                <div className="flex-shrink-0 w-16">
                  {vehicle.trend > 0 && (
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <TrendingUp className="w-3 h-3" />
                      +{vehicle.trend}%
                    </div>
                  )}
                  {vehicle.trend < 0 && (
                    <div className="flex items-center gap-1 text-red-600 text-xs">
                      <TrendingDown className="w-3 h-3" />
                      {vehicle.trend}%
                    </div>
                  )}
                  {vehicle.trend === 0 && (
                    <div className="flex items-center gap-1 text-muted-foreground text-xs">
                      <Minus className="w-3 h-3" />
                      0%
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {analytics.vehicles.length > 15 && (
            <div className="text-center text-sm text-muted-foreground mt-4">
              +{analytics.vehicles.length - 15} more vehicles
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
