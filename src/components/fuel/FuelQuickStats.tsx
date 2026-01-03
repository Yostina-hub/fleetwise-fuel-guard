import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Fuel, Gauge, AlertTriangle, DollarSign } from "lucide-react";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";

interface FuelQuickStatsProps {
  totalConsumption: number;
  anomalyCount: number;
  avgEfficiency: string | null;
  eventsCount: number;
  consumptionTrend: { value: number; direction: 'up' | 'down' | 'neutral' };
  avgCostPerLiter: number;
}

const FuelQuickStats = ({ 
  totalConsumption, 
  anomalyCount, 
  avgEfficiency, 
  eventsCount,
  consumptionTrend,
  avgCostPerLiter
}: FuelQuickStatsProps) => {
  const { formatCurrency } = useOrganizationSettings();

  const estimatedMonthlyCost = totalConsumption * avgCostPerLiter;
  const potentialSavings = estimatedMonthlyCost * 0.12; // 12% potential savings through optimization

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Consumption Trend */}
      <Card className="glass-card hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-primary/10">
              <Fuel className="w-4 h-4 text-primary" />
            </div>
            <Badge 
              variant="outline" 
              className={consumptionTrend.direction === 'down' ? 'text-success border-success/30' : 'text-destructive border-destructive/30'}
            >
              {consumptionTrend.direction === 'down' ? (
                <TrendingDown className="w-3 h-3 mr-1" />
              ) : consumptionTrend.direction === 'up' ? (
                <TrendingUp className="w-3 h-3 mr-1" />
              ) : (
                <Minus className="w-3 h-3 mr-1" />
              )}
              {Math.abs(consumptionTrend.value)}%
            </Badge>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold">{totalConsumption.toLocaleString()}L</div>
            <p className="text-xs text-muted-foreground">vs last period</p>
          </div>
        </CardContent>
      </Card>

      {/* Efficiency Score */}
      <Card className="glass-card hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-success/10">
              <Gauge className="w-4 h-4 text-success" />
            </div>
            <Badge variant="outline" className="text-success border-success/30">
              Good
            </Badge>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold">{avgEfficiency || '—'}</div>
            <p className="text-xs text-muted-foreground">Fleet efficiency</p>
          </div>
        </CardContent>
      </Card>

      {/* Potential Savings */}
      <Card className="glass-card hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-warning/10">
              <DollarSign className="w-4 h-4 text-warning" />
            </div>
            <Badge variant="outline" className="text-warning border-warning/30">
              Optimize
            </Badge>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold">{formatCurrency(potentialSavings)}</div>
            <p className="text-xs text-muted-foreground">Potential savings/mo</p>
          </div>
        </CardContent>
      </Card>

      {/* Anomaly Alert */}
      <Card className={`glass-card hover:shadow-lg transition-shadow ${anomalyCount > 0 ? 'border-destructive/30' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className={`p-2 rounded-lg ${anomalyCount > 0 ? 'bg-destructive/10' : 'bg-muted'}`}>
              <AlertTriangle className={`w-4 h-4 ${anomalyCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
            </div>
            {anomalyCount > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                Action Required
              </Badge>
            )}
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold">{anomalyCount}</div>
            <p className="text-xs text-muted-foreground">Anomalies detected</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FuelQuickStats;
