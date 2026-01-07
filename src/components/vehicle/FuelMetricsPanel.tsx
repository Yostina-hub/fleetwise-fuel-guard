import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { 
  Fuel, 
  TrendingUp, 
  TrendingDown, 
  Gauge, 
  Droplet,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { format, subDays, isSameDay, startOfDay, endOfDay, isWithinInterval } from "date-fns";

interface FuelTransaction {
  id: string;
  transaction_date: string;
  fuel_amount_liters: number;
  location_name: string | null;
  fuel_cost: number | null;
  transaction_type: string | null;
  odometer_km: number | null;
}

interface FuelMetricsPanelProps {
  fuelTransactions: FuelTransaction[];
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
  fuelUnit = "liters"
}: FuelMetricsPanelProps) => {
  const [dateRange, setDateRange] = useState("week");

  // Filter transactions by date range
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    
    switch (dateRange) {
      case 'today':
        startDate = startOfDay(now);
        break;
      case 'yesterday':
        startDate = startOfDay(subDays(now, 1));
        break;
      case 'week':
        startDate = subDays(now, 7);
        break;
      case 'month':
        startDate = subDays(now, 30);
        break;
      default:
        startDate = subDays(now, 7);
    }

    return fuelTransactions.filter(t => {
      const txDate = new Date(t.transaction_date);
      if (dateRange === 'yesterday') {
        return isSameDay(txDate, subDays(now, 1));
      }
      return isWithinInterval(txDate, { start: startDate, end: endOfDay(now) });
    });
  }, [fuelTransactions, dateRange]);

  // Calculate fuel metrics
  const metrics = useMemo(() => {
    const refills = filteredTransactions.filter(t => 
      t.transaction_type === 'refuel' || t.transaction_type === 'purchase' || t.fuel_amount_liters > 0
    );
    const drains = filteredTransactions.filter(t => 
      t.transaction_type === 'drain' || t.fuel_amount_liters < 0
    );

    const totalRefilled = refills.reduce((sum, t) => sum + Math.abs(t.fuel_amount_liters || 0), 0);
    const totalDrained = drains.reduce((sum, t) => sum + Math.abs(t.fuel_amount_liters || 0), 0);
    const totalCost = filteredTransactions.reduce((sum, t) => sum + (t.fuel_cost || 0), 0);
    
    // Calculate distance from odometer readings
    const odometerReadings = filteredTransactions
      .filter(t => t.odometer_km)
      .map(t => t.odometer_km!)
      .sort((a, b) => a - b);
    
    const distance = odometerReadings.length >= 2 
      ? odometerReadings[odometerReadings.length - 1] - odometerReadings[0] 
      : 0;

    // Fuel efficiency (L/100km)
    const efficiency = distance > 0 && totalRefilled > 0 
      ? (totalRefilled / distance) * 100 
      : null;

    return {
      totalRefilled,
      totalDrained,
      totalCost,
      distance,
      efficiency,
      refillCount: refills.length,
      drainCount: drains.length,
      avgPerRefill: refills.length > 0 ? totalRefilled / refills.length : 0
    };
  }, [filteredTransactions]);

  // Chart data - daily aggregation
  const chartData = useMemo(() => {
    const days = dateRange === 'today' || dateRange === 'yesterday' ? 1 : 
                 dateRange === 'week' ? 7 : 30;
    
    const data: { date: string; amount: number; cost: number }[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const day = subDays(new Date(), i);
      const dayTransactions = fuelTransactions.filter(t => 
        isSameDay(new Date(t.transaction_date), day) && t.fuel_amount_liters > 0
      );
      
      data.push({
        date: format(day, 'dd MMM'),
        amount: dayTransactions.reduce((sum, t) => sum + (t.fuel_amount_liters || 0), 0),
        cost: dayTransactions.reduce((sum, t) => sum + (t.fuel_cost || 0), 0)
      });
    }
    
    return data;
  }, [fuelTransactions, dateRange]);

  const formatFuel = (value: number) => {
    if (fuelUnit === "gallons") {
      return (value * 0.264172).toFixed(1) + " gal";
    }
    return value.toFixed(1) + " L";
  };

  const formatDistance = (value: number) => {
    if (distanceUnit === "miles") {
      return (value * 0.621371).toFixed(0) + " mi";
    }
    return value.toFixed(0) + " km";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-primary">
            {formatFuel(payload[0]?.value || 0)}
          </p>
          {payload[1]?.value > 0 && (
            <p className="text-xs text-muted-foreground">
              ETB {payload[1]?.value?.toLocaleString()}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Controls Row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h3 className="text-lg font-semibold">Fuel Analytics</h3>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Fuel className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Total Refilled</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatFuel(metrics.totalRefilled)}</p>
              <p className="text-xs text-muted-foreground">{metrics.refillCount} refills</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="bg-success/5 border-success/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Gauge className="h-4 w-4 text-success" />
                <span className="text-xs text-muted-foreground">Efficiency</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {metrics.efficiency ? `${metrics.efficiency.toFixed(1)} L/100km` : 'N/A'}
              </p>
              <p className="text-xs text-muted-foreground">{formatDistance(metrics.distance)}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-warning/5 border-warning/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Droplet className="h-4 w-4 text-warning" />
                <span className="text-xs text-muted-foreground">Avg per Refill</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatFuel(metrics.avgPerRefill)}</p>
              <p className="text-xs text-muted-foreground">per fill-up</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="bg-secondary border-secondary">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Total Cost</span>
              </div>
              <p className="text-2xl font-bold text-foreground">ETB {metrics.totalCost.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">this period</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Fuel Consumption Chart */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium">Fuel Consumption</h4>
            <Badge variant="outline" className="text-xs">
              {dateRange === 'today' ? 'Today' : 
               dateRange === 'yesterday' ? 'Yesterday' :
               dateRange === 'week' ? 'Last 7 Days' : 'Last 30 Days'}
            </Badge>
          </div>
          
          {chartData.some(d => d.amount > 0) ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="fuelGradientPanel" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v) => `${v}L`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#fuelGradientPanel)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
              <Fuel className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">No fuel transactions for this period</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drain Alerts */}
      {metrics.drainCount > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-foreground">Fuel Drains Detected</p>
                <p className="text-sm text-muted-foreground">
                  {metrics.drainCount} drain event{metrics.drainCount > 1 ? 's' : ''} totaling {formatFuel(metrics.totalDrained)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FuelMetricsPanel;