import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, MapPin, RefreshCw, FileText } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
      tooltip: "Create a new delivery route",
      icon: Plus,
      onClick: onCreateRoute,
      variant: "default" as const
    },
    {
      label: "Add Site",
      tooltip: "Add a new customer site location",
      icon: MapPin,
      onClick: onAddSite,
      variant: "outline" as const
    },
    {
      label: "Optimize Routes",
      tooltip: "Run AI optimization on existing routes",
      icon: RefreshCw,
      onClick: onOptimizeRoutes,
      variant: "outline" as const
    },
    {
      label: "Export Report",
      tooltip: "Download route performance report",
      icon: FileText,
      onClick: onExportReport,
      variant: "outline" as const
    }
  ];

  return (
    <Card className="glass-strong">
      <CardContent className="p-4">
        <TooltipProvider>
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <Tooltip key={action.label}>
                <TooltipTrigger asChild>
                  <Button
                    variant={action.variant}
                    size="sm"
                    onClick={action.onClick}
                    className="gap-2"
                    aria-label={action.label}
                  >
                    <action.icon className="h-4 w-4" aria-hidden="true" />
                    {action.label}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{action.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
};

export default RoutesQuickActions;
