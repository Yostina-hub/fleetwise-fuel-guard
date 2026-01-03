import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Plus, 
  FileSpreadsheet, 
  AlertTriangle, 
  Truck, 
  BarChart3, 
  Settings2,
  Zap
} from "lucide-react";

interface FuelQuickActionsProps {
  onAddTransaction?: () => void;
  onExportReport?: () => void;
  onViewAnomalies?: () => void;
  onManageDepots?: () => void;
}

const FuelQuickActions = ({ 
  onAddTransaction, 
  onExportReport, 
  onViewAnomalies,
  onManageDepots 
}: FuelQuickActionsProps) => {
  const actions = [
    {
      icon: <Plus className="w-4 h-4" />,
      label: "Add Transaction",
      description: "Record fuel purchase",
      onClick: onAddTransaction,
      variant: "default" as const
    },
    {
      icon: <FileSpreadsheet className="w-4 h-4" />,
      label: "Export Report",
      description: "Download CSV",
      onClick: onExportReport,
      variant: "outline" as const
    },
    {
      icon: <AlertTriangle className="w-4 h-4" />,
      label: "Review Anomalies",
      description: "Check alerts",
      onClick: onViewAnomalies,
      variant: "outline" as const
    },
    {
      icon: <Truck className="w-4 h-4" />,
      label: "Manage Depots",
      description: "Stock & dispensing",
      onClick: onManageDepots,
      variant: "outline" as const
    }
  ];

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="w-5 h-5 text-primary" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {actions.map((action, idx) => (
            <Button
              key={idx}
              variant={action.variant}
              className="h-auto flex-col gap-2 p-4 hover:scale-[1.02] transition-transform"
              onClick={action.onClick}
            >
              <div className={`p-2 rounded-lg ${action.variant === 'default' ? 'bg-primary-foreground/20' : 'bg-primary/10'}`}>
                {action.icon}
              </div>
              <div className="text-center">
                <div className="font-medium text-sm">{action.label}</div>
                <div className="text-xs text-muted-foreground">{action.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default FuelQuickActions;
