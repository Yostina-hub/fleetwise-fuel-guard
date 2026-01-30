import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Settings, Mail, AlertTriangle, Shield } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AdminQuickActionsProps {
  onConfigureSSO: () => void;
  onCreateEmailReport: () => void;
  onViewPenalties: () => void;
  onManageSettings: () => void;
}

const AdminQuickActions = ({
  onConfigureSSO,
  onCreateEmailReport,
  onViewPenalties,
  onManageSettings,
}: AdminQuickActionsProps) => {
  const actions = [
    {
      label: "Configure SSO",
      tooltip: "Set up Single Sign-On authentication",
      icon: Shield,
      onClick: onConfigureSSO,
      variant: "default" as const,
      className: "bg-primary hover:bg-primary/90",
    },
    {
      label: "Email Reports",
      tooltip: "Configure automated email reports",
      icon: Mail,
      onClick: onCreateEmailReport,
      variant: "outline" as const,
      className: "border-primary/50 hover:bg-primary/10",
    },
    {
      label: "Driver Penalties",
      tooltip: "View and manage driver violations",
      icon: AlertTriangle,
      onClick: onViewPenalties,
      variant: "outline" as const,
      className: "border-warning/50 hover:bg-warning/10 text-warning",
    },
    {
      label: "Org Settings",
      tooltip: "Manage organization settings",
      icon: Settings,
      onClick: onManageSettings,
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

export default AdminQuickActions;
