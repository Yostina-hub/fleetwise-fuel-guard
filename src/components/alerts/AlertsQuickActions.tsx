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
    <Card 
      className="border border-cyan-500/20"
      style={{ background: 'linear-gradient(135deg, #001a33 0%, #002244 50%, #001a33 100%)' }}
    >
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {selectedCount > 0 && onBulkAcknowledge && (
            <Button
              className="gap-2 bg-gradient-to-r from-[#8DC63F] to-[#6ba32d] hover:from-[#7ab534] hover:to-[#5a9226] text-white border-0"
              onClick={onBulkAcknowledge}
              aria-label={`Acknowledge ${selectedCount} selected alerts`}
            >
              <CheckCheck className="w-4 h-4" aria-hidden="true" />
              Acknowledge Selected ({selectedCount})
            </Button>
          )}
          <Button
            variant="outline"
            className="gap-2 bg-white/5 border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10 hover:text-cyan-200"
            onClick={onAcknowledgeAll}
            aria-label="Acknowledge all pending alerts"
          >
            <CheckCheck className="w-4 h-4" aria-hidden="true" />
            Acknowledge All
          </Button>
          <Button
            variant="outline"
            className="gap-2 bg-white/5 border-[#8DC63F]/50 text-[#8DC63F] hover:bg-[#8DC63F]/10"
            onClick={onExport}
            aria-label="Export alerts to CSV"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            Export
          </Button>
          <Button
            variant="outline"
            className="gap-2 bg-white/5 border-amber-400/50 text-amber-400 hover:bg-amber-400/10"
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
