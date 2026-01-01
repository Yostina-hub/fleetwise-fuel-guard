import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useMemo } from "react";

interface Vehicle {
  id: string;
  make?: string;
  model?: string;
}

interface FleetVehicleSummaryCardProps {
  vehicles: Vehicle[];
}

const COLORS = [
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(var(--accent))",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
  "hsl(217, 91%, 60%)",
];

const FleetVehicleSummaryCard = ({ vehicles }: FleetVehicleSummaryCardProps) => {
  const vehiclesByModel = useMemo(() => {
    const modelCounts: Record<string, number> = {};
    vehicles.forEach((v) => {
      const model = v.model || "Unknown";
      modelCounts[model] = (modelCounts[model] || 0) + 1;
    });
    
    return Object.entries(modelCounts)
      .map(([name, value], index) => ({
        name,
        value,
        color: COLORS[index % COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [vehicles]);

  const totalVehicles = vehicles.length;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Fleet Vehicle Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="relative">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={vehiclesByModel}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {vehiclesByModel.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold">{totalVehicles}</span>
              <span className="text-xs text-muted-foreground">Fleet Total</span>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            {vehiclesByModel.slice(0, 5).map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-primary hover:underline cursor-pointer">
                    {item.name}
                  </span>
                </div>
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
              <span className="font-medium">Total</span>
              <span className="font-bold">{totalVehicles}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FleetVehicleSummaryCard;
