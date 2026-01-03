import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, RefreshCw, Bell, Settings } from "lucide-react";

interface DeviceQuickActionsProps {
  onAddDevice: () => void;
  onConfigureAlerts: () => void;
  onRefreshStatus: () => void;
  onViewTemplates?: () => void;
}

const DeviceQuickActions = ({
  onAddDevice,
  onConfigureAlerts,
  onRefreshStatus,
  onViewTemplates,
}: DeviceQuickActionsProps) => {
  const actions = [
    {
      label: "Add Device",
      icon: Plus,
      onClick: onAddDevice,
      variant: "default" as const,
      className: "bg-primary hover:bg-primary/90",
    },
    {
      label: "Configure Alerts",
      icon: Bell,
      onClick: onConfigureAlerts,
      variant: "outline" as const,
      className: "border-warning/50 hover:bg-warning/10",
    },
    {
      label: "Refresh Status",
      icon: RefreshCw,
      onClick: onRefreshStatus,
      variant: "outline" as const,
      className: "border-primary/50 hover:bg-primary/10",
    },
    {
      label: "Templates",
      icon: Settings,
      onClick: onViewTemplates,
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

export default DeviceQuickActions;
