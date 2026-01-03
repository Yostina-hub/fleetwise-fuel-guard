import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, CheckCircle, Calendar, FileText } from "lucide-react";

interface SchedulingQuickActionsProps {
  onCreateRequest: () => void;
  onApproveAll: () => void;
  onViewCalendar: () => void;
  onExportSchedule: () => void;
}

const SchedulingQuickActions = ({
  onCreateRequest,
  onApproveAll,
  onViewCalendar,
  onExportSchedule
}: SchedulingQuickActionsProps) => {
  const actions = [
    {
      label: "New Trip Request",
      icon: Plus,
      onClick: onCreateRequest,
      variant: "default" as const
    },
    {
      label: "Approve Pending",
      icon: CheckCircle,
      onClick: onApproveAll,
      variant: "outline" as const
    },
    {
      label: "View Calendar",
      icon: Calendar,
      onClick: onViewCalendar,
      variant: "outline" as const
    },
    {
      label: "Export Schedule",
      icon: FileText,
      onClick: onExportSchedule,
      variant: "outline" as const
    }
  ];

  return (
    <Card className="glass-strong">
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant={action.variant}
              size="sm"
              onClick={action.onClick}
              className="gap-2"
              aria-label={action.label}
            >
              <action.icon className="h-4 w-4" aria-hidden="true" />
              {action.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SchedulingQuickActions;
