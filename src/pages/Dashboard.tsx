import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import KPICard from "@/components/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  StatCardSkeleton,
  ChartSkeleton,
  DashboardVehicleListSkeleton,
  AlertItemSkeleton,
} from "@/components/ui/skeletons";
import { 
  Truck, 
  Fuel, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  Clock,
  MapPin,
  Eye,
  ChevronRight,
  RefreshCw,
  Activity,
  Route,
} from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import VehicleDetailModal from "@/components/VehicleDetailModal";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line } from "recharts";
import { useVehicles } from "@/hooks/useVehicles";
import { useAlerts } from "@/hooks/useAlerts";
import { useFuelEvents } from "@/hooks/useFuelEvents";

const Dashboard = () => {
  const navigate = useNavigate();
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { vehicles: dbVehicles, loading: vehiclesLoading, refetch } = useVehicles();
  const { alerts: dbAlerts, loading: alertsLoading } = useAlerts({ status: 'unacknowledged' });
  const { fuelEvents: dbFuelEvents } = useFuelEvents();

  const handleRefresh = () => {
    setRefreshing(true);
    refetch();
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Transform vehicles for display
  const vehicles = useMemo(() => {
    return dbVehicles.slice(0, 5).map(v => ({
      id: v.id,
      plate: (v as any).license_plate || 'Unknown',
      status: (v.status === 'active' ? 'moving' : v.status === 'maintenance' ? 'idle' : 'offline') as 'moving' | 'idle' | 'offline',
      fuel: v.current_fuel || 50,
      location: "Live tracking"
    }));
  }, [dbVehicles]);

  // Transform alerts for display
  const recentAlerts = useMemo(() => {
    return dbAlerts.slice(0, 3).map((alert, idx) => {
      const vehicle = dbVehicles.find(v => v.id === alert.vehicle_id);
      return {
        id: alert.id,
        type: alert.severity === 'critical' ? 'critical' : 'warning',
        message: `${alert.alert_type} - Vehicle ${vehicle?.plate_number || 'Unknown'}`,
        time: new Date(alert.alert_time).toLocaleString()
      };
    });
  }, [dbAlerts, dbVehicles]);

  // Vehicle status distribution for pie chart
  const vehicleStatusData = useMemo(() => {
    const moving = dbVehicles.filter(v => v.status === 'active').length;
    const maintenance = dbVehicles.filter(v => v.status === 'maintenance').length;
    const inactive = dbVehicles.filter(v => v.status === 'inactive').length;
    return [
      { name: "Active", value: moving, color: "hsl(var(--success))" },
      { name: "Maintenance", value: maintenance, color: "hsl(var(--warning))" },
      { name: "Inactive", value: inactive, color: "hsl(var(--destructive))" },
    ];
  }, [dbVehicles]);

  // Fuel consumption trend data - aggregate by day
  const fuelTrendData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const refuels = dbFuelEvents.filter(e => e.event_type === 'refuel');
    const byDay = days.map((day, idx) => {
      const dayEvents = refuels.filter(e => new Date(e.event_time).getDay() === idx);
      const total = dayEvents.reduce((sum, e) => sum + Math.abs(e.fuel_change_liters), 0);
      return { day, consumption: Math.round(total) };
    });
    return byDay;
  }, [dbFuelEvents]);

  // Trips per hour data
  const tripsData = [
    { hour: "00:00", trips: 5 },
    { hour: "04:00", trips: 8 },
    { hour: "08:00", trips: 45 },
    { hour: "12:00", trips: 62 },
    { hour: "16:00", trips: 58 },
    { hour: "20:00", trips: 28 },
  ];

  // Show skeleton content instead of blocking loader
  const isLoading = vehiclesLoading || alertsLoading;

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

        {/* KPI Grid - show skeletons while loading */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {isLoading && dbVehicles.length === 0 ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <StatCardSkeleton key={i} />
              ))}
            </>
          ) : (
            <>
              <KPICard
                title="Active Vehicles"
                value={dbVehicles.filter(v => v.status === 'active').length}
                subtitle={`of ${dbVehicles.length} total`}
                icon={<Truck className="w-5 h-5" />}
                variant="default"
                animationDelay={0}
              />
              <KPICard
                title="Total Fuel Events"
                value={dbFuelEvents.length}
                subtitle="tracked events"
                icon={<Fuel className="w-5 h-5" />}
                variant="success"
                animationDelay={100}
              />
              <KPICard
                title="Fleet Size"
                value={dbVehicles.length}
                subtitle="total vehicles"
                icon={<DollarSign className="w-5 h-5" />}
                variant="default"
                animationDelay={200}
              />
              <KPICard
                title="Active Alerts"
                value={dbAlerts.length}
                subtitle={`${dbAlerts.filter(a => a.severity === 'critical').length} critical`}
                icon={<AlertTriangle className="w-5 h-5" />}
                variant="warning"
                animationDelay={300}
              />
            </>
          )}
        </div>
        {/* Charts Row - Circular KPIs and Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Vehicle Status Distribution - Circular Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Fleet Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={vehicleStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {vehicleStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-3 mt-4">
                {vehicleStatusData.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <div>
                      <div className="text-xs text-muted-foreground">{item.name}</div>
                      <div className="font-semibold">{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Fuel Consumption Trend */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Fuel Consumption (Liters)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={fuelTrendData}>
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="consumption" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Trips Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="w-5 h-5 text-primary" />
              Trip Activity by Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={tripsData}>
                <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                />
                <Bar dataKey="trips" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Vehicle Status */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Live Vehicle Status</CardTitle>
              <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate('/fleet')}>
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
                <Button variant="ghost" size="sm" onClick={() => navigate('/alerts')}>View All</Button>
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
