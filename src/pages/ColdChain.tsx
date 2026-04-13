import { useState } from "react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Thermometer, AlertTriangle, BarChart3, History, DoorOpen } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const mockReadings = Array.from({ length: 24 }, (_, i) => ({
  time: `${String(i).padStart(2, "0")}:00`,
  temp: -18 + Math.random() * 4 - 2,
  humidity: 65 + Math.random() * 10,
}));

const coldChainVehicles = [
  { id: "1", plate: "ET-COLD-01", cargo: "Pharmaceuticals", temp: -19.2, humidity: 68, minThresh: -25, maxThresh: -15, doorStatus: "closed", compressor: "running", status: "normal", lastReading: "2 min ago" },
  { id: "2", plate: "ET-COLD-02", cargo: "Frozen Food", temp: -17.8, humidity: 72, minThresh: -22, maxThresh: -16, doorStatus: "closed", compressor: "running", status: "normal", lastReading: "1 min ago" },
  { id: "3", plate: "ET-COLD-03", cargo: "Dairy Products", temp: -12.5, humidity: 80, minThresh: -20, maxThresh: -15, doorStatus: "open", compressor: "running", status: "alarm", lastReading: "30 sec ago" },
  { id: "4", plate: "ET-COLD-04", cargo: "Vaccines", temp: -20.1, humidity: 65, minThresh: -25, maxThresh: -18, doorStatus: "closed", compressor: "standby", status: "normal", lastReading: "3 min ago" },
];

const alarms = [
  { id: "1", plate: "ET-COLD-03", type: "Temperature Breach", message: "Temperature above max threshold (-15°C). Current: -12.5°C", severity: "critical", time: "2 min ago" },
  { id: "2", plate: "ET-COLD-03", type: "Door Open", message: "Rear cargo door has been open for 8 minutes", severity: "warning", time: "8 min ago" },
  { id: "3", plate: "ET-COLD-02", type: "Humidity Alert", message: "Humidity reached 72%, above 70% threshold", severity: "info", time: "25 min ago" },
];

const ColdChain = () => {
  const [activeTab, setActiveTab] = useState("live");

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Thermometer className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Cold Chain Monitoring</h1>
            <p className="text-muted-foreground text-xs">Real-time temperature & humidity tracking for refrigerated vehicles</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Monitored Vehicles</p>
            <p className="text-2xl font-bold">{coldChainVehicles.length}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Normal</p>
            <p className="text-2xl font-bold text-emerald-600">{coldChainVehicles.filter(v => v.status === "normal").length}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Alarms</p>
            <p className="text-2xl font-bold text-destructive">{coldChainVehicles.filter(v => v.status === "alarm").length}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Doors Open</p>
            <p className="text-2xl font-bold text-amber-600">{coldChainVehicles.filter(v => v.doorStatus === "open").length}</p>
          </CardContent></Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="live" className="gap-1.5"><Thermometer className="w-3.5 h-3.5" /> Live Status</TabsTrigger>
            <TabsTrigger value="chart" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Temperature Chart</TabsTrigger>
            <TabsTrigger value="alarms" className="gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Alarms</TabsTrigger>
          </TabsList>

          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="mt-4">
            <TabsContent value="live" className="mt-0 space-y-3">
              {coldChainVehicles.map(v => (
                <Card key={v.id} className={v.status === "alarm" ? "border-destructive/50" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{v.plate}</span>
                          {v.status === "alarm" ? <Badge variant="destructive">ALARM</Badge> : <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Normal</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{v.cargo} • Last: {v.lastReading}</p>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <Thermometer className="w-4 h-4 mx-auto text-cyan-500" />
                          <p className={`font-bold ${v.temp > v.maxThresh ? "text-destructive" : ""}`}>{v.temp}°C</p>
                          <p className="text-xs text-muted-foreground">{v.minThresh} to {v.maxThresh}°C</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Humidity</p>
                          <p className="font-bold">{v.humidity}%</p>
                        </div>
                        <div className="text-center">
                          <DoorOpen className={`w-4 h-4 mx-auto ${v.doorStatus === "open" ? "text-amber-500" : "text-muted-foreground"}`} />
                          <p className={`font-bold capitalize ${v.doorStatus === "open" ? "text-amber-600" : ""}`}>{v.doorStatus}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Compressor</p>
                          <p className="font-bold capitalize">{v.compressor}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="chart" className="mt-0">
              <Card>
                <CardHeader><CardTitle className="text-lg">24h Temperature Trend (ET-COLD-01)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={mockReadings}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="time" className="text-xs" />
                      <YAxis domain={[-25, -10]} className="text-xs" />
                      <Tooltip />
                      <ReferenceLine y={-15} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label="Max" />
                      <ReferenceLine y={-25} stroke="hsl(var(--primary))" strokeDasharray="5 5" label="Min" />
                      <Line type="monotone" dataKey="temp" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Temperature (°C)" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="alarms" className="mt-0 space-y-3">
              {alarms.map(alarm => (
                <Card key={alarm.id} className={alarm.severity === "critical" ? "border-destructive/50" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{alarm.plate}</span>
                          <Badge variant={alarm.severity === "critical" ? "destructive" : "outline"} className="capitalize">{alarm.type}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{alarm.message}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{alarm.time}</p>
                        <Button size="sm" variant="outline" className="mt-1">Acknowledge</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </motion.div>
        </Tabs>
      </div>
    </Layout>
  );
};

export default ColdChain;
