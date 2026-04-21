import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, ClipboardCheck, Calendar, AlertTriangle } from "lucide-react";
import { Can } from "@/components/auth/Can";

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
  // Each entry declares the RBAC verb required to render the button.
  // Buttons are hidden (not disabled) when the user lacks the permission so
  // the toolbar stays compact for read-only roles like auditor.
  const actions = [
    {
      label: "New Work Order",
      icon: Plus,
      onClick: onNewWorkOrder,
      variant: "default" as const,
      className: "bg-primary hover:bg-primary/90",
      resource: "maintenance",
      action: "create",
    },
    {
      label: "Schedule Service",
      icon: Calendar,
      onClick: onScheduleService,
      variant: "outline" as const,
      className: "border-primary/50 hover:bg-primary/10",
      resource: "maintenance",
      action: "create",
    },
    {
      label: "Log Inspection",
      icon: ClipboardCheck,
      onClick: onNewInspection,
      variant: "outline" as const,
      className: "border-success/50 hover:bg-success/10",
      resource: "maintenance",
      action: "create",
    },
    {
      label: "View Overdue",
      icon: AlertTriangle,
      onClick: onViewOverdue,
      variant: "outline" as const,
      className: "border-destructive/50 hover:bg-destructive/10 text-destructive",
      // View-only — gated by read since auditors should still see this filter.
      resource: "maintenance",
      action: "read",
    },
  ];

  return (
    <Card className="glass-strong">
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-3">
          {actions.map((action) => (
            <Can key={action.label} resource={action.resource} action={action.action}>
              <Button
                variant={action.variant}
                className={`gap-2 ${action.className}`}
                onClick={action.onClick}
                aria-label={action.label}
              >
                <action.icon className="w-4 h-4" aria-hidden="true" />
                {action.label}
              </Button>
            </Can>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default MaintenanceQuickActions;
