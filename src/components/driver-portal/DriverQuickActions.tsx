import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Wrench, Fuel, Gauge, FileText, ClipboardCheck, CircleDot } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DriverQuickActionsProps {
  onReportIssue: () => void;
  onRequestFuel: () => void;
  /**
   * @deprecated Drivers can no longer initiate fleet/vehicle requests.
   * Vehicle requests are filed by end-users, supervisors, and managers only.
   * Prop kept temporarily for backwards-compatibility; it is ignored.
   */
  onRequestVehicle?: () => void;
  onRequestTire?: () => void;
  onPreTripInspection: () => void;
  onPostTripInspection?: () => void;
  onMyDocuments: () => void;
}

const DriverQuickActions = ({
  onReportIssue,
  onRequestFuel,
  onRequestTire,
  onPreTripInspection,
  onPostTripInspection,
  onMyDocuments,
}: DriverQuickActionsProps) => {
  const actions = [
    {
      label: "Report Issue",
      tooltip: "Report a vehicle technical issue, accident, or passenger health emergency",
      icon: Wrench,
      onClick: onReportIssue,
      variant: "default" as const,
      className: "bg-primary hover:bg-primary/90",
    },
    {
      label: "Additional Fuel Request",
      tooltip: "Request an additional refuel during a trip — e-fuel data is captured automatically",
      icon: Fuel,
      onClick: onRequestFuel,
      variant: "outline" as const,
      className: "border-primary/50 hover:bg-primary/10",
    },
    ...(onRequestTire
      ? [{
          label: "Request Tire",
          tooltip: "Submit a tire replacement / repair request to maintenance",
          icon: CircleDot,
          onClick: onRequestTire,
          variant: "outline" as const,
          className: "border-warning/50 hover:bg-warning/10 text-warning",
        }]
      : []),
    {
      label: "Pre-Trip Check",
      tooltip: "Complete pre-trip vehicle inspection",
      icon: Gauge,
      onClick: onPreTripInspection,
      variant: "outline" as const,
      className: "border-success/50 hover:bg-success/10 text-success",
    },
    ...(onPostTripInspection
      ? [{
          label: "Post-Trip Check",
          tooltip: "Complete post-trip vehicle inspection",
          icon: ClipboardCheck,
          onClick: onPostTripInspection,
          variant: "outline" as const,
          className: "border-warning/50 hover:bg-warning/10 text-warning",
        }]
      : []),
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
