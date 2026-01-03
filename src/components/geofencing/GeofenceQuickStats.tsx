import { Card, CardContent } from "@/components/ui/card";
import { MapPin, AlertTriangle, Bell, CheckCircle, Clock, Target } from "lucide-react";

interface GeofenceQuickStatsProps {
  totalGeofences: number;
  activeGeofences: number;
  eventsToday: number;
  entryEvents: number;
  exitEvents: number;
  dwellAlerts: number;
}

const GeofenceQuickStats = ({
  totalGeofences,
  activeGeofences,
  eventsToday,
  entryEvents,
  exitEvents,
  dwellAlerts,
}: GeofenceQuickStatsProps) => {
  const stats = [
    {
      label: "Total Geofences",
      value: totalGeofences.toString(),
      icon: MapPin,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Active",
      value: activeGeofences.toString(),
      icon: CheckCircle,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Events Today",
      value: eventsToday.toString(),
      icon: Bell,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      label: "Entries",
      value: entryEvents.toString(),
      icon: Target,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Exits",
      value: exitEvents.toString(),
      icon: Clock,
      color: "text-muted-foreground",
      bgColor: "bg-muted/50",
    },
    {
      label: "Dwell Alerts",
      value: dwellAlerts.toString(),
      icon: AlertTriangle,
      color: dwellAlerts > 0 ? "text-destructive" : "text-success",
      bgColor: dwellAlerts > 0 ? "bg-destructive/10" : "bg-success/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="glass-strong hover:scale-[1.02] transition-transform duration-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default GeofenceQuickStats;
