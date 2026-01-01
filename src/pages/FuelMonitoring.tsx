import { useMemo } from "react";
import Layout from "@/components/Layout";
import KPICard from "@/components/KPICard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Fuel, AlertTriangle, BarChart3, DollarSign, Loader2, Warehouse, FileText, Droplet, Bell } from "lucide-react";
import { useFuelEvents } from "@/hooks/useFuelEvents";
import { useVehicles } from "@/hooks/useVehicles";
import FuelTransactionsTab from "@/components/fuel/FuelTransactionsTab";
import FuelEventsTab from "@/components/fuel/FuelEventsTab";
import FuelTheftCasesTab from "@/components/fuel/FuelTheftCasesTab";
import FuelDepotsTab from "@/components/fuel/FuelDepotsTab";
import FuelConsumptionAlertsCard from "@/components/fuel/FuelConsumptionAlertsCard";

const FuelMonitoring = () => {
  const { fuelEvents: dbFuelEvents, loading } = useFuelEvents();
  const { vehicles } = useVehicles();

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
        <div className="flex items-center gap-4">
          <div className="p-4 rounded-2xl glass-strong glow">
            <Fuel className="w-8 h-8 text-primary float-animation" />
          </div>
          <div>
            <h1 className="text-4xl font-bold gradient-text">Fuel Management</h1>
            <p className="text-muted-foreground mt-1 text-lg">Track consumption, transactions, detect anomalies, and manage depots</p>
          </div>
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
            icon={<Droplet className="w-5 h-5" />}
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

        {/* Fuel Alerts Panel */}
        <FuelConsumptionAlertsCard />

        {/* Tabbed Content */}
        <Tabs defaultValue="events" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
            <TabsTrigger value="events" className="gap-2">
              <Droplet className="w-4 h-4" />
              Fuel Events
            </TabsTrigger>
            <TabsTrigger value="transactions" className="gap-2">
              <FileText className="w-4 h-4" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="theft" className="gap-2">
              <AlertTriangle className="w-4 h-4" />
              Theft Cases
            </TabsTrigger>
            <TabsTrigger value="depots" className="gap-2">
              <Warehouse className="w-4 h-4" />
              Depots
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-2">
              <Bell className="w-4 h-4" />
              Alerts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events">
            <FuelEventsTab />
          </TabsContent>
          <TabsContent value="transactions">
            <FuelTransactionsTab />
          </TabsContent>
          <TabsContent value="theft">
            <FuelTheftCasesTab />
          </TabsContent>
          <TabsContent value="depots">
            <FuelDepotsTab />
          </TabsContent>
          <TabsContent value="alerts">
            <FuelConsumptionAlertsCard />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default FuelMonitoring;
