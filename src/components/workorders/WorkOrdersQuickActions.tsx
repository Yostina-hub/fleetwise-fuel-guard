import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Package, AlertTriangle, FileText } from "lucide-react";

interface WorkOrdersQuickActionsProps {
  onCreateOrder: () => void;
  onOrderParts: () => void;
  onViewOverdue: () => void;
  onExportReport: () => void;
}

const WorkOrdersQuickActions = ({
  onCreateOrder,
  onOrderParts,
  onViewOverdue,
  onExportReport
}: WorkOrdersQuickActionsProps) => {
  const actions = [
    {
      label: "Create Work Order",
      icon: Plus,
      onClick: onCreateOrder,
      variant: "default" as const
    },
    {
      label: "Order Parts",
      icon: Package,
      onClick: onOrderParts,
      variant: "outline" as const
    },
    {
      label: "View Overdue",
      icon: AlertTriangle,
      onClick: onViewOverdue,
      variant: "outline" as const
    },
    {
      label: "Export Report",
      icon: FileText,
      onClick: onExportReport,
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

export default WorkOrdersQuickActions;
