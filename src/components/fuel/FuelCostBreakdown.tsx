import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { DollarSign } from "lucide-react";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";

interface FuelCostBreakdownProps {
  transactions: Array<{
    vehicle_id: string;
    fuel_cost: number;
    transaction_type?: string;
  }>;
  getVehiclePlate: (id: string) => string;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--warning))",
  "hsl(142, 76%, 36%)",
  "hsl(var(--destructive))",
  "hsl(199, 89%, 48%)",
  "hsl(262, 83%, 58%)",
  "hsl(24, 95%, 53%)",
  "hsl(330, 81%, 60%)",
];

const FuelCostBreakdown = ({ transactions, getVehiclePlate }: FuelCostBreakdownProps) => {
  const { formatCurrency } = useOrganizationSettings();

  const { vehicleData, typeData, totalCost } = useMemo(() => {
    const vehicleMap: Record<string, number> = {};
    const typeMap: Record<string, number> = {};
    let total = 0;

    transactions.forEach(t => {
      const cost = t.fuel_cost || 0;
      total += cost;
      
      const plate = getVehiclePlate(t.vehicle_id);
      vehicleMap[plate] = (vehicleMap[plate] || 0) + cost;
      
      const type = t.transaction_type || "other";
      typeMap[type] = (typeMap[type] || 0) + cost;
    });

    const vData = Object.entries(vehicleMap)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    // Group remaining into "Others"
    const topTotal = vData.reduce((s, d) => s + d.value, 0);
    if (total - topTotal > 0) {
      vData.push({ name: "Others", value: Math.round(total - topTotal) });
    }

    const tData = Object.entries(typeMap)
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value: Math.round(value) }));

    return { vehicleData: vData, typeData: tData, totalCost: total };
  }, [transactions, getVehiclePlate]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { name, value } = payload[0];
      const pct = totalCost > 0 ? ((value / totalCost) * 100).toFixed(1) : 0;
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
          <p className="font-semibold">{name}</p>
          <p className="text-muted-foreground">{formatCurrency(value)} ({pct}%)</p>
        </div>
      );
    }
    return null;
  };

  if (vehicleData.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No cost data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="w-5 h-5 text-success" />
            Cost Breakdown
          </CardTitle>
          <span className="text-2xl font-bold">{formatCurrency(totalCost)}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={vehicleData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {vehicleData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                iconType="circle" 
                iconSize={8}
                formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default FuelCostBreakdown;
