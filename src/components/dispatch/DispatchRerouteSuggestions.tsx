import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navigation, Zap, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { useDriverCoachingQueue } from "@/hooks/useDriverCoachingQueue";
import { useVehicles } from "@/hooks/useVehicles";
import { useDrivers } from "@/hooks/useDrivers";

/**
 * Surfaces open idle-time coaching items with re-route suggestions
 * for the dispatch board. Helps dispatchers re-plan routes for
 * vehicles flagged for excessive idle exposure.
 */
export const DispatchRerouteSuggestions = () => {
  const navigate = useNavigate();
  const { items, loading } = useDriverCoachingQueue({ status: "open", limit: 50 });
  const { vehicles } = useVehicles();
  const { drivers } = useDrivers();

  const suggestions = useMemo(
    () =>
      items.filter(
        (i) => i.suggested_assignment_id && i.reroute_suggestion && i.source_type === "idle_time",
      ),
    [items],
  );

  if (loading || suggestions.length === 0) return null;

  const driverName = (id: string | null) => {
    if (!id) return "Unassigned";
    const d = drivers.find((x) => x.id === id);
    return d ? `${d.first_name} ${d.last_name}` : "Unknown";
  };
  const plate = (id: string | null) => {
    if (!id) return "—";
    const v = vehicles.find((x) => x.id === id);
    return v?.license_plate || v?.vehicle_number || id.slice(0, 8);
  };

  return (
    <Card className="border-info/40">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Navigation className="h-4 w-4 text-info" />
            Re-route Suggestions ({suggestions.length})
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Idle-time coaching flagged these active assignments for re-planning.
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => navigate("/driver-safety")}
          className="text-xs"
        >
          Coaching queue <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {suggestions.slice(0, 5).map((s) => (
          <div
            key={s.id}
            className="flex items-start justify-between gap-3 border border-border rounded-lg p-3 bg-info/5"
          >
            <div className="flex items-start gap-2 min-w-0 flex-1">
              <Zap className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium flex items-center gap-2 flex-wrap">
                  {s.title}
                  <Badge variant="outline" className="text-xs">
                    {plate(s.vehicle_id)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    · {driverName(s.driver_id)}
                  </span>
                </div>
                <div className="text-xs text-info mt-1">{s.reroute_suggestion}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                </div>
              </div>
            </div>
          </div>
        ))}
        {suggestions.length > 5 && (
          <div className="text-xs text-muted-foreground text-center pt-1">
            +{suggestions.length - 5} more in coaching queue
          </div>
        )}
      </CardContent>
    </Card>
  );
};
