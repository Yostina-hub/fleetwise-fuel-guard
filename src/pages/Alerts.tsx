import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SOSAlertPanel } from "@/components/alerts/SOSAlertPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import AlertDetailModal from "@/components/AlertDetailModal";
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle,
  Clock,
  MapPin,
  Filter,
  Download,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  CalendarIcon,
  X,
  CheckCheck,
  FileText
} from "lucide-react";
import { useAlerts, Alert } from "@/hooks/useAlerts";
import { useVehicles } from "@/hooks/useVehicles";
import { useDrivers } from "@/hooks/useDrivers";
import { format } from "date-fns";

const Alerts = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([]);
  const itemsPerPage = 10;
  
  const { 
    alerts: dbAlerts, 
    loading, 
    stats, 
    alertTypes,
    acknowledgeAlert,
    resolveAlert,
    bulkAcknowledge,
    bulkResolve
  } = useAlerts({ 
    severity: severityFilter,
    status: statusFilter,
    alertType: typeFilter,
    dateFrom: dateFrom?.toISOString(),
    dateTo: dateTo?.toISOString()
  });
  const { vehicles } = useVehicles();
  const { drivers } = useDrivers();
  const [selectedAlert, setSelectedAlert] = useState<any>(null);

  // Transform DB alerts to display format
  const alerts = useMemo(() => {
    return dbAlerts.map(alert => {
      const vehicle = vehicles.find(v => v.id === alert.vehicle_id);
      const driver = drivers.find(d => d.id === alert.driver_id);
      return {
        ...alert,
        vehiclePlate: vehicle?.plate_number || "Unknown",
        driverName: driver ? `${driver.first_name} ${driver.last_name}` : null,
        formattedTime: new Date(alert.alert_time).toLocaleString(),
      };
    });
  }, [dbAlerts, vehicles, drivers]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="w-5 h-5 text-destructive" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-warning" />;
      case "info":
        return <Info className="w-5 h-5 text-primary" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "border-l-destructive bg-destructive/5";
      case "warning":
        return "border-l-warning bg-warning/5";
      case "info":
        return "border-l-primary bg-primary/5";
      default:
        return "border-l-border";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "unacknowledged":
        return <Badge variant="destructive">Unacknowledged</Badge>;
      case "acknowledged":
        return <Badge variant="outline" className="border-warning text-warning">Acknowledged</Badge>;
      case "resolved":
        return <Badge variant="outline" className="border-success text-success">Resolved</Badge>;
      default:
        return null;
    }
  };

  // Filter and search
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const matchesSearch = searchQuery === "" ||
        alert.alert_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.vehiclePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (alert.location_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (alert.driverName || "").toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    });
  }, [alerts, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredAlerts.length / itemsPerPage);
  const paginatedAlerts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAlerts.slice(start, start + itemsPerPage);
  }, [filteredAlerts, currentPage]);

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedAlerts.length === paginatedAlerts.length) {
      setSelectedAlerts([]);
    } else {
      setSelectedAlerts(paginatedAlerts.map(a => a.id));
    }
  };

  const toggleSelectAlert = (alertId: string) => {
    setSelectedAlerts(prev => 
      prev.includes(alertId) 
        ? prev.filter(id => id !== alertId)
        : [...prev, alertId]
    );
  };

  // Export handler
  const handleExport = () => {
    const csvContent = [
      ["ID", "Type", "Severity", "Status", "Vehicle", "Driver", "Message", "Location", "Time"].join(","),
      ...filteredAlerts.map(alert => [
        alert.id,
        alert.alert_type,
        alert.severity,
        alert.status,
        alert.vehiclePlate,
        alert.driverName || "N/A",
        `"${alert.message.replace(/"/g, '""')}"`,
        alert.location_name || "Unknown",
        alert.formattedTime
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `alerts-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Bulk action handlers
  const handleBulkAcknowledge = async () => {
    const success = await bulkAcknowledge(selectedAlerts);
    if (success) setSelectedAlerts([]);
  };

  const handleBulkResolve = async () => {
    const success = await bulkResolve(selectedAlerts);
    if (success) setSelectedAlerts([]);
  };

  // Clear filters
  const clearFilters = () => {
    setSeverityFilter("all");
    setStatusFilter("all");
    setTypeFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setSearchQuery("");
    setCurrentPage(1);
  };

  const hasActiveFilters = severityFilter !== "all" || statusFilter !== "all" || typeFilter !== "all" || dateFrom || dateTo;

  // View on map handler
  const handleViewOnMap = (alert: any) => {
    if (alert.lat && alert.lng) {
      navigate(`/map?lat=${alert.lat}&lng=${alert.lng}&alertId=${alert.id}`);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-8 flex items-center justify-center min-h-[400px]">
          <div className="text-center" role="status" aria-label="Loading alerts">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" aria-hidden="true" />
            <p className="text-muted-foreground">Loading alerts...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between slide-in-left">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl glass-strong pulse-glow">
              <AlertTriangle className="w-8 h-8 text-destructive animate-float" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-destructive via-warning to-destructive bg-clip-text text-transparent">
                Alert Center
              </h1>
              <p className="text-muted-foreground mt-1 text-lg">
                Monitor and manage fleet alerts • <span className="font-semibold text-foreground">{stats.total}</span> total alerts
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="gap-2 glass hover:bg-primary hover:text-primary-foreground transition-all duration-300"
              onClick={handleExport}
              aria-label="Export alerts to CSV"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              Export
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="glass-strong border-2 hover:border-destructive/50 transition-all duration-300 hover:shadow-2xl card-premium">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-destructive/10 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-destructive" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.critical}</div>
                  <div className="text-sm text-muted-foreground">Critical</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-strong border-2 hover:border-warning/50 transition-all duration-300 hover:shadow-2xl card-premium">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-warning/10 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-warning" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.warning}</div>
                  <div className="text-sm text-muted-foreground">Warning</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-strong border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-2xl card-premium">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Info className="w-6 h-6 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.info}</div>
                  <div className="text-sm text-muted-foreground">Info</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-strong border-2 hover:border-yellow-500/50 transition-all duration-300 hover:shadow-2xl card-premium">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-500/10 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-500" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.unacknowledged}</div>
                  <div className="text-sm text-muted-foreground">Pending</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-strong border-2 hover:border-success/50 transition-all duration-300 hover:shadow-2xl card-premium">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-success/10 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-success" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.resolved}</div>
                  <div className="text-sm text-muted-foreground">Resolved</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SOS Alert Panel */}
        <SOSAlertPanel />

        {/* Filters */}
        <Card className="glass-strong border">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm text-muted-foreground mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="alerts-search"
                    placeholder="Search alerts..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-9"
                    aria-label="Search alerts by type, message, vehicle, or location"
                  />
                </div>
              </div>

              {/* Severity Filter */}
              <div className="w-[150px]">
                <label className="text-sm text-muted-foreground mb-2 block">Severity</label>
                <Select value={severityFilter} onValueChange={(v) => { setSeverityFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="w-[150px]">
                <label className="text-sm text-muted-foreground mb-2 block">Status</label>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="unacknowledged">Unacknowledged</SelectItem>
                    <SelectItem value="acknowledged">Acknowledged</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Type Filter */}
              <div className="w-[180px]">
                <label className="text-sm text-muted-foreground mb-2 block">Type</label>
                <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {alertTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date From */}
              <div className="w-[160px]">
                <label className="text-sm text-muted-foreground mb-2 block">From Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal" aria-label="Select start date">
                      <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                      {dateFrom ? format(dateFrom, "PP") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dateFrom} onSelect={(d) => { setDateFrom(d); setCurrentPage(1); }} />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date To */}
              <div className="w-[160px]">
                <label className="text-sm text-muted-foreground mb-2 block">To Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal" aria-label="Select end date">
                      <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                      {dateTo ? format(dateTo, "PP") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dateTo} onSelect={(d) => { setDateTo(d); setCurrentPage(1); }} />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button variant="ghost" onClick={clearFilters} className="gap-2" aria-label="Clear all filters">
                  <X className="w-4 h-4" aria-hidden="true" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions Toolbar */}
        {selectedAlerts.length > 0 && (
          <div className="flex items-center gap-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
            <span className="font-medium">{selectedAlerts.length} alert(s) selected</span>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleBulkAcknowledge} className="gap-2" aria-label="Acknowledge all selected alerts">
                <CheckCheck className="w-4 h-4" aria-hidden="true" />
                Acknowledge All
              </Button>
              <Button size="sm" variant="outline" onClick={handleBulkResolve} className="gap-2" aria-label="Resolve all selected alerts">
                <CheckCircle className="w-4 h-4" aria-hidden="true" />
                Resolve All
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedAlerts([])}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Alerts List */}
        <Card className="glass-strong border-2 hover:border-primary/30 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl">All Alerts</CardTitle>
            <div className="text-sm text-muted-foreground">
              Showing {paginatedAlerts.length} of {filteredAlerts.length} alerts
            </div>
          </CardHeader>
          <CardContent>
            {/* Select All */}
            {paginatedAlerts.length > 0 && (
              <div className="flex items-center gap-2 mb-4 pb-4 border-b">
                <Checkbox
                  id="select-all-alerts"
                  checked={selectedAlerts.length === paginatedAlerts.length && paginatedAlerts.length > 0}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all alerts on this page"
                />
                <label htmlFor="select-all-alerts" className="text-sm text-muted-foreground cursor-pointer">
                  Select all on this page
                </label>
              </div>
            )}

            {/* Empty State */}
            {paginatedAlerts.length === 0 ? (
              <div className="text-center py-12" role="status" aria-label="No alerts found">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" aria-hidden="true" />
                <h3 className="text-lg font-medium mb-2">No alerts found</h3>
                <p className="text-muted-foreground">
                  {hasActiveFilters 
                    ? "Try adjusting your filters to see more results."
                    : "There are no alerts to display at this time."}
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters} className="mt-4">
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`group p-4 border-l-4 rounded-lg transition-all hover:shadow-md ${getSeverityColor(alert.severity)} ${
                      selectedAlerts.includes(alert.id) ? "ring-2 ring-primary" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <Checkbox
                          id={`alert-${alert.id}`}
                          checked={selectedAlerts.includes(alert.id)}
                          onCheckedChange={() => toggleSelectAlert(alert.id)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select ${alert.alert_type} alert`}
                        />
                        <div 
                          className="flex items-start gap-3 flex-1 cursor-pointer"
                          onClick={() => setSelectedAlert(alert)}
                        >
                          {getSeverityIcon(alert.severity)}
                          <div className="flex-1">
                            <div className="font-semibold text-lg">{alert.alert_type}</div>
                            <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1">
                              <span>Vehicle: <span className="font-medium text-foreground">{alert.vehiclePlate}</span></span>
                              {alert.driverName && (
                                <span>Driver: <span className="font-medium text-foreground">{alert.driverName}</span></span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(alert.status)}
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => setSelectedAlert(alert)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>

                    <p className="text-sm mb-3 ml-12">{alert.message}</p>

                    <div className="flex items-center gap-6 ml-12 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" aria-hidden="true" />
                        <span>{alert.formattedTime}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" aria-hidden="true" />
                        <span>{alert.location_name || "Unknown location"}</span>
                      </div>
                      {alert.lat && alert.lng && (
                        <Button 
                          size="sm" 
                          variant="link" 
                          className="p-0 h-auto text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewOnMap(alert);
                          }}
                        >
                          View on Map
                        </Button>
                      )}
                    </div>

                    {alert.status === "unacknowledged" && (
                      <div className="mt-3 ml-12 flex gap-2">
                        <Button 
                          size="sm" 
                          variant="default"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await acknowledgeAlert(alert.id);
                          }}
                        >
                          Acknowledge
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await resolveAlert(alert.id);
                          }}
                        >
                          Resolve
                        </Button>
                      </div>
                    )}

                    {alert.status === "acknowledged" && (
                      <div className="mt-3 ml-12">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await resolveAlert(alert.id);
                          }}
                        >
                          Mark Resolved
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    aria-label="Go to previous page"
                  >
                    <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    aria-label="Go to next page"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alert Detail Modal */}
      <AlertDetailModal
        open={!!selectedAlert}
        onOpenChange={(open) => !open && setSelectedAlert(null)}
        alert={selectedAlert}
        onAcknowledge={acknowledgeAlert}
        onResolve={resolveAlert}
        onViewOnMap={handleViewOnMap}
      />
    </Layout>
  );
};

export default Alerts;