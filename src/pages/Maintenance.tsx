import { useState } from "react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import KPICard from "@/components/KPICard";
import { 
  Wrench, 
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle,
  Plus,
  Loader2,
  ClipboardCheck,
  ListChecks,
  Search
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useVehicles } from "@/hooks/useVehicles";
import { useMaintenanceMetrics } from "@/hooks/useMaintenanceMetrics";
import MaintenanceSchedulesTab from "@/components/maintenance/MaintenanceSchedulesTab";
import VehicleInspectionsTab from "@/components/maintenance/VehicleInspectionsTab";
import MaintenanceHistoryTab from "@/components/maintenance/MaintenanceHistoryTab";
import DateRangeFilter from "@/components/dashboard/DateRangeFilter";
import { subDays } from "date-fns";

interface DateRange {
  start: Date;
  end: Date;
}

const Maintenance = () => {
  const navigate = useNavigate();
  const { loading: vehiclesLoading } = useVehicles();
  const { metrics, loading: metricsLoading } = useMaintenanceMetrics();
  const [dateRange, setDateRange] = useState<DateRange>({
    start: subDays(new Date(), 30),
    end: new Date(),
  });
  const [searchQuery, setSearchQuery] = useState("");

  const loading = vehiclesLoading || metricsLoading;

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
            <Button 
              className="gap-2 glass-strong hover:scale-105 transition-all duration-300 glow" 
              onClick={() => navigate('/work-orders')}
              aria-label="Create new work order"
            >
              <Plus className="w-5 h-5" aria-hidden="true" />
              <span className="font-semibold">New Work Order</span>
            </Button>
          </div>
        </div>

        {/* KPI Grid - Now using real data */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Scheduled Services"
            value={metrics.totalScheduled.toString()}
            subtitle="active schedules"
            icon={<Calendar className="w-5 h-5" aria-hidden="true" />}
            variant="default"
          />
          <KPICard
            title="Overdue"
            value={metrics.overdueCount.toString()}
            subtitle="require immediate attention"
            icon={<AlertCircle className="w-5 h-5" aria-hidden="true" />}
            variant={metrics.overdueCount > 0 ? "warning" : "success"}
          />
          <KPICard
            title="Completed"
            value={metrics.completedThisMonth.toString()}
            subtitle="this month"
            icon={<CheckCircle className="w-5 h-5" aria-hidden="true" />}
            variant="success"
          />
          <KPICard
            title="Compliance Rate"
            value={`${Math.round(metrics.complianceRate)}%`}
            subtitle="on-schedule maintenance"
            icon={<Clock className="w-5 h-5" aria-hidden="true" />}
            variant={metrics.complianceRate >= 90 ? "success" : metrics.complianceRate >= 70 ? "default" : "warning"}
          />
        </div>

        {/* Tabs for different maintenance modules */}
        <Tabs defaultValue="schedules" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="schedules" className="gap-2">
              <Calendar className="w-4 h-4" aria-hidden="true" />
              Schedules
            </TabsTrigger>
            <TabsTrigger value="inspections" className="gap-2">
              <ClipboardCheck className="w-4 h-4" aria-hidden="true" />
              Inspections
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <ListChecks className="w-4 h-4" aria-hidden="true" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedules">
            <MaintenanceSchedulesTab />
          </TabsContent>

          <TabsContent value="inspections">
            <VehicleInspectionsTab />
          </TabsContent>

          <TabsContent value="history">
            <MaintenanceHistoryTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Maintenance;