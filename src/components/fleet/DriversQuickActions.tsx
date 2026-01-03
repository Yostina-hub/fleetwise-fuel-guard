import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Upload, Download, Activity, Award } from "lucide-react";

interface DriversQuickActionsProps {
  onAddDriver: () => void;
  onImport: () => void;
  onExport: () => void;
  onViewScoring: () => void;
  onViewCoaching?: () => void;
}

const DriversQuickActions = ({
  onAddDriver,
  onImport,
  onExport,
  onViewScoring,
  onViewCoaching,
}: DriversQuickActionsProps) => {
  const actions = [
    {
      label: "Add Driver",
      icon: Plus,
      onClick: onAddDriver,
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
      label: "Driver Scoring",
      icon: Activity,
      onClick: onViewScoring,
      variant: "outline" as const,
      className: "border-success/50 hover:bg-success/10",
    },
    {
      label: "Coaching",
      icon: Award,
      onClick: onViewCoaching,
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

export default DriversQuickActions;
