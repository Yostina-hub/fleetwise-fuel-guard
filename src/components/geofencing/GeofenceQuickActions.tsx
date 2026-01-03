import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, MapPin, Bell, History, Settings } from "lucide-react";

interface GeofenceQuickActionsProps {
  onNewGeofence: () => void;
  onViewEvents: () => void;
  onConfigureAlerts: () => void;
  onViewMap: () => void;
}

const GeofenceQuickActions = ({
  onNewGeofence,
  onViewEvents,
  onConfigureAlerts,
  onViewMap,
}: GeofenceQuickActionsProps) => {
  const actions = [
    {
      label: "New Geofence",
      icon: Plus,
      onClick: onNewGeofence,
      variant: "default" as const,
      className: "bg-primary hover:bg-primary/90",
    },
    {
      label: "View Map",
      icon: MapPin,
      onClick: onViewMap,
      variant: "outline" as const,
      className: "border-primary/50 hover:bg-primary/10",
    },
    {
      label: "Event History",
      icon: History,
      onClick: onViewEvents,
      variant: "outline" as const,
      className: "border-success/50 hover:bg-success/10",
    },
    {
      label: "Alert Settings",
      icon: Bell,
      onClick: onConfigureAlerts,
      variant: "outline" as const,
      className: "border-warning/50 hover:bg-warning/10",
    },
  ];

  return (
    <Card className="glass-strong">
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-3">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant={action.variant}
              className={`gap-2 ${action.className}`}
              onClick={action.onClick}
              aria-label={action.label}
            >
              <action.icon className="w-4 h-4" aria-hidden="true" />
              {action.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default GeofenceQuickActions;
