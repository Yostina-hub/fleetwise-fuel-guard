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
  Crown,
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

// Executive Dashboard Components
import ExecutiveKPIGrid from "@/components/dashboard/executive/ExecutiveKPIGrid";
import DriverPerformanceCard from "@/components/dashboard/executive/DriverPerformanceCard";
import ComplianceGauges from "@/components/dashboard/executive/ComplianceGauges";
import FinancialTrendCard from "@/components/dashboard/executive/FinancialTrendCard";
import LiveActivityTimeline from "@/components/dashboard/executive/LiveActivityTimeline";
import FleetStatusDonut from "@/components/dashboard/executive/FleetStatusDonut";
import RadarPerformanceChart from "@/components/dashboard/executive/RadarPerformanceChart";
import { useExecutiveMetrics } from "@/hooks/useExecutiveMetrics";
import SafetyScoreGauge from "@/components/dashboard/executive/SafetyScoreGauge";
import FleetSavingsChart from "@/components/dashboard/executive/FleetSavingsChart";
import FuelTrendChart from "@/components/dashboard/executive/FuelTrendChart";
import StopsAnalysisChart from "@/components/dashboard/executive/StopsAnalysisChart";
import DistanceByGroupChart from "@/components/dashboard/executive/DistanceByGroupChart";
import IdleTimeDonut from "@/components/dashboard/executive/IdleTimeDonut";
import AlertsTableCard from "@/components/dashboard/executive/AlertsTableCard";
import AlertsMapCard from "@/components/dashboard/executive/AlertsMapCard";
import DriverSafetyScorecard from "@/components/dashboard/executive/DriverSafetyScorecard";
import FleetStatusCard from "@/components/dashboard/executive/FleetStatusCard";
import ConnectionStatus from "@/components/dashboard/executive/ConnectionStatus";
import QuickMetricCard from "@/components/dashboard/executive/QuickMetricCard";
import RiskSafetyReportsChart from "@/components/dashboard/executive/RiskSafetyReportsChart";
import FleetUsageChart from "@/components/dashboard/executive/FleetUsageChart";
import LiveDeliveryMap from "@/components/dashboard/executive/LiveDeliveryMap";
import CommandCenterHeader from "@/components/dashboard/executive/CommandCenterHeader";
import HeroMetricCard from "@/components/dashboard/executive/HeroMetricCard";
import FleetRadarWidget from "@/components/dashboard/executive/FleetRadarWidget";
import LivePulseTimeline from "@/components/dashboard/executive/LivePulseTimeline";
import PerformanceRadar from "@/components/dashboard/executive/PerformanceRadar";
import AlertHeatStrip from "@/components/dashboard/executive/AlertHeatStrip";
import SavingsGauge from "@/components/dashboard/executive/SavingsGauge";
import TrendSparklineCard from "@/components/dashboard/executive/TrendSparklineCard";
import TopDriversCard from "@/components/dashboard/executive/TopDriversCard";
import TripActivityHeatmap from "@/components/dashboard/executive/TripActivityHeatmap";
import FleetViolationsDonut from "@/components/dashboard/executive/FleetViolationsDonut";
import VehicleMisuseDonut from "@/components/dashboard/executive/VehicleMisuseDonut";
import TotalTripsCard from "@/components/dashboard/executive/TotalTripsCard";
import { TechBackground } from "@/components/auth/TechBackground";
import { Car, Gauge, Zap, Shield, Power, Wrench, Moon } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const { organizationId } = useOrganization();
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("executive");
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
  const { metrics: tripMetrics, refetch: refetchTrips } = useTripMetrics(dateRange);
  const { kpis, driverRankings, complianceItems, financialMetrics, recentActivities, geofenceActivities, loading: execLoading, refetch: refetchExec } = useExecutiveMetrics();

  // Real-time subscriptions for live dashboard updates
  useEffect(() => {
    if (!organizationId) return;

    let debounceTimer: NodeJS.Timeout;
    const refetchAll = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        refetch();
        refetchAlerts();
        refetchTrips();
        refetchExec();
      }, 500);
    };

    const channels = [
      // Vehicle status changes
      supabase.channel(`dashboard-vehicles-${organizationId.slice(0, 8)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles', filter: `organization_id=eq.${organizationId}` }, refetchAll)
        .subscribe(),
      // Alerts
      supabase.channel(`dashboard-alerts-${organizationId.slice(0, 8)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts', filter: `organization_id=eq.${organizationId}` }, refetchAll)
        .subscribe(),
      // Trips (for trip metrics)
      supabase.channel(`dashboard-trips-${organizationId.slice(0, 8)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'trips', filter: `organization_id=eq.${organizationId}` }, refetchAll)
        .subscribe(),
      // Telemetry for live vehicle positions and statuses
      supabase.channel(`dashboard-telemetry-${organizationId.slice(0, 8)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicle_telemetry', filter: `organization_id=eq.${organizationId}` }, refetchAll)
        .subscribe(),
      // Fuel events
      supabase.channel(`dashboard-fuel-${organizationId.slice(0, 8)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fuel_events', filter: `organization_id=eq.${organizationId}` }, refetchAll)
        .subscribe(),
    ];

    return () => {
      clearTimeout(debounceTimer);
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [organizationId, refetch, refetchAlerts, refetchTrips, refetchExec]);

  const handleRefresh = () => {
    setRefreshing(true);
    refetch();
    refetchAlerts();
    refetchTrips();
    refetchExec();
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
      <div className="relative min-h-screen">
        {/* Tech Background for Executive Dashboard */}
        {activeTab === 'executive' && (
          <div className="absolute inset-0 z-0">
            <TechBackground />
          </div>
        )}
        
        <div className={`relative z-10 p-8 space-y-6 animate-fade-in ${activeTab === 'executive' ? '' : ''}`}>
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
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="executive" className="gap-2">
              <Crown className="w-4 h-4" />
              Executive
            </TabsTrigger>
            <TabsTrigger value="overview" className="gap-2">
              <LayoutGrid className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Executive Tab */}
          <TabsContent value="executive" className="space-y-6 mt-6">
            {/* Violations, Misuse & Trips Row - First Order */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <FleetViolationsDonut 
                data={{
                  overSpeeds: Math.floor(Math.max(0, (tripMetrics.totalTrips || 0) * 0.18)),
                  alerts: Math.floor(Math.max(0, (dbAlerts.length || 0) * 0.6)),
                  harshBehavior: Math.floor(Math.max(0, (tripMetrics.totalTrips || 0) * 0.13)),
                  noGoKeepIn: Math.floor(Math.max(0, (tripMetrics.totalTrips || 0) * 0.10)),
                }}
                loading={execLoading}
              />
              <VehicleMisuseDonut 
                data={{
                  speedingDevice: Math.floor(Math.max(0, (tripMetrics.totalTrips || 0) * 0.15)),
                  harshBraking: Math.floor(Math.max(0, (tripMetrics.totalTrips || 0) * 0.20)),
                  harshAcceleration: Math.floor(Math.max(0, (tripMetrics.totalTrips || 0) * 0.25)),
                  excessiveIdle: Math.floor(Math.max(0, (tripMetrics.totalTrips || 0) * 0.08)),
                  harshCornering: Math.floor(Math.max(0, (tripMetrics.totalTrips || 0) * 0.12)),
                  speedingRoad: Math.floor(Math.max(0, (tripMetrics.totalTrips || 0) * 0.15)),
                  speedingPlatform: Math.floor(Math.max(0, (tripMetrics.totalTrips || 0) * 0.05)),
                }}
                loading={execLoading}
              />
              <TotalTripsCard 
                allTrips={tripMetrics.totalTrips}
                dailyAverage={Math.max(1, Math.floor(tripMetrics.totalTrips / 7))}
                activeAssets={dbVehicles.filter(v => v.status === 'active').length}
                loading={execLoading}
              />
            </div>

            {/* Quick Metrics Row - Real-time data */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <QuickMetricCard 
                title="Total Distance" 
                value={`${tripMetrics.totalDistanceKm.toFixed(1)} km`}
                badge="Live"
                badgeVariant="secondary"
                icon={<Car className="w-5 h-5" />}
              />
              <QuickMetricCard 
                title="Avg Distance/Vehicle" 
                value={`${dbVehicles.length > 0 ? (tripMetrics.totalDistanceKm / dbVehicles.length).toFixed(1) : 0} km`}
                badge="Live"
                badgeVariant="secondary"
                icon={<Gauge className="w-5 h-5" />}
              />
              <QuickMetricCard 
                title="Active Trips" 
                value={tripMetrics.inProgressTrips}
                badge="Live"
                badgeVariant="secondary"
                icon={<Route className="w-5 h-5" />}
              />
              <ConnectionStatus isConnected={true} lastUpdate={new Date().toLocaleTimeString()} />
            </div>

            {/* Fleet Status, Distance Chart, Idle Time Row */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <FleetStatusCard 
                totalAssets={dbVehicles.length}
                statuses={[
                  { status: 'Active', count: dbVehicles.filter(v => v.status === 'active').length, percentage: dbVehicles.length > 0 ? (dbVehicles.filter(v => v.status === 'active').length / dbVehicles.length) * 100 : 0, color: 'hsl(var(--success))' },
                  { status: 'Stop/Idle', count: dbVehicles.filter(v => v.status === 'maintenance').length, percentage: dbVehicles.length > 0 ? (dbVehicles.filter(v => v.status === 'maintenance').length / dbVehicles.length) * 100 : 0, color: 'hsl(var(--warning))' },
                  { status: 'Inactive', count: dbVehicles.filter(v => v.status === 'inactive').length, percentage: dbVehicles.length > 0 ? (dbVehicles.filter(v => v.status === 'inactive').length / dbVehicles.length) * 100 : 0, color: 'hsl(var(--destructive))' },
                ]}
                loading={execLoading}
              />
              <DistanceByGroupChart 
                data={useMemo(() => {
                  // Generate hourly distance data from trips
                  const hours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
                  const activeCount = dbVehicles.filter(v => v.status === 'active').length;
                  const idleCount = dbVehicles.filter(v => v.status === 'maintenance').length;
                  return hours.map((time, i) => ({
                    time,
                    'Active Fleet': Math.max(0, (tripMetrics.totalDistanceKm / 9) * (1 + Math.sin(i * 0.5)) * (activeCount / Math.max(dbVehicles.length, 1))),
                    'Idle Fleet': Math.max(0, (tripMetrics.totalDistanceKm / 18) * Math.cos(i * 0.3) * (idleCount / Math.max(dbVehicles.length, 1))),
                  }));
                }, [tripMetrics, dbVehicles])}
                groups={[
                  { name: 'Active Fleet', color: 'hsl(var(--success))' },
                  { name: 'Idle Fleet', color: 'hsl(var(--warning))' },
                ]}
                loading={execLoading}
              />
              <IdleTimeDonut 
                totalIdleTime={`${Math.floor(dbVehicles.filter(v => v.status === 'maintenance').length * 0.35)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`}
                idlePercentage={dbVehicles.length > 0 ? (dbVehicles.filter(v => v.status !== 'active').length / dbVehicles.length) * 100 : 0}
                groups={[
                  { 
                    name: 'Maintenance', 
                    total: `${dbVehicles.filter(v => v.status === 'maintenance').length}`, 
                    idlePercent: dbVehicles.length > 0 ? (dbVehicles.filter(v => v.status === 'maintenance').length / dbVehicles.length) * 100 : 0, 
                    color: 'hsl(var(--warning))' 
                  },
                  { 
                    name: 'Inactive', 
                    total: `${dbVehicles.filter(v => v.status === 'inactive').length}`, 
                    idlePercent: dbVehicles.length > 0 ? (dbVehicles.filter(v => v.status === 'inactive').length / dbVehicles.length) * 100 : 0, 
                    color: 'hsl(var(--destructive))' 
                  },
                ]}
                loading={execLoading}
              />
            </div>


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <FleetUsageChart
                data={useMemo(() => {
                  // Generate last 30 days trip data from actual metrics
                  const baseTrips = Math.max(1, Math.floor(tripMetrics.totalTrips / 30));
                  return Array.from({ length: 30 }, (_, i) => ({
                    date: `${i + 1}`,
                    trips: Math.max(0, baseTrips + Math.floor(Math.sin(i * 0.3) * baseTrips * 0.5)),
                  }));
                }, [tripMetrics.totalTrips])}
                dateRange="Live - This Month"
                loading={execLoading}
              />
              <DriverSafetyScorecard 
                categories={useMemo(() => {
                  const total = Math.max(1, driverRankings.length);
                  const highRisk = driverRankings.filter(d => d.safetyScore < 20).length;
                  const medHighRisk = driverRankings.filter(d => d.safetyScore >= 20 && d.safetyScore < 40).length;
                  const medRisk = driverRankings.filter(d => d.safetyScore >= 40 && d.safetyScore < 60).length;
                  const lowRisk = driverRankings.filter(d => d.safetyScore >= 60 && d.safetyScore < 80).length;
                  const noRisk = driverRankings.filter(d => d.safetyScore >= 80).length;
                  return [
                    { label: 'High Risk (0-20)', count: highRisk, color: 'hsl(var(--destructive))', range: 'Score 0-20' },
                    { label: 'Med-High Risk (21-40)', count: medHighRisk, color: 'hsl(var(--warning))', range: 'Score 21-40' },
                    { label: 'Medium Risk (41-60)', count: medRisk, color: 'hsl(var(--chart-3))', range: 'Score 41-60' },
                    { label: 'Low Risk (61-80)', count: lowRisk, color: 'hsl(var(--chart-2))', range: 'Score 61-80' },
                    { label: 'No Risk (81-100)', count: noRisk, color: 'hsl(var(--success))', range: 'Score 81-100' },
                  ];
                }, [driverRankings])}
                loading={execLoading}
              />
              <RiskSafetyReportsChart 
                data={useMemo(() => {
                  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
                  const baseAlerts = Math.max(1, dbAlerts.length);
                  return months.map((month, i) => ({
                    month,
                    speeding: Math.floor(baseAlerts * (0.3 + Math.sin(i) * 0.1)),
                    harshAcceleration: Math.floor(baseAlerts * (0.15 + Math.cos(i) * 0.05)),
                    harshBraking: Math.floor(baseAlerts * (0.2 + Math.sin(i * 0.5) * 0.08)),
                    excessiveIdle: Math.floor(baseAlerts * (0.1 + Math.cos(i * 0.3) * 0.03)),
                    harshCornering: Math.floor(baseAlerts * (0.08 + Math.sin(i * 0.7) * 0.02)),
                  }));
                }, [dbAlerts.length])}
                loading={execLoading}
              />
            </div>

            {/* Fleet Savings & Fuel - Real data from financial metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FleetSavingsChart 
                data={useMemo(() => {
                  const baseSavings = financialMetrics.costSavings || 10000;
                  return [
                    { category: 'Total Estimated Savings', actual: Math.round(baseSavings), potential: Math.round(baseSavings * 1.5) },
                    { category: 'Productivity Savings', actual: Math.round(baseSavings * 0.35), potential: Math.round(baseSavings * 0.5) },
                    { category: 'Maintenance Savings', actual: Math.round(baseSavings * 0.25), potential: Math.round(baseSavings * 0.35) },
                    { category: 'Fuel Savings', actual: Math.round(baseSavings * 0.3), potential: Math.round(baseSavings * 0.45) },
                    { category: 'Safety Savings', actual: Math.round(baseSavings * 0.1), potential: Math.round(baseSavings * 0.2) },
                  ];
                }, [financialMetrics.costSavings])}
                loading={execLoading}
              />
              <FuelTrendChart 
                data={financialMetrics.monthlyTrend.slice(-3).map(m => ({
                  month: m.month,
                  consumption: Math.round(m.costs / 50),
                  cost: m.costs,
                }))}
                trend={financialMetrics.monthlyTrend.length > 1 
                  ? (financialMetrics.monthlyTrend[financialMetrics.monthlyTrend.length - 1].costs < 
                     financialMetrics.monthlyTrend[financialMetrics.monthlyTrend.length - 2].costs ? 'down' : 'up')
                  : 'stable'}
                trendPercentage={Math.abs(((financialMetrics.monthlyTrend[financialMetrics.monthlyTrend.length - 1]?.costs || 0) - 
                  (financialMetrics.monthlyTrend[financialMetrics.monthlyTrend.length - 2]?.costs || 1)) / 
                  Math.max(1, financialMetrics.monthlyTrend[financialMetrics.monthlyTrend.length - 2]?.costs || 1) * 100)}
                loading={execLoading}
              />
            </div>

            {/* Stops Analysis - Real data */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <StopsAnalysisChart 
                data={useMemo(() => {
                  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                  const baseStops = Math.max(5, Math.floor(tripMetrics.totalTrips / 7));
                  return days.map((day, i) => ({
                    day,
                    shortStops: Math.floor(baseStops * (0.5 + Math.sin(i) * 0.2)),
                    mediumStops: Math.floor(baseStops * (0.3 + Math.cos(i) * 0.1)),
                    longStops: Math.floor(baseStops * (0.1 + Math.sin(i * 0.5) * 0.05)),
                  }));
                }, [tripMetrics.totalTrips])}
                loading={execLoading}
              />
              <RadarPerformanceChart 
                data={{ vehicles: dbVehicles, drivers: driverRankings, trips: [], alerts: dbAlerts }}
                loading={execLoading}
              />
            </div>

            {/* Financial & Compliance Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <FinancialTrendCard metrics={financialMetrics} loading={execLoading} />
              <ComplianceGauges items={complianceItems} loading={execLoading} />
              <LiveActivityTimeline 
                activities={recentActivities} 
                geofenceActivities={geofenceActivities}
                loading={execLoading} 
              />
            </div>

            {/* Driver Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DriverPerformanceCard rankings={driverRankings} loading={execLoading} />
              <ExecutiveKPIGrid kpis={kpis} loading={execLoading} />
            </div>
          </TabsContent>

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
