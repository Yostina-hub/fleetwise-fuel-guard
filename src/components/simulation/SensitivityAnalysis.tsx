import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";

interface SensitivityAnalysisProps {
  fleetSize: number;
  avgDailyKm: number;
  fuelPrice: number;
  evPercent: number;
  optimizeRoutes: boolean;
  driverTraining: boolean;
  formatCurrency: (n: number) => string;
}

function calculateSavings(params: {
  fleetSize: number; avgDailyKm: number; fuelPrice: number;
  evPercent: number; optimizeRoutes: boolean; driverTraining: boolean;
}) {
  const baseline = params.fleetSize * params.avgDailyKm * 30 * 0.12 * params.fuelPrice;
  const routeS = params.optimizeRoutes ? 0.15 : 0;
  const trainS = params.driverTraining ? 0.08 : 0;
  const evS = (params.evPercent / 100) * 0.40;
  return baseline * (routeS + trainS + evS);
}

const SensitivityAnalysis = (props: SensitivityAnalysisProps) => {
  const tornado = useMemo(() => {
    const base = calculateSavings(props);
    const factors = [
      { name: "Fleet Size", key: "fleetSize", low: props.fleetSize * 0.8, high: props.fleetSize * 1.2 },
      { name: "Daily Distance", key: "avgDailyKm", low: props.avgDailyKm * 0.8, high: props.avgDailyKm * 1.2 },
      { name: "Fuel Price", key: "fuelPrice", low: props.fuelPrice * 0.75, high: props.fuelPrice * 1.25 },
      { name: "EV %", key: "evPercent", low: Math.max(0, props.evPercent - 15), high: Math.min(100, props.evPercent + 15) },
    ];

    return factors.map(f => {
      const lowParams = { ...props, [f.key]: f.low };
      const highParams = { ...props, [f.key]: f.high };
      const lowSavings = calculateSavings(lowParams);
      const highSavings = calculateSavings(highParams);
      return {
        name: f.name,
        low: lowSavings - base,
        high: highSavings - base,
        range: Math.abs(highSavings - lowSavings),
      };
    }).sort((a, b) => b.range - a.range);
  }, [props]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Sensitivity Analysis (Tornado Chart)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={tornado} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis type="number" tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} fontSize={11} />
            <YAxis type="category" dataKey="name" width={100} fontSize={12} />
            <Tooltip formatter={(v: number) => props.formatCurrency(v)} />
            <ReferenceLine x={0} stroke="hsl(var(--muted-foreground))" />
            <Bar dataKey="low" stackId="a" fill="hsl(var(--destructive))" fillOpacity={0.7} />
            <Bar dataKey="high" stackId="b" fill="hsl(var(--primary))" fillOpacity={0.7} />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Shows how ±20% change in each parameter affects monthly savings relative to baseline
        </p>
      </CardContent>
    </Card>
  );
};

export default SensitivityAnalysis;
