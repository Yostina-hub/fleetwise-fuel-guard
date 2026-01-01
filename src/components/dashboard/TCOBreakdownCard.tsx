import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface TCOBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

interface TCOBreakdownCardProps {
  totalCost: number;
  costPerVehicle: number;
  costPerKm: number;
  breakdown: TCOBreakdown[];
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  formatCurrency?: (value: number) => string;
  distanceUnit?: 'km' | 'miles';
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--warning))',
  'hsl(var(--success))',
  'hsl(var(--destructive))',
];

const TCOBreakdownCard = ({
  totalCost,
  costPerVehicle,
  costPerKm,
  breakdown,
  trend,
  trendPercentage,
  formatCurrency: formatCurrencyProp,
  distanceUnit = 'km'
}: TCOBreakdownCardProps) => {
  const formatCurrency = formatCurrencyProp || ((value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  });

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-warning/5 to-transparent" />
      <CardHeader className="relative pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="w-4 h-4 text-warning" />
            Total Cost of Ownership
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
        <div className="flex items-center gap-4">
          {/* Pie Chart */}
          <div className="w-28 h-28 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={breakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={25}
                  outerRadius={45}
                  paddingAngle={2}
                  dataKey="amount"
                >
                  {breakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Stats */}
          <div className="flex-1 space-y-2">
            <div>
              <div className="text-2xl font-bold">{formatCurrency(totalCost)}</div>
              <div className="text-xs text-muted-foreground">Monthly TCO</div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="p-2 rounded-lg bg-muted/50">
                <div className="text-sm font-semibold">{formatCurrency(costPerVehicle)}</div>
                <div className="text-xs text-muted-foreground">Per Vehicle</div>
              </div>
              <div className="p-2 rounded-lg bg-muted/50">
                <div className="text-sm font-semibold">{formatCurrency(costPerKm)}</div>
                <div className="text-xs text-muted-foreground">Per {distanceUnit === 'miles' ? 'Mile' : 'Km'}</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          {breakdown.map((item, index) => (
            <div key={item.category} className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: COLORS[index % COLORS.length] }} 
              />
              <span className="text-xs text-muted-foreground">{item.category}</span>
              <span className="text-xs font-medium ml-auto">{item.percentage.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TCOBreakdownCard;
