import { useState } from "react";
import Layout from "@/components/Layout";
import KPICard from "@/components/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Truck, 
  Fuel, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  Clock,
  MapPin,
  Gauge,
  Eye,
  ChevronRight,
  RefreshCw
} from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import VehicleDetailModal from "@/components/VehicleDetailModal";

const Dashboard = () => {
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };
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
      <div className="p-8 space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Fleet Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">Real-time overview of your fleet operations</p>
          </div>
          <Button 
            variant="outline" 
            className="gap-2" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
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
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Live Vehicle Status</CardTitle>
              <Button variant="ghost" size="sm" className="gap-2">
                View All <ChevronRight className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {vehicles.map((vehicle) => (
                  <div 
                    key={vehicle.id} 
                    className="group flex items-center justify-between p-4 border border-border rounded-lg hover:shadow-md hover:border-primary/50 transition-all cursor-pointer bg-gradient-to-r hover:from-primary/5 hover:to-transparent"
                    onClick={() => setSelectedVehicle(vehicle)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg group-hover:scale-110 transition-transform">
                        <Truck className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          {vehicle.plate}
                          <span className="text-xs text-muted-foreground">#{vehicle.id}</span>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {vehicle.location}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            vehicle.fuel > 60 ? 'bg-success' : 
                            vehicle.fuel > 30 ? 'bg-warning' : 
                            'bg-destructive'
                          } animate-pulse`}></div>
                          <span className="text-sm font-medium">{vehicle.fuel}%</span>
                        </div>
                        <div className="text-xs text-muted-foreground">Fuel Level</div>
                      </div>
                      <StatusBadge status={vehicle.status} />
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="opacity-0 group-hover:opacity-100 transition-opacity gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVehicle(vehicle);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                        Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Alerts */}
          <Card className="border-warning/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-md bg-warning/10">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                  </div>
                  Recent Alerts
                </CardTitle>
                <Button variant="ghost" size="sm">View All</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentAlerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    className={`p-3 border rounded-lg hover:shadow-md transition-all cursor-pointer ${
                      alert.type === 'critical' ? 'border-destructive/30 bg-destructive/5' : 'border-warning/30 bg-warning/5'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle className={`w-5 h-5 mt-0.5 ${alert.type === 'critical' ? 'text-destructive animate-pulse' : 'text-warning'}`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{alert.message}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {alert.time}
                          </div>
                          <Button size="sm" variant="ghost" className="h-6 text-xs">
                            Acknowledge
                          </Button>
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

      {/* Vehicle Detail Modal */}
      <VehicleDetailModal
        open={!!selectedVehicle}
        onOpenChange={(open) => !open && setSelectedVehicle(null)}
        vehicle={selectedVehicle || {}}
      />
    </Layout>
  );
};

export default Dashboard;
