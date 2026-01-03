import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Settings, Mail, AlertTriangle, Shield } from "lucide-react";

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
      icon: Shield,
      onClick: onConfigureSSO,
      variant: "default" as const,
      className: "bg-primary hover:bg-primary/90",
    },
    {
      label: "Email Reports",
      icon: Mail,
      onClick: onCreateEmailReport,
      variant: "outline" as const,
      className: "border-primary/50 hover:bg-primary/10",
    },
    {
      label: "Driver Penalties",
      icon: AlertTriangle,
      onClick: onViewPenalties,
      variant: "outline" as const,
      className: "border-warning/50 hover:bg-warning/10 text-warning",
    },
    {
      label: "Org Settings",
      icon: Settings,
      onClick: onManageSettings,
      variant: "outline" as const,
      className: "border-muted-foreground/50 hover:bg-muted/50",
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

export default AdminQuickActions;
