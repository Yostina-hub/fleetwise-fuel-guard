import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf, TrendingDown, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

interface CarbonEmissionsCardProps {
  totalCO2Kg: number;
  averagePerVehicle: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  byFuelType: { type: string; emissions: number }[];
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--warning))',
  'hsl(var(--success))',
];

const CarbonEmissionsCard = ({
  totalCO2Kg,
  averagePerVehicle,
  trend,
  trendPercentage,
  byFuelType
}: CarbonEmissionsCardProps) => {
  const formatWeight = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}t`;
    }
    return `${value.toFixed(0)}kg`;
  };

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent" />
      <CardHeader className="relative pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Leaf className="w-4 h-4 text-success" />
            Carbon Emissions
          </CardTitle>
          <div className={`flex items-center gap-1 text-xs ${trend === 'down' ? 'text-success' : 'text-destructive'}`}>
            {trend === 'down' ? (
              <TrendingDown className="w-3 h-3" />
            ) : (
              <TrendingUp className="w-3 h-3" />
            )}
            {trendPercentage}%
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative">
        {/* Main Stats */}
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-3xl font-bold">{formatWeight(totalCO2Kg)}</span>
          <span className="text-sm text-muted-foreground">CO₂ this month</span>
        </div>
        
        {/* Chart */}
        <div className="h-24 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byFuelType} layout="vertical">
              <XAxis type="number" hide />
              <YAxis 
                dataKey="type" 
                type="category" 
                width={60}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: number) => `${formatWeight(value)} CO₂`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Bar dataKey="emissions" radius={[0, 4, 4, 0]}>
                {byFuelType.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Average per vehicle */}
        <div className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Avg. per vehicle</span>
          <span className="font-semibold">{formatWeight(averagePerVehicle)}</span>
        </div>
        
        {/* Environmental tip */}
        <div className="mt-3 p-2 rounded-lg bg-success/10 text-success text-xs flex items-center gap-2">
          <Leaf className="w-3 h-3" />
          <span>12% reduction vs. industry average</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default CarbonEmissionsCard;
