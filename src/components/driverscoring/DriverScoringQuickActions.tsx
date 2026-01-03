import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, FileText, TrendingUp, Users } from "lucide-react";

interface DriverScoringQuickActionsProps {
  onStartCoaching: () => void;
  onExportReport: () => void;
  onViewTrends: () => void;
  onViewHighRisk: () => void;
}

const DriverScoringQuickActions = ({
  onStartCoaching,
  onExportReport,
  onViewTrends,
  onViewHighRisk
}: DriverScoringQuickActionsProps) => {
  const actions = [
    {
      label: "Start Coaching",
      icon: MessageSquare,
      onClick: onStartCoaching,
      variant: "default" as const
    },
    {
      label: "Export Report",
      icon: FileText,
      onClick: onExportReport,
      variant: "outline" as const
    },
    {
      label: "View Trends",
      icon: TrendingUp,
      onClick: onViewTrends,
      variant: "outline" as const
    },
    {
      label: "High-Risk Drivers",
      icon: Users,
      onClick: onViewHighRisk,
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

export default DriverScoringQuickActions;
