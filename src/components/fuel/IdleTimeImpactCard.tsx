import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, Fuel, AlertCircle, TrendingDown } from "lucide-react";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";

interface IdleTimeImpactCardProps {
  idleStats: {
    totalIdleHours: number;
    fuelWasted: number;
    costImpact: number;
    topIdlers: { vehicle: string; hours: number; liters: number }[];
    fleetTarget: number;
    compliancePercent: number;
  };
}

const IdleTimeImpactCard = ({ idleStats }: IdleTimeImpactCardProps) => {
  const { formatCurrency, formatFuel } = useOrganizationSettings();

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5 text-warning" />
            Idle Time Impact
          </CardTitle>
          <Badge variant="outline" className="text-warning border-warning/30">
            This Week
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 text-warning mb-1">
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-xl font-bold">{idleStats.totalIdleHours}h</div>
            <p className="text-xs text-muted-foreground">Total Idle</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 text-destructive mb-1">
              <Fuel className="w-4 h-4" />
            </div>
            <div className="text-xl font-bold">{formatFuel(idleStats.fuelWasted)}</div>
            <p className="text-xs text-muted-foreground">Fuel Wasted</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1 text-destructive mb-1">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div className="text-xl font-bold">{formatCurrency(idleStats.costImpact)}</div>
            <p className="text-xs text-muted-foreground">Cost Impact</p>
          </div>
        </div>

        {/* Compliance Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Fleet Compliance</span>
            <span className="text-sm text-muted-foreground">{idleStats.compliancePercent}%</span>
          </div>
          <Progress value={idleStats.compliancePercent} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            Target: &lt;{idleStats.fleetTarget}h idle per vehicle weekly
          </p>
        </div>

        {/* Top Idlers */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-warning" />
            <span className="text-sm font-medium">Top Idle Vehicles</span>
          </div>
          <div className="space-y-2">
            {idleStats.topIdlers.map((vehicle, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono">{vehicle.vehicle}</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">{vehicle.hours}h</span>
                  <span className="text-destructive font-medium">-{formatFuel(vehicle.liters)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default IdleTimeImpactCard;
