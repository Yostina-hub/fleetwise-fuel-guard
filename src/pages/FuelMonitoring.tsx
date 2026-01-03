import { useMemo, useState, useRef } from "react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Fuel, AlertTriangle, Loader2, Warehouse, FileText, Droplet, MapPin } from "lucide-react";
import { useFuelEvents } from "@/hooks/useFuelEvents";
import { useFuelTransactions } from "@/hooks/useFuelTransactions";
import { useVehicles } from "@/hooks/useVehicles";
import { useDrivers } from "@/hooks/useDrivers";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
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
  const { transactions } = useFuelTransactions();
  const { vehicles } = useVehicles();
  const { drivers } = useDrivers();
  const { organizationId } = useOrganization();
  const [activeTab, setActiveTab] = useState("events");
  const tabsRef = useRef<HTMLDivElement>(null);

  // Fetch trips for idle time data
  const { data: tripsData = [] } = useQuery({
    queryKey: ["trips-idle-data", organizationId],
    queryFn: async () => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from("trips")
        .select("vehicle_id, idle_time_minutes")
        .eq("organization_id", organizationId)
        .gte("start_time", oneWeekAgo.toISOString())
        .not("idle_time_minutes", "is", null);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const getVehiclePlate = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle?.plate_number || "Unknown";
  };

  const getDriverName = (driverId?: string) => {
    if (!driverId) return "Unknown";
    const driver = drivers.find(d => d.id === driverId);
    return driver ? `${driver.first_name} ${driver.last_name}` : "Unknown";
  };

  // Calculate average cost per liter from transactions
  const avgCostPerLiter = useMemo(() => {
    const transactionsWithCost = transactions.filter(t => t.fuel_price_per_liter && t.fuel_price_per_liter > 0);
    if (transactionsWithCost.length === 0) return 1.50; // Fallback default
    const total = transactionsWithCost.reduce((sum, t) => sum + (t.fuel_price_per_liter || 0), 0);
    return total / transactionsWithCost.length;
  }, [transactions]);

  // Calculate consumption trend by comparing current period with previous
  const consumptionTrend = useMemo(() => {
    const now = new Date();
    const midPoint = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000); // 15 days ago
    const startPoint = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    const recentEvents = dbFuelEvents.filter(e => new Date(e.event_time) >= midPoint && e.event_type === 'refuel');
    const previousEvents = dbFuelEvents.filter(e => new Date(e.event_time) >= startPoint && new Date(e.event_time) < midPoint && e.event_type === 'refuel');

    const recentConsumption = recentEvents.reduce((sum, e) => sum + Math.abs(e.fuel_change_liters), 0);
    const previousConsumption = previousEvents.reduce((sum, e) => sum + Math.abs(e.fuel_change_liters), 0);

    if (previousConsumption === 0) {
      return { value: 0, direction: 'neutral' as const };
    }

    const changePercent = ((recentConsumption - previousConsumption) / previousConsumption) * 100;
    return { 
      value: parseFloat(changePercent.toFixed(1)), 
      direction: changePercent < -1 ? 'down' as const : changePercent > 1 ? 'up' as const : 'neutral' as const 
    };
  }, [dbFuelEvents]);

  // Calculate idle time stats from trips
  const idleStats = useMemo(() => {
    const IDLE_THRESHOLD_HOURS = 5; // Weekly threshold per vehicle
    const FUEL_PER_IDLE_HOUR = 1.5; // Liters of fuel wasted per hour of idle

    // Group by vehicle
    const vehicleIdleMap: Record<string, { totalMinutes: number; plate: string }> = {};
    tripsData.forEach((trip: any) => {
      if (!vehicleIdleMap[trip.vehicle_id]) {
        vehicleIdleMap[trip.vehicle_id] = { totalMinutes: 0, plate: getVehiclePlate(trip.vehicle_id) };
      }
      vehicleIdleMap[trip.vehicle_id].totalMinutes += trip.idle_time_minutes || 0;
    });

    const entries = Object.entries(vehicleIdleMap);
    const totalIdleHours = entries.reduce((sum, [_, v]) => sum + v.totalMinutes / 60, 0);
    const fuelWasted = totalIdleHours * FUEL_PER_IDLE_HOUR;
    const costImpact = fuelWasted * avgCostPerLiter;

    // Find top idlers
    const topIdlers = entries
      .map(([id, v]) => ({
        vehicle: v.plate,
        hours: parseFloat((v.totalMinutes / 60).toFixed(1)),
        liters: parseFloat(((v.totalMinutes / 60) * FUEL_PER_IDLE_HOUR).toFixed(2)),
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 3);

    // Calculate compliance (vehicles under threshold)
    const vehiclesOverThreshold = entries.filter(([_, v]) => (v.totalMinutes / 60) > IDLE_THRESHOLD_HOURS).length;
    const compliancePercent = entries.length > 0 
      ? Math.round(((entries.length - vehiclesOverThreshold) / entries.length) * 100)
      : 100;

    return {
      totalIdleHours: parseFloat(totalIdleHours.toFixed(1)),
      fuelWasted: parseFloat(fuelWasted.toFixed(2)),
      costImpact: parseFloat(costImpact.toFixed(2)),
      topIdlers,
      fleetTarget: IDLE_THRESHOLD_HOURS,
      compliancePercent,
    };
  }, [tripsData, avgCostPerLiter, vehicles]);

  // Count vehicles with high idle (used for insights)
  const highIdleVehicleCount = useMemo(() => {
    return idleStats.topIdlers.filter(v => v.hours > idleStats.fleetTarget).length;
  }, [idleStats]);

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
            consumptionTrend={consumptionTrend}
            avgCostPerLiter={avgCostPerLiter}
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
            <FuelInsightsCard 
              anomalyCount={stats.anomalyCount}
              totalConsumption={stats.totalConsumption}
              avgEfficiency={stats.avgEfficiency}
              consumptionTrend={consumptionTrend}
              highIdleVehicleCount={highIdleVehicleCount}
              avgCostPerLiter={avgCostPerLiter}
            />
          </div>

          {/* Idle Impact & Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <IdleTimeImpactCard idleStats={idleStats} />
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
