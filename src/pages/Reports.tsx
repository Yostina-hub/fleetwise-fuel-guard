import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  FileText, 
  Download,
  Calendar,
  Search,
  FileSpreadsheet,
  Loader2,
  Truck,
  Users,
  MapPin,
  Route,
  Fuel,
  Wrench,
  DollarSign,
  BarChart3,
  Bell,
  ClipboardList,
} from "lucide-react";
import { useVehicles } from "@/hooks/useVehicles";
import { useDrivers } from "@/hooks/useDrivers";
import { useReportData } from "@/hooks/useReportData";
import { format, subDays, parseISO } from "date-fns";
import { toast } from "sonner";
import { exportToCSV, exportToPDF } from "@/lib/exportUtils";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

// Report components
import { ReportKPICards } from "@/components/reports/ReportKPICards";
import { ReportsQuickStats } from "@/components/reports/ReportsQuickStats";
import { ReportsQuickActions } from "@/components/reports/ReportsQuickActions";
import { ReportsInsightsCard } from "@/components/reports/ReportsInsightsCard";
import { ReportsTrendChart } from "@/components/reports/ReportsTrendChart";
import { SpeedingEventsTable } from "@/components/reports/SpeedingEventsTable";
import { DriverEventsTable } from "@/components/reports/DriverEventsTable";
import { GeofenceEventsTable } from "@/components/reports/GeofenceEventsTable";
import { IncidentsTable } from "@/components/reports/IncidentsTable";
import { TripsTable } from "@/components/reports/TripsTable";
import { FuelTransactionsTable } from "@/components/reports/FuelTransactionsTable";
import { FuelEventsTable } from "@/components/reports/FuelEventsTable";
import { FuelTheftTable } from "@/components/reports/FuelTheftTable";
import { AlertsTable } from "@/components/reports/AlertsTable";
import { MaintenanceTable } from "@/components/reports/MaintenanceTable";
import { WorkOrdersTable } from "@/components/reports/WorkOrdersTable";
import { CostsTable } from "@/components/reports/CostsTable";
import { DriverScoresTable } from "@/components/reports/DriverScoresTable";
import { DispatchTable } from "@/components/reports/DispatchTable";
import { InspectionsTable } from "@/components/reports/InspectionsTable";
import { VehicleUtilizationTable } from "@/components/reports/VehicleUtilizationTable";
import { IdleTimeTable } from "@/components/reports/IdleTimeTable";
import { DriverComplianceTable } from "@/components/reports/DriverComplianceTable";
import { DocumentExpiryTable } from "@/components/reports/DocumentExpiryTable";

const Reports = () => {
  const [activeReportTab, setActiveReportTab] = useState("vehicle");
  const [activeSubTab, setActiveSubTab] = useState("summary");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const { vehicles } = useVehicles();
  const { drivers } = useDrivers();
  const queryClient = useQueryClient();
  
  // Convert string dates to Date objects for the hook
  const dateRange = useMemo(() => ({
    start: parseISO(startDate),
    end: parseISO(endDate),
  }), [startDate, endDate]);

  const { 
    metrics, 
    trips, 
    driverEvents, 
    geofenceEvents, 
    incidents, 
    speedViolations,
    fuelTransactions,
    fuelEvents,
    fuelTheftCases,
    alerts,
    maintenanceSchedules,
    workOrders,
    vehicleCosts,
    driverScores,
    dispatchJobs,
    vehicleInspections,
    documents,
    loading 
  } = useReportData(dateRange);

  // Main report tabs with icons
  const mainTabs = [
    { id: "vehicle", label: "Vehicle", icon: Truck },
    { id: "driver", label: "Driver", icon: Users },
    { id: "location", label: "Location", icon: MapPin },
    { id: "fuel", label: "Fuel", icon: Fuel },
    { id: "trips", label: "Trips", icon: Route },
    { id: "maintenance", label: "Maintenance", icon: Wrench },
    { id: "dispatch", label: "Dispatch", icon: ClipboardList },
    { id: "costs", label: "Costs", icon: DollarSign },
    { id: "alerts", label: "Alerts", icon: Bell },
    { id: "compliance", label: "Compliance", icon: FileText },
  ];

  // Sub-tabs based on main tab - memoized to prevent hook order issues
  const subTabs = useMemo(() => {
    switch (activeReportTab) {
      case "vehicle":
        return [
          { id: "summary", label: "Summary" },
          { id: "utilization", label: "Utilization" },
          { id: "geofence", label: "Geofence Events" },
        ];
      case "driver":
        return [
          { id: "summary", label: "Summary" },
          { id: "scores", label: "Behavior Scores" },
          { id: "compliance", label: "Compliance" },
          { id: "speeding", label: "Speeding" },
          { id: "harsh_events", label: "Harsh Events" },
          { id: "incidents", label: "Incidents" },
        ];
      case "location":
        return [
          { id: "geofence", label: "Geofence Events" },
          { id: "speeding", label: "Speeding by Location" },
        ];
      case "fuel":
        return [
          { id: "transactions", label: "Transactions" },
          { id: "events", label: "Fill/Drain Events" },
          { id: "theft", label: "Theft Cases" },
        ];
      case "trips":
        return [
          { id: "all_trips", label: "All Trips" },
          { id: "idle_time", label: "Idle Time Analysis" },
        ];
      case "maintenance":
        return [
          { id: "schedules", label: "Schedules" },
          { id: "work_orders", label: "Work Orders" },
          { id: "inspections", label: "Inspections" },
        ];
      case "dispatch":
        return [
          { id: "jobs", label: "All Jobs" },
        ];
      case "costs":
        return [
          { id: "all_costs", label: "All Costs" },
        ];
      case "alerts":
        return [
          { id: "all_alerts", label: "All Alerts" },
        ];
      case "compliance":
        return [
          { id: "driver_compliance", label: "Driver Compliance" },
          { id: "document_expiry", label: "Document Expiry" },
        ];
      default:
        return [];
    }
  }, [activeReportTab]);

  // Get sub-tabs for a specific tab (used in click handler)
  const getSubTabsForTab = (tabId: string) => {
    switch (tabId) {
      case "vehicle":
        return [{ id: "summary", label: "Summary" }, { id: "utilization", label: "Utilization" }, { id: "geofence", label: "Geofence Events" }];
      case "driver":
        return [{ id: "summary", label: "Summary" }, { id: "scores", label: "Behavior Scores" }, { id: "compliance", label: "Compliance" }, { id: "speeding", label: "Speeding" }, { id: "harsh_events", label: "Harsh Events" }, { id: "incidents", label: "Incidents" }];
      case "location":
        return [{ id: "geofence", label: "Geofence Events" }, { id: "speeding", label: "Speeding by Location" }];
      case "fuel":
        return [{ id: "transactions", label: "Transactions" }, { id: "events", label: "Fill/Drain Events" }, { id: "theft", label: "Theft Cases" }];
      case "trips":
        return [{ id: "all_trips", label: "All Trips" }, { id: "idle_time", label: "Idle Time Analysis" }];
      case "maintenance":
        return [{ id: "schedules", label: "Schedules" }, { id: "work_orders", label: "Work Orders" }, { id: "inspections", label: "Inspections" }];
      case "dispatch":
        return [{ id: "jobs", label: "All Jobs" }];
      case "costs":
        return [{ id: "all_costs", label: "All Costs" }];
      case "alerts":
        return [{ id: "all_alerts", label: "All Alerts" }];
      case "compliance":
        return [{ id: "driver_compliance", label: "Driver Compliance" }, { id: "document_expiry", label: "Document Expiry" }];
      default:
        return [];
    }
  };

  // Filter data based on search
  const filteredVehicles = useMemo(() => {
    if (!searchQuery) return vehicles;
    return vehicles.filter(v => 
      v.plate_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.make?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.model?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [vehicles, searchQuery]);

  const filteredDrivers = useMemo(() => {
    if (!searchQuery) return drivers;
    return drivers.filter(d => 
      `${d.first_name} ${d.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.employee_id?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [drivers, searchQuery]);

  // Export handlers
  const handleExportCSV = () => {
    let data: Record<string, any>[] = [];
    let filename = "report";

    switch (activeReportTab) {
      case "vehicle":
        data = filteredVehicles.map(v => ({
          plate_number: v.plate_number,
          make: v.make,
          model: v.model,
          year: v.year,
          status: v.status,
          odometer_km: v.odometer_km,
          fuel_type: v.fuel_type,
        }));
        filename = "vehicle_report";
        break;
      case "driver":
        if (activeSubTab === "speeding") {
          data = speedViolations.map(v => ({
            time: format(new Date(v.violation_time), "yyyy-MM-dd HH:mm"),
            vehicle: v.vehicle?.plate_number || "Unknown",
            driver: v.driver ? `${v.driver.first_name} ${v.driver.last_name}` : "Unknown",
            speed: v.speed_kmh,
            limit: v.speed_limit_kmh,
            severity: v.severity,
            location: v.location_name,
          }));
          filename = "speeding_report";
        } else {
          data = filteredDrivers.map(d => ({
            name: `${d.first_name} ${d.last_name}`,
            employee_id: d.employee_id,
            license_number: d.license_number,
            status: d.status,
            safety_score: d.safety_score,
            total_trips: d.total_trips,
            total_distance_km: d.total_distance_km,
          }));
          filename = "driver_report";
        }
        break;
      case "fuel":
        data = fuelTransactions.map(t => ({
          date: format(new Date(t.transaction_date), "yyyy-MM-dd HH:mm"),
          vehicle: t.vehicle?.plate_number || "Unknown",
          liters: t.fuel_amount_liters,
          cost: t.fuel_cost,
          price_per_liter: t.fuel_price_per_liter,
          location: t.location_name,
        }));
        filename = "fuel_report";
        break;
      case "trips":
        data = trips.map(t => ({
          start_time: format(new Date(t.start_time), "yyyy-MM-dd HH:mm"),
          end_time: t.end_time ? format(new Date(t.end_time), "yyyy-MM-dd HH:mm") : "-",
          distance_km: t.distance_km,
          duration_min: t.duration_minutes,
          fuel_consumed_l: t.fuel_consumed_liters,
          status: t.status,
        }));
        filename = "trips_report";
        break;
      case "maintenance":
        data = workOrders.map(w => ({
          work_order: w.work_order_number,
          service: w.service_description,
          status: w.status,
          priority: w.priority,
          parts_cost: w.parts_cost,
          labor_cost: w.labor_cost,
          total_cost: w.total_cost,
        }));
        filename = "maintenance_report";
        break;
      case "dispatch":
        data = dispatchJobs.map(j => ({
          job_number: j.job_number,
          customer: j.customer_name,
          status: j.status,
          sla_met: j.sla_met,
        }));
        filename = "dispatch_report";
        break;
      case "costs":
        data = vehicleCosts.map(c => ({
          date: format(new Date(c.cost_date), "yyyy-MM-dd"),
          type: c.cost_type,
          category: c.category,
          description: c.description,
          amount: c.amount,
        }));
        filename = "costs_report";
        break;
      case "alerts":
        data = alerts.map(a => ({
          time: format(new Date(a.alert_time), "yyyy-MM-dd HH:mm"),
          title: a.title,
          type: a.alert_type,
          severity: a.severity,
          status: a.status,
        }));
        filename = "alerts_report";
        break;
    }

    exportToCSV(data, filename);
    toast.success("Report exported to CSV");
  };

  const handleExportPDF = () => {
    const data = filteredVehicles.map(v => ({
      plate_number: v.plate_number || "-",
      make: v.make || "-",
      model: v.model || "-",
      status: v.status || "-",
    }));
    exportToPDF(
      `${mainTabs.find(t => t.id === activeReportTab)?.label || "Report"}`,
      data,
      [
        { key: "plate_number", label: "Vehicle", width: 50 },
        { key: "make", label: "Make", width: 50 },
        { key: "model", label: "Model", width: 50 },
        { key: "status", label: "Status", width: 40 },
      ],
      `${activeReportTab}_report`
    );
    toast.success("Report exported to PDF");
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['trips'] });
    queryClient.invalidateQueries({ queryKey: ['driver-events'] });
    queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    queryClient.invalidateQueries({ queryKey: ['drivers'] });
    toast.success("Refreshing report data...");
  };

  // Render content based on active tabs
  const renderContent = () => {
    if (loading) {
      return (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      );
    }

    switch (activeReportTab) {
      case "vehicle":
        switch (activeSubTab) {
          case "utilization":
            return <VehicleUtilizationTable trips={trips} />;
          case "geofence":
            return <GeofenceEventsTable events={geofenceEvents} />;
          default:
            return <VehicleSummaryTable vehicles={filteredVehicles} />;
        }
      case "driver":
        switch (activeSubTab) {
          case "scores":
            return <DriverScoresTable scores={driverScores} />;
          case "compliance":
            return <DriverComplianceTable drivers={drivers} />;
          case "speeding":
            return <SpeedingEventsTable violations={speedViolations} />;
          case "harsh_events":
            return <DriverEventsTable events={driverEvents} eventType="all" title="All Harsh Events" />;
          case "incidents":
            return <IncidentsTable incidents={incidents} />;
          default:
            return <DriverSummaryTable drivers={filteredDrivers} />;
        }
      case "location":
        switch (activeSubTab) {
          case "speeding":
            return <SpeedingEventsTable violations={speedViolations} />;
          default:
            return <GeofenceEventsTable events={geofenceEvents} />;
        }
      case "fuel":
        switch (activeSubTab) {
          case "events":
            return <FuelEventsTable events={fuelEvents} />;
          case "theft":
            return <FuelTheftTable cases={fuelTheftCases} />;
          default:
            return <FuelTransactionsTable transactions={fuelTransactions} />;
        }
      case "trips":
        switch (activeSubTab) {
          case "idle_time":
            return <IdleTimeTable trips={trips} />;
          default:
            return <TripsTable trips={trips} />;
        }
      case "maintenance":
        switch (activeSubTab) {
          case "work_orders":
            return <WorkOrdersTable workOrders={workOrders} />;
          case "inspections":
            return <InspectionsTable inspections={vehicleInspections} />;
          default:
            return <MaintenanceTable schedules={maintenanceSchedules} />;
        }
      case "dispatch":
        return <DispatchTable jobs={dispatchJobs} />;
      case "costs":
        return <CostsTable costs={vehicleCosts} />;
      case "alerts":
        return <AlertsTable alerts={alerts} />;
      case "compliance":
        switch (activeSubTab) {
          case "document_expiry":
            return <DocumentExpiryTable documents={documents} />;
          default:
            return <DriverComplianceTable drivers={drivers} />;
        }
      default:
        return <VehicleSummaryTable vehicles={filteredVehicles} />;
    }
  };

  return (
    <Layout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Reports & Analytics
            </h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive fleet analytics and operational insights
            </p>
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-10 h-10 text-primary/20" />
          </div>
        </div>

        {/* Quick Stats */}
        <ReportsQuickStats 
          metrics={metrics} 
          vehicleCount={vehicles.length} 
          driverCount={drivers.length} 
        />

        {/* Main Report Tabs */}
        <div className="border-b border-border overflow-x-auto">
          <nav className="flex gap-1 min-w-max">
            {mainTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveReportTab(tab.id);
                  const newSubTabs = getSubTabsForTab(tab.id);
                  setActiveSubTab(newSubTabs[0]?.id || "summary");
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap",
                  activeReportTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Sub Tabs */}
        {subTabs.length > 0 && (
          <div className="flex items-center gap-4 flex-wrap">
            {subTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-full transition-all",
                  activeSubTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Date Range & Export */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Start Date</label>
              <div className="flex items-center gap-2 border border-border rounded-md px-3 py-2 bg-background">
                <Calendar className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-sm outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">End Date</label>
              <div className="flex items-center gap-2 border border-border rounded-md px-3 py-2 bg-background">
                <Calendar className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-sm outline-none"
                />
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2">
                <Download className="w-4 h-4" aria-hidden="true" />
                Export Report
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV}>
                <FileSpreadsheet className="w-4 h-4 mr-2" aria-hidden="true" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF}>
                <FileText className="w-4 h-4 mr-2" aria-hidden="true" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* KPI Cards */}
        <ReportKPICards metrics={metrics} activeTab={activeReportTab} />

        {/* Quick Actions, Insights & Trend Chart Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ReportsQuickActions
            onExportCSV={handleExportCSV}
            onExportPDF={handleExportPDF}
            onRefresh={handleRefresh}
            isLoading={loading}
          />
          <ReportsInsightsCard metrics={metrics} />
          <ReportsTrendChart 
            trips={trips} 
            driverEvents={driverEvents} 
            activeTab={activeReportTab} 
          />
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Data Table */}
        {renderContent()}
      </div>
    </Layout>
  );
};

// Vehicle Summary Table Component
const VehicleSummaryTable = ({ vehicles }: { vehicles: any[] }) => {
  if (vehicles.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Truck className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No Vehicles Found</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            No vehicles match your search criteria
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Truck className="w-5 h-5 text-primary" />
          Vehicle Summary ({vehicles.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-y">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Vehicle</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Make/Model</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Year</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Odometer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Fuel Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{v.plate_number || "Unknown"}</td>
                  <td className="px-4 py-3">{v.make} {v.model}</td>
                  <td className="px-4 py-3">{v.year || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      v.status === "active" ? "bg-green-500/20 text-green-500" :
                      v.status === "maintenance" ? "bg-yellow-500/20 text-yellow-600" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{v.odometer_km ? `${v.odometer_km.toLocaleString()} km` : "-"}</td>
                  <td className="px-4 py-3 capitalize">{v.fuel_type || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

// Driver Summary Table Component
const DriverSummaryTable = ({ drivers }: { drivers: any[] }) => {
  if (drivers.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No Drivers Found</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            No drivers match your search criteria
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5 text-primary" />
          Driver Summary ({drivers.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-y">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Employee ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">License</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Safety Score</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Total Trips</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Total Distance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {drivers.map((d) => (
                <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{d.first_name} {d.last_name}</td>
                  <td className="px-4 py-3">{d.employee_id || "-"}</td>
                  <td className="px-4 py-3">{d.license_number || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      d.status === "active" ? "bg-green-500/20 text-green-500" :
                      d.status === "on_leave" ? "bg-amber-500/20 text-amber-600" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "font-medium",
                      (d.safety_score || 0) >= 90 ? "text-green-500" :
                      (d.safety_score || 0) >= 70 ? "text-amber-500" :
                      "text-red-500"
                    )}>
                      {d.safety_score || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{d.total_trips || 0}</td>
                  <td className="px-4 py-3">{d.total_distance_km ? `${d.total_distance_km.toLocaleString()} km` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default Reports;
