import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, TrendingDown, PiggyBank, Target, BarChart3 } from "lucide-react";
import { FinancialMetrics } from "@/hooks/useExecutiveMetrics";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface FinancialOverviewProps {
  metrics: FinancialMetrics;
  loading?: boolean;
}

const FinancialOverview = ({ metrics, loading }: FinancialOverviewProps) => {
  const { formatCurrency, settings } = useOrganizationSettings();

  if (loading) {
    return (
      <Card className="glass-strong">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-success" />
            Financial Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted/50 rounded-lg animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const statCards = [
    {
      label: 'Total Revenue',
      value: formatCurrency(metrics.totalRevenue),
      icon: <TrendingUp className="w-4 h-4" />,
      color: 'text-success bg-success/10',
    },
    {
      label: 'Total Costs',
      value: formatCurrency(metrics.totalCosts),
      icon: <TrendingDown className="w-4 h-4" />,
      color: 'text-destructive bg-destructive/10',
    },
    {
      label: 'Net Profit',
      value: formatCurrency(metrics.profit),
      icon: <DollarSign className="w-4 h-4" />,
      color: metrics.profit >= 0 ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10',
    },
    {
      label: 'Profit Margin',
      value: `${metrics.profitMargin.toFixed(1)}%`,
      icon: <Target className="w-4 h-4" />,
      color: metrics.profitMargin >= 15 ? 'text-success bg-success/10' : 'text-warning bg-warning/10',
    },
  ];

  return (
    <Card className="glass-strong">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-success" />
            Financial Overview
          </CardTitle>
          <Badge variant="outline" className="text-xs">This Month</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statCards.map((stat, index) => (
            <div key={index} className={`p-4 rounded-lg ${stat.color.split(' ')[1]}`}>
              <div className={`flex items-center gap-2 ${stat.color.split(' ')[0]}`}>
                {stat.icon}
                <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
              </div>
              <div className="text-xl font-bold mt-1">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <PiggyBank className="w-4 h-4" />
              <span className="text-xs">Cost Savings</span>
            </div>
            <div className="text-lg font-bold text-success">{formatCurrency(metrics.costSavings)}</div>
            <div className="text-xs text-muted-foreground">vs last month</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <BarChart3 className="w-4 h-4" />
              <span className="text-xs">Revenue/Vehicle</span>
            </div>
            <div className="text-lg font-bold">{formatCurrency(metrics.revenuePerVehicle)}</div>
            <div className="text-xs text-muted-foreground">average</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Target className="w-4 h-4" />
              <span className="text-xs">Cost/{settings.distance_unit}</span>
            </div>
            <div className="text-lg font-bold">{formatCurrency(metrics.costPerKm)}</div>
            <div className="text-xs text-muted-foreground">operating</div>
          </div>
        </div>

        {/* Trend Chart */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">6-Month Trend</h4>
          <div role="img" aria-label="Financial trend chart">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={metrics.monthlyTrend}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="costsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--success))" 
                  fill="url(#revenueGradient)"
                  strokeWidth={2}
                  name="Revenue"
                />
                <Area 
                  type="monotone" 
                  dataKey="costs" 
                  stroke="hsl(var(--destructive))" 
                  fill="url(#costsGradient)"
                  strokeWidth={2}
                  name="Costs"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinancialOverview;
