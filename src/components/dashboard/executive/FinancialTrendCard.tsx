import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Bar, Line
} from "recharts";
import { DollarSign, TrendingUp, TrendingDown, ArrowUpRight, Wallet, PiggyBank, Target } from "lucide-react";
import { FinancialMetrics } from "@/hooks/useExecutiveMetrics";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";

interface FinancialTrendCardProps {
  metrics: FinancialMetrics;
  loading?: boolean;
}

const FinancialTrendCard = ({ metrics, loading }: FinancialTrendCardProps) => {
  const { formatCurrency, settings } = useOrganizationSettings();

  const isProfit = metrics.profit >= 0;

  if (loading) {
    return (
      <Card className="glass-strong col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-success" />
            Financial Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-muted/50 rounded-lg animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-strong col-span-2 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-success" />
            Financial Performance
          </CardTitle>
          <Badge 
            variant="outline" 
            className={`gap-1 ${isProfit ? 'text-success border-success/30' : 'text-destructive border-destructive/30'}`}
          >
            {isProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {metrics.profitMargin.toFixed(1)}% Margin
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Revenue', value: metrics.totalRevenue, icon: Wallet, color: 'text-success', bg: 'bg-success/10' },
            { label: 'Costs', value: metrics.totalCosts, icon: TrendingDown, color: 'text-destructive', bg: 'bg-destructive/10' },
            { label: 'Net Profit', value: metrics.profit, icon: DollarSign, color: isProfit ? 'text-success' : 'text-destructive', bg: isProfit ? 'bg-success/10' : 'bg-destructive/10' },
            { label: 'Savings', value: metrics.costSavings, icon: PiggyBank, color: 'text-primary', bg: 'bg-primary/10' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-xl ${stat.bg}`}
            >
              <div className={`flex items-center gap-2 ${stat.color} mb-2`}>
                <stat.icon className="w-4 h-4" />
                <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
              </div>
              <div className="text-xl font-bold">{formatCurrency(stat.value)}</div>
            </motion.div>
          ))}
        </div>

        {/* Combined Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="h-[220px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={metrics.monthlyTrend}>
              <defs>
                <linearGradient id="revenueAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="costsAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis 
                dataKey="month" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}
                formatter={(value: number, name: string) => [formatCurrency(value), name]}
              />
              
              {/* Revenue Area */}
              <Area
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="hsl(var(--success))"
                fill="url(#revenueAreaGradient)"
                strokeWidth={2}
              />
              
              {/* Costs as bars */}
              <Bar
                dataKey="costs"
                name="Costs"
                fill="hsl(var(--destructive))"
                fillOpacity={0.6}
                radius={[4, 4, 0, 0]}
                barSize={20}
              />
              
              {/* Profit line */}
              <Line
                type="monotone"
                dataKey="profit"
                name="Profit"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Additional metrics */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-xs text-muted-foreground">Revenue/Vehicle</span>
              <p className="text-lg font-bold">{formatCurrency(metrics.revenuePerVehicle)}</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div>
              <span className="text-xs text-muted-foreground">Cost/{settings.distance_unit}</span>
              <p className="text-lg font-bold">{formatCurrency(metrics.costPerKm)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">Budget Utilization:</span>
            <span className="font-bold">{metrics.budgetUtilization.toFixed(1)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinancialTrendCard;
