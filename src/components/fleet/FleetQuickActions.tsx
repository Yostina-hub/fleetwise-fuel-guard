import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Upload, Download, Map, Wrench } from "lucide-react";

interface FleetQuickActionsProps {
  onAddVehicle: () => void;
  onImport: () => void;
  onExport: () => void;
  onViewMap: () => void;
  onScheduleMaintenance?: () => void;
}

const FleetQuickActions = ({
  onAddVehicle,
  onImport,
  onExport,
  onViewMap,
  onScheduleMaintenance,
}: FleetQuickActionsProps) => {
  const actions = [
    {
      label: "Add Vehicle",
      icon: Plus,
      onClick: onAddVehicle,
      variant: "default" as const,
      className: "bg-primary hover:bg-primary/90",
    },
    {
      label: "Import",
      icon: Upload,
      onClick: onImport,
      variant: "outline" as const,
      className: "border-primary/50 hover:bg-primary/10",
    },
    {
      label: "Export",
      icon: Download,
      onClick: onExport,
      variant: "outline" as const,
      className: "border-primary/50 hover:bg-primary/10",
    },
    {
      label: "Live Map",
      icon: Map,
      onClick: onViewMap,
      variant: "outline" as const,
      className: "border-success/50 hover:bg-success/10",
    },
    {
      label: "Maintenance",
      icon: Wrench,
      onClick: onScheduleMaintenance,
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

export default FleetQuickActions;
