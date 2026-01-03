import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import KPICard from "@/components/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  StatCardSkeleton,
} from "@/components/ui/skeletons";
import { 
  Truck, 
  Fuel, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  Clock,
  MapPin,
  ChevronRight,
  RefreshCw,
  Activity,
  Route,
  LayoutGrid,
  BarChart3,
} from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import VehicleDetailModal from "@/components/VehicleDetailModal";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line } from "recharts";
import { useVehicles } from "@/hooks/useVehicles";
import { useAlerts } from "@/hooks/useAlerts";
import { useFuelEvents } from "@/hooks/useFuelEvents";
import { useFleetAnalytics } from "@/hooks/useFleetAnalytics";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { useTripMetrics } from "@/hooks/useTripMetrics";

// Analytics widgets
import UtilizationGauge from "@/components/dashboard/UtilizationGauge";
import TCOBreakdownCard from "@/components/dashboard/TCOBreakdownCard";
import CarbonEmissionsCard from "@/components/dashboard/CarbonEmissionsCard";
import MetricCard from "@/components/dashboard/MetricCard";
import FuelEfficiencyCard from "@/components/dashboard/FuelEfficiencyCard";
import MaintenanceComplianceCard from "@/components/dashboard/MaintenanceComplianceCard";
import SafetyScoreCard from "@/components/dashboard/SafetyScoreCard";
import DeliveryPerformanceCard from "@/components/dashboard/DeliveryPerformanceCard";
import RevenueCard from "@/components/dashboard/RevenueCard";
import QuickActionsCard from "@/components/dashboard/QuickActionsCard";
import TripsOverviewCard from "@/components/dashboard/TripsOverviewCard";
import MaintenanceDueCard from "@/components/dashboard/MaintenanceDueCard";
import DriversOverviewCard from "@/components/dashboard/DriversOverviewCard";
import DashboardSearch from "@/components/dashboard/DashboardSearch";
import FleetVehicleSummaryCard from "@/components/dashboard/FleetVehicleSummaryCard";
import VehicleHealthStatusCard from "@/components/dashboard/VehicleHealthStatusCard";
import GeofenceCategoriesCard from "@/components/dashboard/GeofenceCategoriesCard";
import VehicleUtilizationCard from "@/components/dashboard/VehicleUtilizationCard";
import ComplianceAlertsCard from "@/components/dashboard/ComplianceAlertsCard";
import DateRangeFilter from "@/components/dashboard/DateRangeFilter";
import { useVehicleTelemetry } from "@/hooks/useVehicleTelemetry";
import { startOfMonth } from "date-fns";

const Dashboard = () => {
  const navigate = useNavigate();
  const { organizationId } = useOrganization();
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: new Date(),
  });

  const { vehicles: dbVehicles, loading: vehiclesLoading, refetch } = useVehicles();
  const { alerts: dbAlerts, loading: alertsLoading, refetch: refetchAlerts } = useAlerts({ status: 'unacknowledged' });
  const { fuelEvents: dbFuelEvents } = useFuelEvents();
  const { analytics, loading: analyticsLoading } = useFleetAnalytics();
  const { telemetry: telemetryMap } = useVehicleTelemetry();
  const { formatCurrency, formatDistance, settings } = useOrganizationSettings();
  const { metrics: tripMetrics } = useTripMetrics(dateRange);

  // Real-time subscriptions
  useEffect(() => {
    if (!organizationId) return;

    let debounceTimer: NodeJS.Timeout;

    const vehiclesChannel = supabase
      .channel(`dashboard-vehicles-${organizationId.slice(0, 8)}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'vehicles',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(refetch, 500);
        }
      )
      .subscribe();

    const alertsChannel = supabase
      .channel(`dashboard-alerts-${organizationId.slice(0, 8)}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'alerts',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(refetchAlerts, 500);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(vehiclesChannel);
      supabase.removeChannel(alertsChannel);
    };
  }, [organizationId, refetch, refetchAlerts]);

  const handleRefresh = () => {
    setRefreshing(true);
    refetch();
    refetchAlerts();
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Transform vehicles for display - use correct field name plate_number
  const vehicles = useMemo(() => {
    return dbVehicles.slice(0, 5).map(v => {
      const vehicleTelemetry = telemetryMap?.[v.id];
      const locationName = vehicleTelemetry?.latitude && vehicleTelemetry?.longitude 
        ? `${vehicleTelemetry.latitude.toFixed(4)}, ${vehicleTelemetry.longitude.toFixed(4)}` 
        : 'Location unavailable';
      return {
        id: v.id,
        plate: v.plate_number || 'Unknown',
        status: (v.status === 'active' ? 'moving' : v.status === 'maintenance' ? 'idle' : 'offline') as 'moving' | 'idle' | 'offline',
        fuel: v.current_fuel || 50,
        location: locationName
      };
    });
  }, [dbVehicles, telemetryMap]);

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

  // Trips per hour data - use real data from useTripMetrics
  const tripsData = useMemo(() => {
    const tripsByHour = tripMetrics.tripsByHour;
    if (tripsByHour && tripsByHour.length > 0) {
      return tripsByHour;
    }
    // Fallback to empty data if no trips
    const hours = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
    return hours.map(hour => ({ hour, trips: 0 }));
  }, [tripMetrics.tripsByHour]);

  // Show skeleton content instead of blocking loader
  const isLoading = vehiclesLoading || alertsLoading;

  // formatCurrency is now provided by useOrganizationSettings

  return (
    <Layout>
      <div className="p-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Fleet Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">Real-time overview of your fleet operations</p>
          </div>
          <div className="flex items-center gap-3">
            <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
            <DashboardSearch />
            <Button 
              variant="outline" 
              className="gap-2" 
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="Refresh dashboard data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Tabs for different views */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="overview" className="gap-2">
              <LayoutGrid className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Quick Stats KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    title="Fleet Utilization"
                    value={`${analytics.utilization.utilizationRate.toFixed(0)}%`}
                    subtitle="vehicles in use"
                    icon={<Activity className="w-5 h-5" />}
                    variant="success"
                    animationDelay={100}
                  />
                  <KPICard
                    title="Monthly TCO"
                    value={formatCurrency(analytics.tco.totalCost)}
                    subtitle={`${formatCurrency(analytics.tco.costPerVehicle)}/vehicle`}
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

            {/* Ford Pro Style Dashboard Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FleetVehicleSummaryCard vehicles={dbVehicles} />
              <VehicleHealthStatusCard vehicles={dbVehicles} />
              <GeofenceCategoriesCard />
              <VehicleUtilizationCard vehicles={dbVehicles} telemetryMap={telemetryMap} />
            </div>

            {/* Quick Analytics Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Utilization"
                value={`${analytics.utilization.utilizationRate.toFixed(0)}%`}
                subtitle={`${analytics.utilization.activeVehicles} of ${dbVehicles.length} vehicles`}
                icon={<Activity className="w-5 h-5" />}
                trend={analytics.utilization.trend}
                trendValue={`${analytics.utilization.trendPercentage.toFixed(1)}%`}
                variant="primary"
              />
              <MetricCard
                title="Monthly TCO"
                value={formatCurrency(analytics.tco.totalCost)}
                subtitle={`${formatCurrency(analytics.tco.costPerKm)}/${settings.distance_unit}`}
                icon={<DollarSign className="w-5 h-5" />}
                trend={analytics.tco.trend}
                trendValue={`${analytics.tco.trendPercentage.toFixed(1)}%`}
                trendPositive={analytics.tco.trend === 'down'}
                variant="default"
              />
              <MetricCard
                title="Carbon Emissions"
                value={`${(analytics.carbon.totalCO2Kg / 1000).toFixed(1)}t`}
                subtitle={`${analytics.carbon.averagePerVehicle.toFixed(0)} kg/vehicle`}
                icon={<TrendingUp className="w-5 h-5" />}
                trend={analytics.carbon.trend}
                trendValue={`${analytics.carbon.trendPercentage.toFixed(1)}%`}
                trendPositive={analytics.carbon.trend === 'down'}
                variant="success"
              />
              <MetricCard
                title="Safety Score"
                value={analytics.safety.averageScore.toFixed(0)}
                subtitle={`${analytics.safety.incidentsThisMonth} incidents`}
                icon={<AlertTriangle className="w-5 h-5" />}
                trend={analytics.safety.trend}
                trendValue={`${analytics.safety.trendPercentage.toFixed(1)}%`}
                variant={analytics.safety.averageScore >= 80 ? "success" : "warning"}
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Vehicle Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Fleet Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div role="img" aria-label={`Fleet status chart: ${vehicleStatusData.map(d => `${d.name}: ${d.value}`).join(', ')}`}>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={vehicleStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
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
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {vehicleStatusData.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <div className="text-xs">
                          <span className="text-muted-foreground">{item.name}</span>
                          <span className="font-medium ml-1">{item.value}</span>
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
                    Fuel Consumption Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div role="img" aria-label={`Fuel consumption trend chart showing daily consumption: ${fuelTrendData.map(d => `${d.day}: ${d.consumption}L`).join(', ')}`}>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={fuelTrendData}>
                        <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
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
                  <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate('/fleet')}>
                    View All <ChevronRight className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {vehicles.map((vehicle) => (
                      <div 
                        key={vehicle.id} 
                        role="button"
                        tabIndex={0}
                        aria-label={`View details for vehicle ${vehicle.plate}`}
                        className="group flex items-center justify-between p-3 border border-border rounded-lg hover:shadow-md hover:border-primary/50 transition-all cursor-pointer bg-gradient-to-r hover:from-primary/5 hover:to-transparent focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        onClick={() => setSelectedVehicle(vehicle)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedVehicle(vehicle); } }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg group-hover:scale-110 transition-transform">
                            <Truck className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-semibold text-sm">{vehicle.plate}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {vehicle.location}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="flex items-center gap-1">
                              <div className={`w-2 h-2 rounded-full ${
                                vehicle.fuel > 60 ? 'bg-success' : 
                                vehicle.fuel > 30 ? 'bg-warning' : 
                                'bg-destructive'
                              } animate-pulse`}></div>
                              <span className="text-xs font-medium">{vehicle.fuel}%</span>
                            </div>
                          </div>
                          <StatusBadge status={vehicle.status} />
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
                    <CardTitle className="flex items-center gap-2 text-base">
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
                        role="button"
                        tabIndex={0}
                        aria-label={`${alert.type === 'critical' ? 'Critical' : 'Warning'} alert: ${alert.message}`}
                        className={`p-3 border rounded-lg hover:shadow-md transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                          alert.type === 'critical' ? 'border-destructive/30 bg-destructive/5' : 'border-warning/30 bg-warning/5'
                        }`}
                        onClick={() => navigate('/alerts')}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/alerts'); } }}
                      >
                        <div className="flex items-start gap-2">
                          <AlertTriangle className={`w-4 h-4 mt-0.5 ${alert.type === 'critical' ? 'text-destructive animate-pulse' : 'text-warning'}`} />
                          <div className="flex-1">
                            <p className="text-xs font-medium">{alert.message}</p>
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

            {/* Additional Widgets Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <QuickActionsCard />
              <TripsOverviewCard />
              <DriversOverviewCard />
              <MaintenanceDueCard />
              <ComplianceAlertsCard />
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6 mt-6">
            {/* Key Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Cost per Kilometer"
                value={`${formatCurrency(analytics.tco.costPerKm)}/${settings.distance_unit}`}
                subtitle="operating cost"
                icon={<DollarSign className="w-5 h-5" />}
                trend={analytics.tco.trend}
                trendValue={`${analytics.tco.trend === 'down' ? '-' : '+'}${analytics.tco.trendPercentage.toFixed(1)}% vs last month`}
                trendPositive={analytics.tco.trend === 'down'}
                variant="success"
              />
              <MetricCard
                title="Avg. Fuel Efficiency"
                value={`${analytics.fuelEfficiency.averageLPer100Km.toFixed(1)} ${settings.fuel_unit}/100${settings.distance_unit}`}
                subtitle="fleet average"
                icon={<Fuel className="w-5 h-5" />}
                trend={analytics.fuelEfficiency.trend}
                trendValue={`${analytics.fuelEfficiency.trend === 'up' ? '+' : '-'}${analytics.fuelEfficiency.trendPercentage.toFixed(1)}% improvement`}
                variant="primary"
              />
              <MetricCard
                title="On-Time Delivery"
                value={`${analytics.delivery.onTimeRate.toFixed(1)}%`}
                subtitle={`${analytics.delivery.completedTrips} trips`}
                icon={<Route className="w-5 h-5" />}
                trend={analytics.delivery.trend}
                trendValue={`${analytics.delivery.trend === 'up' ? '+' : analytics.delivery.trend === 'down' ? '-' : ''}${analytics.delivery.trendPercentage.toFixed(1)}% vs last month`}
                variant={analytics.delivery.onTimeRate >= 90 ? "success" : "primary"}
              />
              <MetricCard
                title="Fleet Revenue"
                value={formatCurrency(analytics.revenue.total)}
                subtitle={`${formatCurrency(analytics.revenue.perVehicle)}/vehicle`}
                icon={<TrendingUp className="w-5 h-5" />}
                trend={analytics.revenue.trend}
                trendValue={`${analytics.revenue.trend === 'up' ? '+' : analytics.revenue.trend === 'down' ? '-' : ''}${analytics.revenue.trendPercentage.toFixed(1)}% growth`}
                variant="success"
              />
            </div>

            {/* Detailed Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <UtilizationGauge
                utilizationRate={analytics.utilization.utilizationRate}
                activeVehicles={analytics.utilization.activeVehicles}
                totalVehicles={dbVehicles.length}
                trend={analytics.utilization.trend}
                trendPercentage={analytics.utilization.trendPercentage}
              />
              <TCOBreakdownCard
                totalCost={analytics.tco.totalCost}
                costPerVehicle={analytics.tco.costPerVehicle}
                costPerKm={analytics.tco.costPerKm}
                breakdown={analytics.tco.breakdown}
                trend={analytics.tco.trend}
                trendPercentage={analytics.tco.trendPercentage}
                formatCurrency={formatCurrency}
                distanceUnit={settings.distance_unit}
              />
              <CarbonEmissionsCard
                totalCO2Kg={analytics.carbon.totalCO2Kg}
                averagePerVehicle={analytics.carbon.averagePerVehicle}
                trend={analytics.carbon.trend}
                trendPercentage={analytics.carbon.trendPercentage}
                byFuelType={analytics.carbon.byFuelType}
              />
              <FuelEfficiencyCard
                averageLPer100Km={analytics.fuelEfficiency.averageLPer100Km}
                bestPerformer={analytics.fuelEfficiency.bestPerformer}
                worstPerformer={analytics.fuelEfficiency.worstPerformer}
                trend={analytics.fuelEfficiency.trend}
                trendPercentage={analytics.fuelEfficiency.trendPercentage}
                distanceUnit={settings.distance_unit}
                fuelUnit={settings.fuel_unit}
              />
              <MaintenanceComplianceCard
                complianceRate={analytics.maintenance.complianceRate}
                overdueCount={analytics.maintenance.overdueCount}
                upcomingCount={analytics.maintenance.upcomingCount}
              />
              <SafetyScoreCard
                averageScore={analytics.safety.averageScore}
                incidentsThisMonth={analytics.safety.incidentsThisMonth}
                trend={analytics.safety.trend}
                trendPercentage={analytics.safety.trendPercentage}
              />
            </div>

            {/* Performance Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DeliveryPerformanceCard
                onTimeRate={analytics.delivery.onTimeRate}
                averageDelay={analytics.delivery.averageDelay}
                completedTrips={analytics.delivery.completedTrips}
              />
              <RevenueCard
                perVehicle={analytics.revenue.perVehicle}
                total={analytics.revenue.total}
                trend={analytics.revenue.trend}
                trendPercentage={analytics.revenue.trendPercentage}
                formatCurrency={formatCurrency}
              />
            </div>

            {/* Trip Activity Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Route className="w-5 h-5 text-primary" />
                  Trip Activity by Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div role="img" aria-label={`Trip activity chart showing trips by hour: ${tripsData.map(d => `${d.hour}: ${d.trips} trips`).join(', ')}`}>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={tripsData}>
                      <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                      />
                      <Bar dataKey="trips" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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
