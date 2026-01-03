import { useMemo, useState, useRef } from "react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Fuel, AlertTriangle, Loader2, Warehouse, FileText, Droplet, MapPin } from "lucide-react";
import { useFuelEvents } from "@/hooks/useFuelEvents";
import { useVehicles } from "@/hooks/useVehicles";
import { useDrivers } from "@/hooks/useDrivers";
import FuelTransactionsTab from "@/components/fuel/FuelTransactionsTab";
import FuelEventsTab from "@/components/fuel/FuelEventsTab";
import FuelTheftCasesTab from "@/components/fuel/FuelTheftCasesTab";
import FuelDepotsTab from "@/components/fuel/FuelDepotsTab";
import FuelConsumptionAlertsCard from "@/components/fuel/FuelConsumptionAlertsCard";
import ApprovedFuelStationsTab from "@/components/fuel/ApprovedFuelStationsTab";
import FuelQuickStats from "@/components/fuel/FuelQuickStats";
import FuelInsightsCard from "@/components/fuel/FuelInsightsCard";
import FuelQuickActions from "@/components/fuel/FuelQuickActions";
import FuelTrendChart from "@/components/fuel/FuelTrendChart";
import IdleTimeImpactCard from "@/components/fuel/IdleTimeImpactCard";
import { FuelPageContext } from "@/contexts/FuelPageContext";
const FuelMonitoring = () => {
  const { fuelEvents: dbFuelEvents, loading } = useFuelEvents();
  const { vehicles } = useVehicles();
  const { drivers } = useDrivers();
  const [activeTab, setActiveTab] = useState("events");
  const tabsRef = useRef<HTMLDivElement>(null);

  const getVehiclePlate = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle?.plate_number || "Unknown";
  };

  const getDriverName = (driverId?: string) => {
    if (!driverId) return "Unknown";
    const driver = drivers.find(d => d.id === driverId);
    return driver ? `${driver.first_name} ${driver.last_name}` : "Unknown";
  };

  const stats = useMemo(() => {
    const totalConsumption = dbFuelEvents
      .filter(e => e.event_type === 'refuel')
      .reduce((sum, e) => sum + Math.abs(e.fuel_change_liters), 0);
    
    const anomalyCount = dbFuelEvents
      .filter(e => e.event_type === 'theft' || e.event_type === 'leak')
      .length;

    const refuelEvents = dbFuelEvents.filter(e => e.event_type === 'refuel' && e.fuel_change_liters > 0);
    const avgEfficiency = refuelEvents.length > 0 
      ? (totalConsumption / Math.max(refuelEvents.length * 150, 1) * 100).toFixed(1)
      : null;

    return {
      totalConsumption: parseFloat(totalConsumption.toFixed(0)),
      anomalyCount,
      avgEfficiency: avgEfficiency ? `${avgEfficiency} L/100km` : null
    };
  }, [dbFuelEvents]);

  const contextValue = useMemo(() => ({
    vehicles,
    drivers,
    getVehiclePlate,
    getDriverName
  }), [vehicles, drivers]);

  const handleQuickAction = (action: string) => {
    if (action === 'transactions') {
      setActiveTab('transactions');
      tabsRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (action === 'anomalies') {
      setActiveTab('theft');
      tabsRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (action === 'depots') {
      setActiveTab('depots');
      tabsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-8 flex items-center justify-center min-h-[400px]">
          <div className="text-center" role="status" aria-label="Loading fuel data">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" aria-hidden="true" />
            <p className="text-muted-foreground">Loading fuel data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <FuelPageContext.Provider value={contextValue}>
      <Layout>
        <div className="p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl glass-strong glow">
              <Fuel className="w-8 h-8 text-primary float-animation" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-4xl font-bold gradient-text">Fuel Management</h1>
              <p className="text-muted-foreground mt-1 text-lg">Track consumption, transactions, detect anomalies, and manage depots</p>
            </div>
          </div>

          {/* Quick Stats Bar */}
          <FuelQuickStats 
            totalConsumption={stats.totalConsumption}
            anomalyCount={stats.anomalyCount}
            avgEfficiency={stats.avgEfficiency}
            eventsCount={dbFuelEvents.length}
          />

          {/* Quick Actions */}
          <FuelQuickActions 
            onAddTransaction={() => handleQuickAction('transactions')}
            onViewAnomalies={() => handleQuickAction('anomalies')}
            onManageDepots={() => handleQuickAction('depots')}
          />

          {/* Insights & Trend Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FuelTrendChart fuelEvents={dbFuelEvents} />
            <FuelInsightsCard />
          </div>

          {/* Idle Impact & Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <IdleTimeImpactCard />
            <FuelConsumptionAlertsCard getVehiclePlateFromContext={getVehiclePlate} />
          </div>

          {/* Tabbed Content */}
          <div ref={tabsRef}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
                <TabsTrigger value="events" className="gap-2">
                  <Droplet className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Fuel</span> Events
                </TabsTrigger>
                <TabsTrigger value="transactions" className="gap-2">
                  <FileText className="w-4 h-4" aria-hidden="true" />
                  Transactions
                </TabsTrigger>
                <TabsTrigger value="theft" className="gap-2">
                  <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Theft</span> Cases
                </TabsTrigger>
                <TabsTrigger value="depots" className="gap-2">
                  <Warehouse className="w-4 h-4" aria-hidden="true" />
                  Depots
                </TabsTrigger>
                <TabsTrigger value="stations" className="gap-2">
                  <MapPin className="w-4 h-4" aria-hidden="true" />
                  Stations
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
              <TabsContent value="stations">
                <ApprovedFuelStationsTab />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </Layout>
    </FuelPageContext.Provider>
  );
};

export default FuelMonitoring;
