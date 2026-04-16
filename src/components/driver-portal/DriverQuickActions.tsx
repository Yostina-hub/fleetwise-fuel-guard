import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Wrench, Fuel, Car, Gauge, FileText } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DriverQuickActionsProps {
  onReportIssue: () => void;
  onRequestFuel: () => void;
  onRequestVehicle: () => void;
  onPreTripInspection: () => void;
  onMyDocuments: () => void;
}

const DriverQuickActions = ({
  onReportIssue,
  onRequestFuel,
  onRequestVehicle,
  onPreTripInspection,
  onMyDocuments,
}: DriverQuickActionsProps) => {
  const actions = [
    {
      label: "Report Issue",
      tooltip: "Report a vehicle problem or breakdown",
      icon: Wrench,
      onClick: onReportIssue,
      variant: "default" as const,
      className: "bg-primary hover:bg-primary/90",
    },
    {
      label: "Request Fuel",
      tooltip: "Submit a fuel refill request",
      icon: Fuel,
      onClick: onRequestFuel,
      variant: "outline" as const,
      className: "border-primary/50 hover:bg-primary/10",
    },
    {
      label: "Request Vehicle",
      tooltip: "Request a vehicle for a trip",
      icon: Car,
      onClick: onRequestVehicle,
      variant: "outline" as const,
      className: "border-accent/50 hover:bg-accent/10",
    },
    {
      label: "Pre-Trip Check",
      tooltip: "Complete pre-trip vehicle inspection",
      icon: Gauge,
      onClick: onPreTripInspection,
      variant: "outline" as const,
      className: "border-success/50 hover:bg-success/10 text-success",
    },
    {
      label: "My Documents",
      tooltip: "View and upload personal documents",
      icon: FileText,
      onClick: onMyDocuments,
      variant: "outline" as const,
      className: "border-muted-foreground/50 hover:bg-muted/50",
    },
  ];

  return (
    <Card className="glass-strong">
      <CardContent className="p-4">
        <TooltipProvider>
          <div className="flex flex-wrap gap-3">
            {actions.map((action) => (
              <Tooltip key={action.label}>
                <TooltipTrigger asChild>
                  <Button
                    variant={action.variant}
                    className={`gap-2 ${action.className}`}
                    onClick={action.onClick}
                    aria-label={action.label}
                  >
                    <action.icon className="w-4 h-4" aria-hidden="true" />
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

export default DriverQuickActions;
