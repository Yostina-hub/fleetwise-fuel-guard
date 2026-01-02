import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReportMetrics } from "@/hooks/useReportData";

interface ReportKPICardsProps {
  metrics: ReportMetrics;
  activeTab: string;
}

const TrendIndicator = ({ value, inverted = false }: { value: number; inverted?: boolean }) => {
  const isPositive = inverted ? value < 0 : value > 0;
  const isNegative = inverted ? value > 0 : value < 0;
  
  if (Math.abs(value) < 0.1) {
    return (
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Minus className="w-4 h-4" />
        <span>No change</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-1 text-sm",
      isPositive ? "text-green-500" : isNegative ? "text-destructive" : "text-muted-foreground"
    )}>
      {isPositive ? (
        <TrendingUp className="w-4 h-4" />
      ) : (
        <TrendingDown className="w-4 h-4" />
      )}
      <span>{Math.abs(value).toFixed(1)}% vs previous</span>
    </div>
  );
};

export const ReportKPICards = ({ metrics, activeTab }: ReportKPICardsProps) => {
  const getKPIConfig = () => {
    switch (activeTab) {
      case "vehicle":
        return [
          {
            label: "Total Distance",
            value: `${metrics.totalDistance.toLocaleString()} km`,
            trend: metrics.distanceTrend,
            inverted: false,
          },
          {
            label: "Fuel Consumed",
            value: `${metrics.totalFuelConsumed.toFixed(1)} L`,
            trend: metrics.fuelTrend,
            inverted: true,
          },
          {
            label: "Avg Efficiency",
            value: `${metrics.avgEfficiency.toFixed(1)} km/L`,
            trend: metrics.efficiencyTrend,
            inverted: false,
          },
          {
            label: "Idle Time",
            value: `${Math.round(metrics.idleTime)} min`,
            trend: 0,
            inverted: true,
          },
        ];
      case "driver":
        return [
          {
            label: "Avg Driver Score",
            value: metrics.avgDriverScore.toFixed(0),
            trend: 0,
            inverted: false,
          },
          {
            label: "Speeding Events",
            value: metrics.speedingEvents.toString(),
            trend: metrics.safetyTrend,
            inverted: true,
          },
          {
            label: "Harsh Events",
            value: (metrics.harshBrakingEvents + metrics.harshAccelerationEvents).toString(),
            trend: 0,
            inverted: true,
          },
          {
            label: "Needs Coaching",
            value: metrics.driversNeedingCoaching.toString(),
            trend: 0,
            inverted: true,
          },
        ];
      case "fuel":
        return [
          {
            label: "Total Fuel Cost",
            value: `$${metrics.totalFuelCost.toFixed(2)}`,
            trend: 0,
            inverted: true,
          },
          {
            label: "Transactions",
            value: metrics.fuelTransactionCount.toString(),
            trend: 0,
            inverted: false,
          },
          {
            label: "Avg Price/L",
            value: `$${metrics.avgFuelPrice.toFixed(2)}`,
            trend: 0,
            inverted: true,
          },
          {
            label: "Theft Cases",
            value: metrics.fuelTheftCount.toString(),
            trend: 0,
            inverted: true,
          },
        ];
      case "trips":
        return [
          {
            label: "Total Trips",
            value: metrics.totalTrips.toString(),
            trend: metrics.tripsTrend,
            inverted: false,
          },
          {
            label: "Completed",
            value: metrics.completedTrips.toString(),
            trend: 0,
            inverted: false,
          },
          {
            label: "Completion Rate",
            value: metrics.totalTrips > 0 
              ? `${((metrics.completedTrips / metrics.totalTrips) * 100).toFixed(1)}%`
              : "0%",
            trend: 0,
            inverted: false,
          },
          {
            label: "Avg Duration",
            value: `${Math.round(metrics.avgTripDuration)} min`,
            trend: 0,
            inverted: false,
          },
        ];
      case "maintenance":
        return [
          {
            label: "Scheduled",
            value: metrics.scheduledMaintenance.toString(),
            trend: 0,
            inverted: false,
          },
          {
            label: "Overdue",
            value: metrics.overdueMaintenance.toString(),
            trend: 0,
            inverted: true,
          },
          {
            label: "Work Orders",
            value: metrics.workOrdersTotal.toString(),
            trend: 0,
            inverted: false,
          },
          {
            label: "Completed",
            value: metrics.workOrdersCompleted.toString(),
            trend: 0,
            inverted: false,
          },
        ];
      case "dispatch":
        return [
          {
            label: "Total Jobs",
            value: metrics.dispatchJobsTotal.toString(),
            trend: 0,
            inverted: false,
          },
          {
            label: "Completed",
            value: metrics.dispatchJobsCompleted.toString(),
            trend: 0,
            inverted: false,
          },
          {
            label: "SLA Rate",
            value: `${metrics.slaMetPercentage.toFixed(1)}%`,
            trend: 0,
            inverted: false,
          },
          {
            label: "Completion Rate",
            value: metrics.dispatchJobsTotal > 0
              ? `${((metrics.dispatchJobsCompleted / metrics.dispatchJobsTotal) * 100).toFixed(1)}%`
              : "0%",
            trend: 0,
            inverted: false,
          },
        ];
      case "costs":
        return [
          {
            label: "Total Costs",
            value: `$${metrics.totalVehicleCosts.toFixed(2)}`,
            trend: metrics.costTrend,
            inverted: true,
          },
          {
            label: "Maintenance",
            value: `$${metrics.maintenanceCosts.toFixed(2)}`,
            trend: 0,
            inverted: true,
          },
          {
            label: "Fuel Costs",
            value: `$${metrics.totalFuelCost.toFixed(2)}`,
            trend: 0,
            inverted: true,
          },
          {
            label: "Incidents",
            value: metrics.totalIncidents.toString(),
            trend: 0,
            inverted: true,
          },
        ];
      case "alerts":
        return [
          {
            label: "Total Alerts",
            value: metrics.totalAlerts.toString(),
            trend: 0,
            inverted: true,
          },
          {
            label: "Critical",
            value: metrics.criticalAlerts.toString(),
            trend: 0,
            inverted: true,
          },
          {
            label: "Geofence Events",
            value: (metrics.geofenceEntries + metrics.geofenceExits).toString(),
            trend: 0,
            inverted: false,
          },
          {
            label: "Open Incidents",
            value: metrics.openIncidents.toString(),
            trend: 0,
            inverted: true,
          },
        ];
      default:
        return [];
    }
  };

  const kpis = getKPIConfig();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => (
        <Card key={index} className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
              {kpi.label}
            </div>
            <div className="text-3xl font-bold text-foreground">{kpi.value}</div>
            <div className="mt-2">
              <TrendIndicator value={kpi.trend} inverted={kpi.inverted} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
