import { Button } from "@/components/ui/button";
import { Settings, AlertTriangle, Info } from "lucide-react";

interface FuelConsumptionAlertsEmptyStateProps {
  onSetupClick?: () => void;
}

export default function FuelConsumptionAlertsEmptyState({ onSetupClick }: FuelConsumptionAlertsEmptyStateProps) {
  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-muted-foreground" />
      </div>
      <h4 className="font-medium mb-2">No Fuel Consumption Alerts</h4>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
        Fuel consumption alerts help you detect anomalies like theft, leaks, or excessive consumption automatically.
      </p>
      
      <div className="bg-muted/50 rounded-lg p-4 mb-4 text-left max-w-md mx-auto">
        <div className="flex items-start gap-2 text-sm">
          <Info className="w-4 h-4 mt-0.5 text-primary shrink-0" />
          <div>
            <p className="font-medium mb-1">How alerts are generated:</p>
            <ul className="text-muted-foreground space-y-1 text-xs">
              <li>• Configure fuel detection settings per vehicle</li>
              <li>• Set thresholds for refuel and theft detection</li>
              <li>• System automatically monitors fuel levels</li>
              <li>• Alerts appear here when anomalies are detected</li>
            </ul>
          </div>
        </div>
      </div>
      
      <Button variant="outline" className="gap-2" onClick={onSetupClick}>
        <Settings className="w-4 h-4" />
        Go to System Config
      </Button>
    </div>
  );
}
