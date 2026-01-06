import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Heart, Truck, AlertTriangle, CheckCircle, Wrench, Fuel, Activity } from "lucide-react";
import { useMemo } from "react";

interface VehicleData {
  id: string;
  status: string;
  current_fuel?: number;
}

interface FleetHealthSummaryProps {
  vehicles: VehicleData[];
  maintenanceOverdue: number;
  complianceRate: number;
  loading?: boolean;
}

const FleetHealthSummary = ({ vehicles, maintenanceOverdue, complianceRate, loading }: FleetHealthSummaryProps) => {
  const healthMetrics = useMemo(() => {
    const total = vehicles.length;
    if (total === 0) return { overall: 0, operational: 0, maintenance: 0, fuel: 0 };

    const active = vehicles.filter(v => v.status === 'active').length;
    const inMaintenance = vehicles.filter(v => v.status === 'maintenance').length;
    const avgFuel = vehicles.reduce((s, v) => s + (v.current_fuel || 50), 0) / total;

    const operationalScore = (active / total) * 100;
    const maintenanceScore = Math.max(0, 100 - (maintenanceOverdue * 10));
    const fuelScore = avgFuel;
    const overallScore = (operationalScore * 0.4) + (maintenanceScore * 0.3) + (complianceRate * 0.2) + (fuelScore * 0.1);

    return {
      overall: Math.round(overallScore),
      operational: Math.round(operationalScore),
      maintenance: Math.round(maintenanceScore),
      fuel: Math.round(fuelScore),
    };
  }, [vehicles, maintenanceOverdue, complianceRate]);

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getHealthBg = (score: number) => {
    if (score >= 80) return 'bg-success';
    if (score >= 60) return 'bg-warning';
    return 'bg-destructive';
  };

  if (loading) {
    return (
      <Card className="glass-strong">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-destructive" />
            Fleet Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 bg-muted/50 rounded-lg animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-strong">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Heart className={`w-5 h-5 ${getHealthColor(healthMetrics.overall)} ${healthMetrics.overall < 60 ? 'animate-pulse' : ''}`} />
            Fleet Health
          </CardTitle>
          <Badge className={`${getHealthBg(healthMetrics.overall)} text-white`}>
            {healthMetrics.overall >= 80 ? 'Excellent' : healthMetrics.overall >= 60 ? 'Good' : 'Needs Attention'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Health Score */}
        <div className="flex items-center justify-center">
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                className="text-muted"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${healthMetrics.overall * 3.52} 352`}
                strokeLinecap="round"
                className={getHealthColor(healthMetrics.overall)}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold ${getHealthColor(healthMetrics.overall)}`}>
                {healthMetrics.overall}
              </span>
              <span className="text-xs text-muted-foreground">Health Score</span>
            </div>
          </div>
        </div>

        {/* Individual Metrics */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary" />
                Operational
              </span>
              <span className="font-medium">{healthMetrics.operational}%</span>
            </div>
            <Progress value={healthMetrics.operational} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-orange-500" />
                Maintenance
              </span>
              <span className="font-medium">{healthMetrics.maintenance}%</span>
            </div>
            <Progress value={healthMetrics.maintenance} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                Compliance
              </span>
              <span className="font-medium">{Math.round(complianceRate)}%</span>
            </div>
            <Progress value={complianceRate} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Fuel className="w-4 h-4 text-blue-500" />
                Avg Fuel Level
              </span>
              <span className="font-medium">{healthMetrics.fuel}%</span>
            </div>
            <Progress value={healthMetrics.fuel} className="h-2" />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          <div className="text-center">
            <div className="text-lg font-bold text-success">
              {vehicles.filter(v => v.status === 'active').length}
            </div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-warning">
              {vehicles.filter(v => v.status === 'maintenance').length}
            </div>
            <div className="text-xs text-muted-foreground">In Service</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-destructive">
              {maintenanceOverdue}
            </div>
            <div className="text-xs text-muted-foreground">Overdue</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FleetHealthSummary;
