import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, ClipboardCheck, Calendar, FileText, Wrench, AlertTriangle } from "lucide-react";

interface MaintenanceQuickActionsProps {
  onNewWorkOrder: () => void;
  onScheduleService: () => void;
  onNewInspection: () => void;
  onViewOverdue?: () => void;
}

const MaintenanceQuickActions = ({
  onNewWorkOrder,
  onScheduleService,
  onNewInspection,
  onViewOverdue,
}: MaintenanceQuickActionsProps) => {
  const actions = [
    {
      label: "New Work Order",
      icon: Plus,
      onClick: onNewWorkOrder,
      variant: "default" as const,
      className: "bg-primary hover:bg-primary/90",
    },
    {
      label: "Schedule Service",
      icon: Calendar,
      onClick: onScheduleService,
      variant: "outline" as const,
      className: "border-primary/50 hover:bg-primary/10",
    },
    {
      label: "Log Inspection",
      icon: ClipboardCheck,
      onClick: onNewInspection,
      variant: "outline" as const,
      className: "border-success/50 hover:bg-success/10",
    },
    {
      label: "View Overdue",
      icon: AlertTriangle,
      onClick: onViewOverdue,
      variant: "outline" as const,
      className: "border-destructive/50 hover:bg-destructive/10 text-destructive",
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

export default MaintenanceQuickActions;
