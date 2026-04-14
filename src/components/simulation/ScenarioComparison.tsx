import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Scenario {
  id: string;
  name: string;
  parameters: {
    fleetSize: number;
    avgDailyKm: number;
    fuelPrice: number;
    evPercent: number;
    optimizeRoutes: boolean;
    driverTraining: boolean;
  };
  results: {
    baselineFuelCostMonthly: number;
    projectedSavings: number;
    totalSavingsPercent: number;
    co2Reduction: number;
  };
}

interface ScenarioComparisonProps {
  scenarios: Scenario[];
  currentScenario: Scenario;
  formatCurrency: (n: number) => string;
}

const DeltaCell = ({ current, compare, format }: { current: number; compare: number; format: (n: number) => string }) => {
  const delta = current - compare;
  const pct = compare !== 0 ? ((delta / compare) * 100).toFixed(1) : "0";
  if (Math.abs(delta) < 0.01) return <span className="text-muted-foreground flex items-center gap-1"><Minus className="h-3 w-3" /> Same</span>;
  return (
    <span className={`flex items-center gap-1 ${delta > 0 ? "text-green-600" : "text-destructive"}`}>
      {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {delta > 0 ? "+" : ""}{pct}%
    </span>
  );
};

const ScenarioComparison = ({ scenarios, currentScenario, formatCurrency }: ScenarioComparisonProps) => {
  const compareList = [currentScenario, ...scenarios.slice(0, 2)];

  if (compareList.length < 2) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          <p>Save at least one scenario to enable comparison</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Scenario Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Metric</TableHead>
              {compareList.map((s, i) => (
                <TableHead key={s.id}>
                  <div className="flex items-center gap-2">
                    {s.name}
                    {i === 0 && <Badge variant="secondary" className="text-xs">Current</Badge>}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Fleet Size</TableCell>
              {compareList.map(s => <TableCell key={s.id}>{s.parameters.fleetSize.toLocaleString()}</TableCell>)}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">EV %</TableCell>
              {compareList.map(s => <TableCell key={s.id}>{s.parameters.evPercent}%</TableCell>)}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Monthly Savings</TableCell>
              {compareList.map((s, i) => (
                <TableCell key={s.id}>
                  <div>{formatCurrency(s.results.projectedSavings)}</div>
                  {i > 0 && <DeltaCell current={s.results.projectedSavings} compare={compareList[0].results.projectedSavings} format={formatCurrency} />}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Total Savings %</TableCell>
              {compareList.map((s, i) => (
                <TableCell key={s.id}>
                  <div>{(s.results.totalSavingsPercent * 100).toFixed(1)}%</div>
                  {i > 0 && <DeltaCell current={s.results.totalSavingsPercent} compare={compareList[0].results.totalSavingsPercent} format={(n) => `${(n * 100).toFixed(1)}%`} />}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">CO₂ Reduction (t/mo)</TableCell>
              {compareList.map((s, i) => (
                <TableCell key={s.id}>
                  <div>{s.results.co2Reduction.toFixed(0)} t</div>
                  {i > 0 && <DeltaCell current={s.results.co2Reduction} compare={compareList[0].results.co2Reduction} format={(n) => `${n.toFixed(0)} t`} />}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Annual Savings</TableCell>
              {compareList.map(s => <TableCell key={s.id} className="font-bold">{formatCurrency(s.results.projectedSavings * 12)}</TableCell>)}
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default ScenarioComparison;
