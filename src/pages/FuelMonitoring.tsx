import { useMemo } from "react";
import Layout from "@/components/Layout";
import KPICard from "@/components/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Fuel, TrendingDown, AlertTriangle, BarChart3, Droplet, DollarSign, Loader2 } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { useFuelEvents } from "@/hooks/useFuelEvents";
import { useVehicles } from "@/hooks/useVehicles";

const FuelMonitoring = () => {
  const { fuelEvents: dbFuelEvents, loading } = useFuelEvents();
  const { vehicles } = useVehicles();

  // Transform fuel events to display format
  const fuelEvents = useMemo(() => {
    return dbFuelEvents.slice(0, 10).map(event => {
      const vehicle = vehicles.find(v => v.id === event.vehicle_id);
      return {
        id: event.id,
        vehicle: vehicle?.plate_number || "Unknown",
        type: event.event_type,
        amount: event.fuel_change_liters,
        timestamp: new Date(event.event_time).toLocaleString(),
        location: event.location_name || "Unknown location"
      };
    });
  }, [dbFuelEvents, vehicles]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalConsumption = dbFuelEvents
      .filter(e => e.event_type === 'refuel')
      .reduce((sum, e) => sum + Math.abs(e.fuel_change_liters), 0);
    
    const anomalyCount = dbFuelEvents
      .filter(e => e.event_type === 'theft' || e.event_type === 'leak')
      .length;

    return {
      totalConsumption: totalConsumption.toFixed(0),
      anomalyCount
    };
  }, [dbFuelEvents]);

  if (loading) {
    return (
      <Layout>
        <div className="p-8 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading fuel data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Fuel Monitoring</h1>
          <p className="text-muted-foreground mt-1">Track fuel consumption, detect anomalies, and optimize costs</p>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Total Consumption"
            value={`${stats.totalConsumption}L`}
            subtitle="total refuels"
            icon={<Fuel className="w-5 h-5" />}
            trend={{ value: -5.2, label: "vs last month" }}
            variant="success"
          />
          <KPICard
            title="Fuel Events"
            value={dbFuelEvents.length.toString()}
            subtitle="total events tracked"
            icon={<DollarSign className="w-5 h-5" />}
            variant="default"
          />
          <KPICard
            title="Avg. Efficiency"
            value="7.5 L/100km"
            subtitle="fleet average"
            icon={<BarChart3 className="w-5 h-5" />}
            trend={{ value: 2.1, label: "improvement" }}
            variant="success"
          />
          <KPICard
            title="Anomalies"
            value={stats.anomalyCount.toString()}
            subtitle="suspected theft/leaks"
            icon={<AlertTriangle className="w-5 h-5" />}
            variant={stats.anomalyCount > 0 ? "warning" : "success"}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Consumption Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
                <div className="text-center text-muted-foreground">
                  <TrendingDown className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">7-day fuel consumption chart</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cost Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
                <div className="text-center text-muted-foreground">
                  <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Cost breakdown by vehicle</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Fuel Events */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Fuel Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {fuelEvents.map((event) => (
                  <div key={event.id} className="p-4 border border-border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-semibold">{event.vehicle}</div>
                        <div className="text-xs text-muted-foreground">{event.timestamp}</div>
                      </div>
                      <StatusBadge 
                        status={event.type === 'refuel' ? 'online' : event.type === 'theft' ? 'critical' : 'warning'} 
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Droplet className={`w-4 h-4 ${event.amount > 0 ? 'text-success' : 'text-destructive'}`} />
                      <span className={`font-medium ${event.amount > 0 ? 'text-success' : 'text-destructive'}`}>
                        {event.amount > 0 ? '+' : ''}{event.amount}L
                      </span>
                      <span className="text-sm text-muted-foreground">• {event.location}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Fuel Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Vehicles with Most Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vehicles.slice(0, 5).map((vehicle, index) => {
                  const vehicleEvents = dbFuelEvents.filter(e => e.vehicle_id === vehicle.id);
                  return (
                    <div key={vehicle.id} className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">{vehicle.plate_number}</div>
                        <div className="text-sm text-muted-foreground">
                          {vehicle.make} {vehicle.model}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{vehicleEvents.length}</div>
                        <div className="text-xs text-muted-foreground">events</div>
                      </div>
                    </div>
                  );
                })}
                {vehicles.length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                    No vehicles found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default FuelMonitoring;
