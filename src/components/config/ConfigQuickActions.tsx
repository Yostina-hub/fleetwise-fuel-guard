import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, RefreshCw, Download, TestTube } from "lucide-react";

interface ConfigQuickActionsProps {
  onAddProtocol: () => void;
  onRefreshConfigs: () => void;
  onExportConfigs: () => void;
  onTestConnection: () => void;
}

const ConfigQuickActions = ({
  onAddProtocol,
  onRefreshConfigs,
  onExportConfigs,
  onTestConnection,
}: ConfigQuickActionsProps) => {
  const actions = [
    {
      label: "Add Protocol",
      icon: Plus,
      onClick: onAddProtocol,
      variant: "default" as const,
      className: "bg-primary hover:bg-primary/90",
    },
    {
      label: "Refresh",
      icon: RefreshCw,
      onClick: onRefreshConfigs,
      variant: "outline" as const,
      className: "border-primary/50 hover:bg-primary/10",
    },
    {
      label: "Export",
      icon: Download,
      onClick: onExportConfigs,
      variant: "outline" as const,
      className: "border-success/50 hover:bg-success/10",
    },
    {
      label: "Test Connection",
      icon: TestTube,
      onClick: onTestConnection,
      variant: "outline" as const,
      className: "border-warning/50 hover:bg-warning/10",
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

export default ConfigQuickActions;
