import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, MapPin, RefreshCw, FileText } from "lucide-react";

interface RoutesQuickActionsProps {
  onCreateRoute: () => void;
  onAddSite: () => void;
  onOptimizeRoutes: () => void;
  onExportReport: () => void;
}

const RoutesQuickActions = ({
  onCreateRoute,
  onAddSite,
  onOptimizeRoutes,
  onExportReport
}: RoutesQuickActionsProps) => {
  const actions = [
    {
      label: "Create Route",
      icon: Plus,
      onClick: onCreateRoute,
      variant: "default" as const
    },
    {
      label: "Add Site",
      icon: MapPin,
      onClick: onAddSite,
      variant: "outline" as const
    },
    {
      label: "Optimize Routes",
      icon: RefreshCw,
      onClick: onOptimizeRoutes,
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

export default RoutesQuickActions;
