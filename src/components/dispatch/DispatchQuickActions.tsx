import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Truck, MapPin, Clock, FileText } from "lucide-react";

interface DispatchQuickActionsProps {
  onNewJob: () => void;
  onAssignDriver: () => void;
  onViewMap: () => void;
  onViewPending: () => void;
}

const DispatchQuickActions = ({
  onNewJob,
  onAssignDriver,
  onViewMap,
  onViewPending,
}: DispatchQuickActionsProps) => {
  const actions = [
    {
      label: "New Job",
      icon: Plus,
      onClick: onNewJob,
      variant: "default" as const,
      className: "bg-primary hover:bg-primary/90",
    },
    {
      label: "Assign Driver",
      icon: Truck,
      onClick: onAssignDriver,
      variant: "outline" as const,
      className: "border-primary/50 hover:bg-primary/10",
    },
    {
      label: "View Live Map",
      icon: MapPin,
      onClick: onViewMap,
      variant: "outline" as const,
      className: "border-success/50 hover:bg-success/10",
    },
    {
      label: "Pending Jobs",
      icon: Clock,
      onClick: onViewPending,
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

export default DispatchQuickActions;
