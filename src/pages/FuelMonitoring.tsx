import Layout from "@/components/Layout";
import KPICard from "@/components/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Fuel, TrendingDown, AlertTriangle, BarChart3, Droplet, DollarSign } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";

const FuelMonitoring = () => {
  const fuelEvents = [
    { id: 1, vehicle: "AA 1234", type: "refuel", amount: 45.5, timestamp: "2025-01-10 08:30", location: "Shell Station, Main St" },
    { id: 2, vehicle: "AB 5678", type: "theft", amount: -12.3, timestamp: "2025-01-10 03:15", location: "Parking Lot A" },
    { id: 3, vehicle: "AC 9012", type: "refuel", amount: 52.0, timestamp: "2025-01-09 16:45", location: "Total Station, Highway 12" },
    { id: 4, vehicle: "AD 3456", type: "leak", amount: -5.2, timestamp: "2025-01-09 14:20", location: "Route 45" },
  ];

  const topConsumers = [
    { vehicle: "AA 1234", consumption: 12.5, cost: 450, efficiency: 7.2 },
    { vehicle: "AB 5678", consumption: 11.8, cost: 425, efficiency: 7.5 },
    { vehicle: "AC 9012", consumption: 13.2, cost: 475, efficiency: 6.8 },
    { vehicle: "AD 3456", consumption: 10.5, cost: 380, efficiency: 8.1 },
  ];

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
            value="8,542L"
            subtitle="this month"
            icon={<Fuel className="w-5 h-5" />}
            trend={{ value: -5.2, label: "vs last month" }}
            variant="success"
          />
          <KPICard
            title="Fuel Cost"
            value="$12,450"
            subtitle="total expenditure"
            icon={<DollarSign className="w-5 h-5" />}
            trend={{ value: -3.8, label: "savings" }}
            variant="success"
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
            value="3"
            subtitle="suspected theft/leaks"
            icon={<AlertTriangle className="w-5 h-5" />}
            variant="warning"
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

          {/* Top Consumers */}
          <Card>
            <CardHeader>
              <CardTitle>Top Fuel Consumers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topConsumers.map((item, index) => (
                  <div key={item.vehicle} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{item.vehicle}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.consumption}L/100km • ${item.cost} total
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{item.efficiency}</div>
                      <div className="text-xs text-muted-foreground">L/100km</div>
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

export default FuelMonitoring;
