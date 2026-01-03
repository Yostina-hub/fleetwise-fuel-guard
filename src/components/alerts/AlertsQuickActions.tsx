import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCheck, Bell, Download, Filter, Settings } from "lucide-react";

interface AlertsQuickActionsProps {
  onAcknowledgeAll: () => void;
  onExport: () => void;
  onConfigureRules: () => void;
  selectedCount: number;
  onBulkAcknowledge?: () => void;
}

const AlertsQuickActions = ({
  onAcknowledgeAll,
  onExport,
  onConfigureRules,
  selectedCount,
  onBulkAcknowledge,
}: AlertsQuickActionsProps) => {
  return (
    <Card className="glass-strong">
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {selectedCount > 0 && onBulkAcknowledge && (
            <Button
              variant="default"
              className="gap-2 bg-success hover:bg-success/90"
              onClick={onBulkAcknowledge}
              aria-label={`Acknowledge ${selectedCount} selected alerts`}
            >
              <CheckCheck className="w-4 h-4" aria-hidden="true" />
              Acknowledge Selected ({selectedCount})
            </Button>
          )}
          <Button
            variant="outline"
            className="gap-2 border-primary/50 hover:bg-primary/10"
            onClick={onAcknowledgeAll}
            aria-label="Acknowledge all pending alerts"
          >
            <CheckCheck className="w-4 h-4" aria-hidden="true" />
            Acknowledge All
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-success/50 hover:bg-success/10"
            onClick={onExport}
            aria-label="Export alerts to CSV"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            Export
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-warning/50 hover:bg-warning/10"
            onClick={onConfigureRules}
            aria-label="Configure alert rules"
          >
            <Settings className="w-4 h-4" aria-hidden="true" />
            Alert Rules
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AlertsQuickActions;
