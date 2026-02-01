import { useState, useRef } from "react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Wrench, 
  Calendar,
  Loader2,
  ClipboardCheck,
  ListChecks,
  Search,
  History
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useVehicles } from "@/hooks/useVehicles";
import { useMaintenanceMetrics } from "@/hooks/useMaintenanceMetrics";
import { useMaintenanceSchedules } from "@/hooks/useMaintenanceSchedules";
import MaintenanceSchedulesTab from "@/components/maintenance/MaintenanceSchedulesTab";
import VehicleInspectionsTab from "@/components/maintenance/VehicleInspectionsTab";
import MaintenanceHistoryTab from "@/components/maintenance/MaintenanceHistoryTab";
import ServiceHistoryTab from "@/components/maintenance/ServiceHistoryTab";
import MaintenanceQuickStats from "@/components/maintenance/MaintenanceQuickStats";
import MaintenanceQuickActions from "@/components/maintenance/MaintenanceQuickActions";
import MaintenanceInsightsCard from "@/components/maintenance/MaintenanceInsightsCard";
import MaintenanceTrendChart from "@/components/maintenance/MaintenanceTrendChart";
import LowStockAlert from "@/components/maintenance/LowStockAlert";
import DateRangeFilter from "@/components/dashboard/DateRangeFilter";
import { subDays, differenceInDays, parseISO, isAfter } from "date-fns";

interface DateRange {
  start: Date;
  end: Date;
}

const Maintenance = () => {
  const navigate = useNavigate();
  const { loading: vehiclesLoading } = useVehicles();
  const { metrics, loading: metricsLoading } = useMaintenanceMetrics();
  const { schedules } = useMaintenanceSchedules();
  const [dateRange, setDateRange] = useState<DateRange>({
    start: subDays(new Date(), 30),
    end: new Date(),
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("schedules");
  const tabsRef = useRef<HTMLDivElement>(null);

  const loading = vehiclesLoading || metricsLoading;

  // Calculate additional stats
  const upcomingThisWeek = schedules?.filter(s => {
    if (!s.next_due_date) return false;
    const dueDate = parseISO(s.next_due_date);
    const daysUntil = differenceInDays(dueDate, new Date());
    return daysUntil >= 0 && daysUntil <= 7;
  }).length || 0;

  if (loading) {
    return (
      <Layout>
        <div className="p-8 flex items-center justify-center min-h-[400px]">
          <div className="text-center" role="status" aria-label="Loading maintenance data">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" aria-hidden="true" />
            <p className="text-muted-foreground">Loading maintenance data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 slide-in-right">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl glass-strong glow">
              <Wrench className="w-8 h-8 text-primary float-animation" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-4xl font-bold gradient-text">Maintenance Management</h1>
              <p className="text-muted-foreground mt-1 text-lg">Track service schedules, inspections and work orders</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="maintenance-search"
                aria-label="Search maintenance items"
                placeholder="Quick search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-48"
              />
            </div>
            <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
          </div>
        </div>

        {/* Quick Stats Bar */}
        <MaintenanceQuickStats
          totalScheduled={metrics.totalScheduled}
          overdueCount={metrics.overdueCount}
          completedThisMonth={metrics.completedThisMonth}
          complianceRate={metrics.complianceRate}
          upcomingThisWeek={upcomingThisWeek}
        />

        {/* Quick Actions */}
        <MaintenanceQuickActions
          onNewWorkOrder={() => navigate('/work-orders')}
          onScheduleService={() => {
            setActiveTab('schedules');
            tabsRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}
          onNewInspection={() => {
            setActiveTab('inspections');
            tabsRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}
          onViewOverdue={() => {
            setActiveTab('schedules');
            tabsRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* Insights & Trend Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <MaintenanceTrendChart />
          <MaintenanceInsightsCard />
          <LowStockAlert />
        </div>


        {/* Tabbed Content */}
        <div ref={tabsRef}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full max-w-2xl grid-cols-4">
              <TabsTrigger value="schedules" className="gap-2">
                <Calendar className="w-4 h-4" aria-hidden="true" />
                Schedules
              </TabsTrigger>
              <TabsTrigger value="inspections" className="gap-2">
                <ClipboardCheck className="w-4 h-4" aria-hidden="true" />
                Inspections
              </TabsTrigger>
              <TabsTrigger value="service-history" className="gap-2">
                <History className="w-4 h-4" aria-hidden="true" />
                Service Log
              </TabsTrigger>
              <TabsTrigger value="work-orders" className="gap-2">
                <ListChecks className="w-4 h-4" aria-hidden="true" />
                Work Orders
              </TabsTrigger>
            </TabsList>

            <TabsContent value="schedules">
              <MaintenanceSchedulesTab />
            </TabsContent>

            <TabsContent value="inspections">
              <VehicleInspectionsTab />
            </TabsContent>

            <TabsContent value="service-history">
              <ServiceHistoryTab />
            </TabsContent>

            <TabsContent value="work-orders">
              <MaintenanceHistoryTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default Maintenance;