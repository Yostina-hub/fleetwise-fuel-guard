import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Brain, TrendingUp, TrendingDown, Fuel, Truck, DollarSign, Leaf, Play, RotateCcw } from "lucide-react";

const PerformanceSimulation = () => {
  const [fleetSize, setFleetSize] = useState(3400);
  const [avgDailyKm, setAvgDailyKm] = useState(120);
  const [fuelPrice, setFuelPrice] = useState(65);
  const [evPercent, setEvPercent] = useState([10]);
  const [optimizeRoutes, setOptimizeRoutes] = useState(true);
  const [driverTraining, setDriverTraining] = useState(true);
  const [simulationRun, setSimulationRun] = useState(false);

  const baselineFuelCostMonthly = fleetSize * avgDailyKm * 30 * 0.12 * fuelPrice;
  const routeSavings = optimizeRoutes ? 0.15 : 0;
  const trainingSavings = driverTraining ? 0.08 : 0;
  const evSavings = (evPercent[0] / 100) * 0.40;
  const totalSavingsPercent = routeSavings + trainingSavings + evSavings;
  const projectedSavings = baselineFuelCostMonthly * totalSavingsPercent;
  const co2Reduction = fleetSize * avgDailyKm * 30 * 0.00023 * totalSavingsPercent;

  const runSimulation = () => setSimulationRun(true);
  const resetSimulation = () => {
    setSimulationRun(false);
    setFleetSize(3400);
    setAvgDailyKm(120);
    setFuelPrice(65);
    setEvPercent([10]);
    setOptimizeRoutes(true);
    setDriverTraining(true);
  };

  const formatCurrency = (n: number) => new Intl.NumberFormat("en-ET", { style: "currency", currency: "ETB", maximumFractionDigits: 0 }).format(n);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Performance Simulation</h1>
            <p className="text-muted-foreground">What-if analysis & decision support for fleet optimization</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetSimulation}><RotateCcw className="h-4 w-4 mr-2" /> Reset</Button>
            <Button onClick={runSimulation}><Play className="h-4 w-4 mr-2" /> Run Simulation</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Parameters Panel */}
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle className="text-lg">Simulation Parameters</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label>Fleet Size</Label>
                <Input type="number" value={fleetSize} onChange={e => setFleetSize(+e.target.value)} />
              </div>
              <div>
                <Label>Avg Daily Distance (km/vehicle)</Label>
                <Input type="number" value={avgDailyKm} onChange={e => setAvgDailyKm(+e.target.value)} />
              </div>
              <div>
                <Label>Fuel Price (ETB/liter)</Label>
                <Input type="number" value={fuelPrice} onChange={e => setFuelPrice(+e.target.value)} />
              </div>
              <div>
                <Label>EV Fleet Percentage: {evPercent[0]}%</Label>
                <Slider value={evPercent} onValueChange={setEvPercent} min={0} max={100} step={5} className="mt-2" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={optimizeRoutes} onChange={e => setOptimizeRoutes(e.target.checked)} className="rounded" />
                <Label className="cursor-pointer">Enable AI Route Optimization</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={driverTraining} onChange={e => setDriverTraining(e.target.checked)} className="rounded" />
                <Label className="cursor-pointer">Driver Training Program</Label>
              </div>
            </CardContent>
          </Card>

          {/* Results Panel */}
          <div className="lg:col-span-2 space-y-4">
            {simulationRun ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card><CardContent className="pt-6 text-center"><DollarSign className="h-6 w-6 mx-auto text-green-600 mb-1" /><p className="text-lg font-bold">{formatCurrency(projectedSavings)}</p><p className="text-xs text-muted-foreground">Monthly Savings</p></CardContent></Card>
                  <Card><CardContent className="pt-6 text-center"><Fuel className="h-6 w-6 mx-auto text-blue-500 mb-1" /><p className="text-lg font-bold">{(totalSavingsPercent * 100).toFixed(1)}%</p><p className="text-xs text-muted-foreground">Fuel Reduction</p></CardContent></Card>
                  <Card><CardContent className="pt-6 text-center"><Leaf className="h-6 w-6 mx-auto text-green-500 mb-1" /><p className="text-lg font-bold">{co2Reduction.toFixed(0)} t</p><p className="text-xs text-muted-foreground">CO₂ Reduction/mo</p></CardContent></Card>
                  <Card><CardContent className="pt-6 text-center"><TrendingUp className="h-6 w-6 mx-auto text-primary mb-1" /><p className="text-lg font-bold">{formatCurrency(projectedSavings * 12)}</p><p className="text-xs text-muted-foreground">Annual Savings</p></CardContent></Card>
                </div>

                <Card>
                  <CardHeader><CardTitle>Savings Breakdown</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1"><span>Route Optimization</span><span className="font-medium">{optimizeRoutes ? "15%" : "0%"}</span></div>
                      <Progress value={optimizeRoutes ? 15 : 0} className="h-3" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1"><span>Driver Training Impact</span><span className="font-medium">{driverTraining ? "8%" : "0%"}</span></div>
                      <Progress value={driverTraining ? 8 : 0} className="h-3" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1"><span>EV Transition ({evPercent[0]}% fleet)</span><span className="font-medium">{(evSavings * 100).toFixed(1)}%</span></div>
                      <Progress value={evSavings * 100} className="h-3" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Scenario Comparison</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                        <p className="text-sm font-medium text-destructive mb-2">Current State (Baseline)</p>
                        <p className="text-2xl font-bold">{formatCurrency(baselineFuelCostMonthly)}</p>
                        <p className="text-xs text-muted-foreground">Monthly fuel cost</p>
                      </div>
                      <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                        <p className="text-sm font-medium text-green-600 mb-2">Optimized Scenario</p>
                        <p className="text-2xl font-bold">{formatCurrency(baselineFuelCostMonthly - projectedSavings)}</p>
                        <p className="text-xs text-muted-foreground">Projected monthly cost</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="flex items-center justify-center h-80">
                <div className="text-center text-muted-foreground">
                  <Brain className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <h3 className="text-lg font-medium">Configure parameters & run simulation</h3>
                  <p className="text-sm mt-1">Adjust fleet parameters on the left and click "Run Simulation"</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PerformanceSimulation;
