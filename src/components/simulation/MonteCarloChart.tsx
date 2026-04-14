import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Badge } from "@/components/ui/badge";

interface MonteCarloChartProps {
  baselineMonthly: number;
  totalSavingsPercent: number;
  fleetSize: number;
  iterations?: number;
  formatCurrency: (n: number) => string;
}

function runMonteCarlo(baseline: number, savingsPercent: number, iterations: number) {
  const results: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const variance = 1 + (Math.random() - 0.5) * 0.3; // ±15%
    const savingsVar = savingsPercent * (1 + (Math.random() - 0.5) * 0.4); // ±20%
    const savings = baseline * variance * Math.min(savingsVar, 0.95);
    results.push(savings);
  }
  results.sort((a, b) => a - b);
  return results;
}

function percentile(sorted: number[], p: number) {
  const idx = Math.floor(sorted.length * p);
  return sorted[Math.min(idx, sorted.length - 1)];
}

const MonteCarloChart = ({ baselineMonthly, totalSavingsPercent, fleetSize, iterations = 1000, formatCurrency }: MonteCarloChartProps) => {
  const { distribution, p10, p50, p90, mean } = useMemo(() => {
    const results = runMonteCarlo(baselineMonthly, totalSavingsPercent, iterations);
    const p10 = percentile(results, 0.1);
    const p50 = percentile(results, 0.5);
    const p90 = percentile(results, 0.9);
    const mean = results.reduce((a, b) => a + b, 0) / results.length;

    // Build histogram
    const min = results[0];
    const max = results[results.length - 1];
    const bucketCount = 30;
    const bucketSize = (max - min) / bucketCount;
    const buckets = Array.from({ length: bucketCount }, (_, i) => {
      const lo = min + i * bucketSize;
      const hi = lo + bucketSize;
      const count = results.filter(r => r >= lo && r < hi).length;
      return { value: Math.round(lo), count, frequency: (count / iterations) * 100 };
    });

    return { distribution: buckets, p10, p50, p90, mean };
  }, [baselineMonthly, totalSavingsPercent, iterations]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Monte Carlo Distribution ({iterations.toLocaleString()} iterations)</CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-orange-600 border-orange-300">P10: {formatCurrency(p10)}</Badge>
            <Badge variant="outline" className="text-blue-600 border-blue-300">P50: {formatCurrency(p50)}</Badge>
            <Badge variant="outline" className="text-green-600 border-green-300">P90: {formatCurrency(p90)}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={distribution}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="value" tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} fontSize={11} />
            <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} fontSize={11} />
            <Tooltip
              formatter={(val: number) => [`${val.toFixed(1)}%`, "Frequency"]}
              labelFormatter={(v) => formatCurrency(v as number)}
            />
            <ReferenceLine x={Math.round(p50)} stroke="hsl(var(--primary))" strokeDasharray="5 5" label="P50" />
            <Area type="monotone" dataKey="frequency" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
          </AreaChart>
        </ResponsiveContainer>
        <div className="mt-3 grid grid-cols-3 gap-4 text-center text-sm">
          <div><p className="text-muted-foreground">Conservative (P10)</p><p className="font-bold text-orange-600">{formatCurrency(p10)}/mo</p></div>
          <div><p className="text-muted-foreground">Expected (P50)</p><p className="font-bold text-blue-600">{formatCurrency(p50)}/mo</p></div>
          <div><p className="text-muted-foreground">Optimistic (P90)</p><p className="font-bold text-green-600">{formatCurrency(p90)}/mo</p></div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MonteCarloChart;
