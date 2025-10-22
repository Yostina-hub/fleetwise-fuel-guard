import Layout from "@/components/Layout";
import KPICard from "@/components/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Truck, 
  Fuel, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  Clock,
  MapPin,
  Gauge
} from "lucide-react";
import StatusBadge from "@/components/StatusBadge";

const Dashboard = () => {
  const vehicles = [
    { id: "V-001", plate: "AA 1234", status: "moving" as const, fuel: 75, location: "Highway 45" },
    { id: "V-002", plate: "AB 5678", status: "idle" as const, fuel: 45, location: "Depot A" },
    { id: "V-003", plate: "AC 9012", status: "stopped" as const, fuel: 90, location: "Customer Site" },
    { id: "V-004", plate: "AD 3456", status: "moving" as const, fuel: 35, location: "Route 12" },
    { id: "V-005", plate: "AE 7890", status: "offline" as const, fuel: 60, location: "Last: Depot B" },
  ];

  const recentAlerts = [
    { id: 1, type: "warning", message: "Low fuel detected - Vehicle AA 1234", time: "5 min ago" },
    { id: 2, type: "critical", message: "Suspected fuel theft - Vehicle AB 5678", time: "12 min ago" },
    { id: 3, type: "warning", message: "Excessive idling - Vehicle AC 9012", time: "25 min ago" },
  ];

  return (
    <Layout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Fleet Dashboard</h1>
          <p className="text-muted-foreground mt-1">Real-time overview of your fleet operations</p>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Active Vehicles"
            value="142"
            subtitle="of 150 total"
            icon={<Truck className="w-5 h-5" />}
            trend={{ value: 5, label: "from last week" }}
            variant="default"
          />
          <KPICard
            title="Fuel Savings"
            value="18.5%"
            subtitle="vs. last month"
            icon={<Fuel className="w-5 h-5" />}
            trend={{ value: 3.2, label: "improvement" }}
            variant="success"
          />
          <KPICard
            title="Cost per KM"
            value="$2.45"
            subtitle="avg. operating cost"
            icon={<DollarSign className="w-5 h-5" />}
            trend={{ value: -2.1, label: "reduction" }}
            variant="success"
          />
          <KPICard
            title="Active Alerts"
            value="7"
            subtitle="3 critical, 4 warning"
            icon={<AlertTriangle className="w-5 h-5" />}
            variant="warning"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Fuel Consumption Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
                <div className="text-center text-muted-foreground">
                  <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Chart visualization</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fleet Utilization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
                <div className="text-center text-muted-foreground">
                  <Gauge className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Chart visualization</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Vehicle Status */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Vehicle Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vehicles.map((vehicle) => (
                  <div key={vehicle.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Truck className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold">{vehicle.plate}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {vehicle.location}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">{vehicle.fuel}%</div>
                        <div className="text-xs text-muted-foreground">Fuel</div>
                      </div>
                      <StatusBadge status={vehicle.status} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentAlerts.map((alert) => (
                  <div key={alert.id} className="p-3 border border-border rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className={`w-4 h-4 mt-0.5 ${alert.type === 'critical' ? 'text-destructive' : 'text-warning'}`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{alert.message}</p>
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {alert.time}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
