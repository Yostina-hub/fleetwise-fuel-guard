import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Info, RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";

interface FuelMetricsPanelProps {
  fuelTransactions: any[];
  isLoading: boolean;
  vehicleId: string;
  distanceUnit?: "km" | "miles";
  fuelUnit?: "liters" | "gallons";
}

const FuelMetricsPanel = ({
  fuelTransactions,
  isLoading,
  vehicleId,
  distanceUnit = "km",
  fuelUnit = "gallons"
}: FuelMetricsPanelProps) => {
  const [chartType, setChartType] = useState("data_based");
  const [dateRange, setDateRange] = useState("today");

  // Calculate fuel metrics from transactions
  const totalDistance = fuelTransactions.reduce((sum, t) => sum + (t.odometer_reading || 0), 0);
  const totalFuelUsed = fuelTransactions.reduce((sum, t) => sum + (t.fuel_amount_liters || 0), 0);
  const refillCount = fuelTransactions.filter(t => t.transaction_type === 'refuel' || t.transaction_type === 'purchase').length;
  const drainCount = fuelTransactions.filter(t => t.transaction_type === 'drain' || t.fuel_amount_liters < 0).length;
  
  // Calculate consumption (L/100km or MPG)
  const consumption = totalDistance > 0 ? (totalFuelUsed / totalDistance) * 100 : 0;
  
  // Current fuel level (from latest transaction or N/A)
  const latestTransaction = fuelTransactions[0];
  const currentFuel = latestTransaction?.fuel_amount_liters || null;

  const formatFuel = (value: number | null) => {
    if (value === null) return "N/A";
    if (fuelUnit === "gallons") {
      return (value * 0.264172).toFixed(2);
    }
    return value.toFixed(2);
  };

  const formatDistance = (value: number) => {
    if (distanceUnit === "miles") {
      return (value * 0.621371).toFixed(2);
    }
    return value.toFixed(2);
  };

  const unitLabel = fuelUnit === "gallons" ? "gallons" : "L";
  const distanceLabel = distanceUnit === "miles" ? "mi" : "km";

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-10" />
        </div>
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls Row */}
      <div className="flex items-end gap-4">
        <div className="flex-1 space-y-1.5">
          <label className="text-sm text-muted-foreground">Chart type</label>
          <Select value={chartType} onValueChange={setChartType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="data_based">Data based graph</SelectItem>
              <SelectItem value="time_based">Time based graph</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 space-y-1.5">
          <label className="text-sm text-muted-foreground">Select date</label>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="ghost" size="icon" className="mb-0.5">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Fuel Metrics Grid */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Fuel</h3>
        
        {/* First Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{formatDistance(totalDistance)}</span>
              <span className="text-muted-foreground">{distanceLabel}</span>
            </div>
            <p className="text-sm text-muted-foreground">Distance</p>
          </div>
          
          <div className="space-y-1 border-l pl-4">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{currentFuel !== null ? formatFuel(currentFuel) : "N/A"}</span>
              <span className="text-muted-foreground">{unitLabel}</span>
            </div>
            <p className="text-sm text-muted-foreground">Current fuel</p>
          </div>
          
          <div className="space-y-1 border-l pl-4">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{formatFuel(totalFuelUsed)}</span>
              <span className="text-muted-foreground">{unitLabel}</span>
            </div>
            <p className="text-sm text-muted-foreground">Fuel used</p>
          </div>
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="flex items-center gap-1.5">
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Fuel consumption rate per 100{distanceLabel}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <p className="text-sm text-muted-foreground">Consumption</p>
          </div>
          
          <div className="space-y-1 border-l pl-4">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{formatFuel(drainCount > 0 ? totalFuelUsed / drainCount : 0)}</span>
              <span className="text-muted-foreground">{unitLabel}</span>
            </div>
            <p className="text-sm text-muted-foreground">{drainCount} Drains</p>
          </div>
          
          <div className="space-y-1 border-l pl-4">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{formatFuel(refillCount > 0 ? totalFuelUsed / refillCount : 0)}</span>
              <span className="text-muted-foreground">{unitLabel}</span>
            </div>
            <p className="text-sm text-muted-foreground">{refillCount} Refills</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FuelMetricsPanel;
