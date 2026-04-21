import { useState, useRef } from "react";
import Layout from "@/components/Layout";
import { Can } from "@/components/auth/Can";
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
  History,
  Sparkles,
  FlaskConical,
  Sliders,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useVehicles } from "@/hooks/useVehicles";
import { useMaintenanceMetrics } from "@/hooks/useMaintenanceMetrics";
import { useMaintenanceSchedules } from "@/hooks/useMaintenanceSchedules";
import MaintenanceSchedulesTab from "@/components/maintenance/MaintenanceSchedulesTab";
import VehicleInspectionsTab from "@/components/maintenance/VehicleInspectionsTab";
import MaintenanceHistoryTab from "@/components/maintenance/MaintenanceHistoryTab";
import ServiceHistoryTab from "@/components/maintenance/ServiceHistoryTab";
import MaintenanceClassOverridesTab from "@/components/maintenance/MaintenanceClassOverridesTab";
import MaintenanceDryRunDialog from "@/components/maintenance/MaintenanceDryRunDialog";
import MaintenanceQuickStats from "@/components/maintenance/MaintenanceQuickStats";
import MaintenanceQuickActions from "@/components/maintenance/MaintenanceQuickActions";
import { WorkflowAutomationPanel } from "@/components/workflow/WorkflowAutomationPanel";
import MaintenanceInsightsCard from "@/components/maintenance/MaintenanceInsightsCard";
import MaintenanceTrendChart from "@/components/maintenance/MaintenanceTrendChart";
import LowStockAlert from "@/components/maintenance/LowStockAlert";
import DateRangeFilter from "@/components/dashboard/DateRangeFilter";
import { subDays, differenceInDays, parseISO, isAfter } from "date-fns";
import { useTranslation } from "react-i18next";

interface DateRange {
  start: Date;
  end: Date;
}

const Maintenance = () => {
  const { t } = useTranslation();
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
  const [runningScheduler, setRunningScheduler] = useState(false);
  const [dryRunOpen, setDryRunOpen] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  /**
   * Fire the maintenance auto-scheduler edge function. The same job runs
   * automatically every hour via pg_cron, but admins occasionally want to
   * trigger it on-demand (e.g. after bulk-importing schedules).
   */
  const handleRunScheduler = async () => {
    setRunningScheduler(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "maintenance-auto-scheduler",
        { body: { source: "manual" } },
      );
      if (error) throw error;
      const created = (data as any)?.created ?? 0;
      const examined = (data as any)?.examined ?? 0;
      toast.success(
        created > 0
          ? `Auto-scheduler created ${created} work order${created === 1 ? "" : "s"} (scanned ${examined} schedules)`
          : `Auto-scheduler scanned ${examined} schedules — none due right now`,
      );
    } catch (e: any) {
      toast.error(`Scheduler failed: ${e.message ?? "unknown error"}`);
    } finally {
      setRunningScheduler(false);
    }
  };

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
        <div className="p-4 md:p-8 flex items-center justify-center min-h-[400px]">
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
      <div className="p-4 md:p-8 space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 slide-in-right">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl glass-strong glow">
              <Wrench className="w-8 h-8 text-primary float-animation" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl md:text-4xl font-bold gradient-text">{t('maintenance.title')}</h1>
              <p className="text-muted-foreground mt-1 text-lg">{t('maintenance.serviceHistory')}</p>
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
            <Can resource="maintenance" action="create">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDryRunOpen(true)}
                className="gap-2"
                title="Preview what the auto-scheduler would create without committing"
              >
                <FlaskConical className="w-4 h-4" aria-hidden="true" />
                Dry Run
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRunScheduler}
                disabled={runningScheduler}
                className="gap-2"
                title="Scan schedules and auto-create overdue work orders"
              >
                {runningScheduler ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                )}
                Run Scheduler
              </Button>
            </Can>
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

        {/* Maintenance Workflow Automations */}
        <WorkflowAutomationPanel
          categories={["maintenance"]}
          title="Maintenance Automations"
          description="Preventive, predictive & inspection-based maintenance workflows"
          compact
        />


        {/* Tabbed Content */}
        <div ref={tabsRef}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full max-w-3xl grid-cols-5">
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
              <TabsTrigger value="class-tuning" className="gap-2">
                <Sliders className="w-4 h-4" aria-hidden="true" />
                Class Tuning
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

            <TabsContent value="class-tuning">
              <MaintenanceClassOverridesTab />
            </TabsContent>
          </Tabs>
        </div>

        <MaintenanceDryRunDialog
          open={dryRunOpen}
          onOpenChange={setDryRunOpen}
        />
      </div>
    </Layout>
  );
};

export default Maintenance;