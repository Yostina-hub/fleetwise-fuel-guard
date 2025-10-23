import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, Calendar, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { addHours, format } from "date-fns";

export const SchedulingAssistant = () => {
  // Fetch insights and suggestions
  const { data: insights } = useQuery({
    queryKey: ["scheduling-insights"],
    queryFn: async () => {
      // Get pending approved requests
      const { data: requests } = await supabase
        .from("trip_requests" as any)
        .select("*, trip_assignments(*)")
        .eq("status", "approved");

      const unassigned = requests?.filter((r: any) => !r.trip_assignments || r.trip_assignments.length === 0) || [];

      // Get utilization data
      const { data: vehicles } = await supabase
        .from("vehicles" as any)
        .select("id, plate_number")
        .eq("status", "active");

      const { data: assignments } = await supabase
        .from("trip_assignments" as any)
        .select("vehicle_id")
        .gte("created_at", addHours(new Date(), -24 * 7).toISOString());

      const utilizationMap: Record<string, number> = {};
      assignments?.forEach((a: any) => {
        utilizationMap[a.vehicle_id] = (utilizationMap[a.vehicle_id] || 0) + 1;
      });

      const underutilized = vehicles?.filter((v: any) => (utilizationMap[v.id] || 0) < 3) || [];

      return {
        unassignedRequests: unassigned.length,
        underutilizedVehicles: underutilized.length,
        suggestions: [
          ...(unassigned.length > 0 ? [{
            type: 'warning',
            message: `${unassigned.length} approved request(s) need vehicle assignment`,
            action: 'Assign vehicles to these requests to avoid delays',
          }] : []),
          ...(underutilized.length > 0 ? [{
            type: 'info',
            message: `${underutilized.length} vehicle(s) are underutilized this week`,
            action: 'Consider using these vehicles for upcoming trips',
          }] : []),
        ],
      };
    },
    refetchInterval: 60000, // Refresh every minute
  });

  if (!insights || insights.suggestions.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Scheduling Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.suggestions.map((suggestion: any, index: number) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 rounded-lg bg-background border"
          >
            {suggestion.type === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />}
            {suggestion.type === 'info' && <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />}
            
            <div className="flex-1">
              <div className="font-medium text-sm mb-1">{suggestion.message}</div>
              <div className="text-xs text-muted-foreground">{suggestion.action}</div>
            </div>
          </div>
        ))}

        <div className="flex items-center gap-2 pt-2 border-t">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Last updated: {format(new Date(), "HH:mm")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
