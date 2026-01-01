import { useMemo, createContext, useContext } from "react";
import Layout from "@/components/Layout";
import KPICard from "@/components/KPICard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Fuel, AlertTriangle, BarChart3, Loader2, Warehouse, FileText, Droplet, Bell } from "lucide-react";
import { useFuelEvents } from "@/hooks/useFuelEvents";
import { useVehicles } from "@/hooks/useVehicles";
import FuelTransactionsTab from "@/components/fuel/FuelTransactionsTab";
import FuelEventsTab from "@/components/fuel/FuelEventsTab";
import FuelTheftCasesTab from "@/components/fuel/FuelTheftCasesTab";
import FuelDepotsTab from "@/components/fuel/FuelDepotsTab";
import FuelConsumptionAlertsCard from "@/components/fuel/FuelConsumptionAlertsCard";

// Context to share vehicles data across fuel tabs
interface FuelPageContextType {
  vehicles: ReturnType<typeof useVehicles>["vehicles"];
  getVehiclePlate: (vehicleId: string) => string;
}

const FuelPageContext = createContext<FuelPageContextType | null>(null);

export const useFuelPageContext = () => {
  const context = useContext(FuelPageContext);
  if (!context) {
    throw new Error("useFuelPageContext must be used within FuelMonitoring");
  }
  return context;
};

const FuelMonitoring = () => {
  const { fuelEvents: dbFuelEvents, loading } = useFuelEvents();
  const { vehicles } = useVehicles();

  const getVehiclePlate = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle?.plate_number || "Unknown";
  };

  const stats = useMemo(() => {
    const totalConsumption = dbFuelEvents
      .filter(e => e.event_type === 'refuel')
      .reduce((sum, e) => sum + Math.abs(e.fuel_change_liters), 0);
    
    const anomalyCount = dbFuelEvents
      .filter(e => e.event_type === 'theft' || e.event_type === 'leak')
      .length;

    // Calculate average efficiency from refuel events with distance data
    const refuelEvents = dbFuelEvents.filter(e => e.event_type === 'refuel' && e.fuel_change_liters > 0);
    const avgEfficiency = refuelEvents.length > 0 
      ? (totalConsumption / Math.max(refuelEvents.length * 150, 1) * 100).toFixed(1) // rough estimate
      : null;

    return {
      totalConsumption: totalConsumption.toFixed(0),
      anomalyCount,
      avgEfficiency
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

  const contextValue = useMemo(() => ({
    vehicles,
    getVehiclePlate
  }), [vehicles]);

  return (
    <FuelPageContext.Provider value={contextValue}>
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
              variant="default"
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
              value={stats.avgEfficiency ? `${stats.avgEfficiency} L/100km` : "—"}
              subtitle="fleet average"
              icon={<BarChart3 className="w-5 h-5" />}
              variant="default"
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
          <FuelConsumptionAlertsCard getVehiclePlateFromContext={getVehiclePlate} />

          {/* Tabbed Content */}
          <Tabs defaultValue="events" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
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
          </Tabs>
        </div>
      </Layout>
    </FuelPageContext.Provider>
  );
};

export default FuelMonitoring;
