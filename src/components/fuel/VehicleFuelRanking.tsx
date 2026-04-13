import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Trophy, TrendingUp, TrendingDown } from "lucide-react";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";

interface VehicleFuelRankingProps {
  transactions: Array<{
    vehicle_id: string;
    fuel_amount_liters: number;
    fuel_cost?: number | null;
    odometer_km?: number | null;
  }>;
  getVehiclePlate: (id: string) => string;
}

const VehicleFuelRanking = ({ transactions, getVehiclePlate }: VehicleFuelRankingProps) => {
  const { formatFuel, formatCurrency } = useOrganizationSettings();

  const rankingData = useMemo(() => {
    const vehicleMap: Record<string, { liters: number; cost: number; count: number }> = {};
    
    transactions.forEach(t => {
      if (!vehicleMap[t.vehicle_id]) {
        vehicleMap[t.vehicle_id] = { liters: 0, cost: 0, count: 0 };
      }
      vehicleMap[t.vehicle_id].liters += t.fuel_amount_liters || 0;
      vehicleMap[t.vehicle_id].cost += t.fuel_cost || 0;
      vehicleMap[t.vehicle_id].count += 1;
    });

    return Object.entries(vehicleMap)
      .map(([id, data]) => ({
        vehicle: getVehiclePlate(id),
        liters: Math.round(data.liters),
        cost: Math.round(data.cost),
        avgPerFill: data.count > 0 ? Math.round(data.liters / data.count) : 0,
        fills: data.count,
      }))
      .sort((a, b) => b.liters - a.liters)
      .slice(0, 8);
  }, [transactions, getVehiclePlate]);

  const maxLiters = rankingData.length > 0 ? rankingData[0].liters : 0;

  const getBarColor = (index: number) => {
    if (index === 0) return "hsl(var(--destructive))";
    if (index === 1) return "hsl(38, 92%, 50%)";
    if (index === 2) return "hsl(38, 72%, 60%)";
    return "hsl(var(--primary))";
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
          <p className="font-semibold mb-1">{data.vehicle}</p>
          <p className="text-muted-foreground">Total: {formatFuel(data.liters)}</p>
          <p className="text-muted-foreground">Cost: {formatCurrency(data.cost)}</p>
          <p className="text-muted-foreground">Fills: {data.fills} ({data.avgPerFill}L avg)</p>
        </div>
      );
    }
    return null;
  };

  if (rankingData.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Trophy className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No transaction data for ranking</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="w-5 h-5 text-warning" />
            Top Consumers
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {rankingData.length} vehicles
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rankingData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}L`} />
              <YAxis 
                dataKey="vehicle" 
                type="category" 
                tick={{ fontSize: 11 }} 
                width={80}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="liters" radius={[0, 4, 4, 0]} maxBarSize={24}>
                {rankingData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(index)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default VehicleFuelRanking;
