import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Badge } from "@/components/ui/badge";

interface ProjectionChartProps {
  baselineMonthly: number;
  projectedSavings: number;
  evPercent: number;
  months?: number;
  formatCurrency: (n: number) => string;
}

const ProjectionChart = ({ baselineMonthly, projectedSavings, evPercent, months = 12, formatCurrency }: ProjectionChartProps) => {
  const data = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    let cumulativeBaseline = 0;
    let cumulativeOptimized = 0;

    return Array.from({ length: months }, (_, i) => {
      const monthIdx = (now.getMonth() + i) % 12;
      // Seasonal fuel variation (winter +8%, summer -5%)
      const seasonal = 1 + ([11, 0, 1].includes(monthIdx) ? 0.08 : [5, 6, 7].includes(monthIdx) ? -0.05 : 0);
      // EV ramp-up: linear from current to target over 12 months
      const evRamp = 1 + (i / months) * 0.1;

      const monthBaseline = baselineMonthly * seasonal;
      const monthOptimized = (baselineMonthly - projectedSavings * evRamp) * seasonal;

      cumulativeBaseline += monthBaseline;
      cumulativeOptimized += Math.max(monthOptimized, monthBaseline * 0.3);

      return {
        month: monthNames[monthIdx],
        baseline: Math.round(monthBaseline),
        optimized: Math.round(Math.max(monthOptimized, monthBaseline * 0.3)),
        savings: Math.round(monthBaseline - Math.max(monthOptimized, monthBaseline * 0.3)),
        cumSavings: Math.round(cumulativeBaseline - cumulativeOptimized),
      };
    });
  }, [baselineMonthly, projectedSavings, evPercent, months]);

  const totalSavings = data[data.length - 1]?.cumSavings || 0;
  const roi = baselineMonthly > 0 ? ((totalSavings / (baselineMonthly * 12)) * 100).toFixed(1) : "0";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">12-Month Cost Projection</CardTitle>
          <div className="flex gap-2">
            <Badge className="bg-green-600">{formatCurrency(totalSavings)} annual savings</Badge>
            <Badge variant="outline">{roi}% ROI</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="month" fontSize={11} />
            <YAxis tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} fontSize={11} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Legend />
            <Line type="monotone" dataKey="baseline" stroke="hsl(var(--destructive))" strokeWidth={2} name="Current Cost" dot={false} />
            <Line type="monotone" dataKey="optimized" stroke="hsl(var(--primary))" strokeWidth={2} name="Optimized Cost" dot={false} />
            <Line type="monotone" dataKey="savings" stroke="hsl(0 142 71%)" strokeWidth={2} strokeDasharray="5 5" name="Monthly Savings" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default ProjectionChart;
