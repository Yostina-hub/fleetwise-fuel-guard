import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Droplet, TrendingDown, AlertTriangle, CheckCircle, Clock, Search, Download, Calendar } from "lucide-react";
import { useFuelEvents } from "@/hooks/useFuelEvents";
import { useFuelPageContext } from "@/contexts/FuelPageContext";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { format, subDays, isWithinInterval, parseISO } from "date-fns";
import { toast } from "sonner";
import { TablePagination, usePagination } from "@/components/reports/TablePagination";

const ITEMS_PER_PAGE = 10;

const FuelEventsTab = () => {
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<string>("30");
  
  const { fuelEvents, loading, markAsInvestigating, markAsFalsePositive } = useFuelEvents({
    vehicleId: vehicleFilter !== 'all' ? vehicleFilter : undefined,
    eventType: eventTypeFilter !== 'all' ? eventTypeFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });
  const { vehicles, getVehiclePlate } = useFuelPageContext();
  const { formatFuel, formatCurrency, settings } = useOrganizationSettings();

  // Filter by date range and search
  const filteredEvents = useMemo(() => {
    const now = new Date();
    const daysAgo = dateRange === 'all' ? null : subDays(now, parseInt(dateRange));
    
    return fuelEvents.filter(event => {
      // Date range filter
      if (daysAgo) {
        const eventDate = parseISO(event.event_time);
        if (!isWithinInterval(eventDate, { start: daysAgo, end: now })) {
          return false;
        }
      }
      
      // Search filter
      if (searchQuery) {
        const plate = getVehiclePlate(event.vehicle_id);
        const searchLower = searchQuery.toLowerCase();
        return (
          plate?.toLowerCase().includes(searchLower) ||
          event.location_name?.toLowerCase().includes(searchLower) ||
          event.event_type?.toLowerCase().includes(searchLower)
        );
      }
      
      return true;
    });
  }, [fuelEvents, dateRange, searchQuery, getVehiclePlate]);

  const getEventTypeBadge = (type: string) => {
    switch (type) {
      case 'refuel': return <Badge className="bg-success/10 text-success border-success/20">Refuel</Badge>;
      case 'theft': return <Badge variant="destructive">Theft</Badge>;
      case 'leak': return <Badge className="bg-warning/10 text-warning border-warning/20">Leak</Badge>;
      case 'drain': return <Badge className="bg-destructive/20 text-destructive">Drain</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'confirmed': return <Badge className="bg-success/10 text-success border-success/20"><CheckCircle className="w-3 h-3 mr-1" />Confirmed</Badge>;
      case 'pending': return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'investigating': return <Badge className="bg-warning/10 text-warning border-warning/20">Investigating</Badge>;
      case 'false_positive': return <Badge variant="secondary">False Positive</Badge>;
      default: return null;
    }
  };

  const { currentPage, setCurrentPage, startIndex, endIndex } = usePagination(filteredEvents.length, ITEMS_PER_PAGE);
  const paginatedEvents = filteredEvents.slice(startIndex, endIndex);

  const groupedEvents = useMemo(() => {
    const groups: Record<string, typeof paginatedEvents> = {};
    paginatedEvents.forEach(event => {
      const date = format(new Date(event.event_time), "yyyy-MM-dd");
      if (!groups[date]) groups[date] = [];
      groups[date].push(event);
    });
    return groups;
  }, [paginatedEvents]);

  // Export to CSV - exports all filtered events, not just current page
  const exportEventsCSV = () => {
    const headers = ["Date/Time", "Vehicle", "Event Type", "Status", "Fuel Change (L)", "Change %", "Location"];
    const rows = filteredEvents.map(e => [
      format(new Date(e.event_time), "yyyy-MM-dd HH:mm"),
      getVehiclePlate(e.vehicle_id),
      e.event_type,
      e.status || "",
      e.fuel_change_liters.toFixed(1),
      e.fuel_change_percent.toFixed(1),
      e.location_name || ""
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fuel-events-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Fuel events exported");
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[300px]" role="status" aria-live="polite" aria-label="Loading fuel events..."><Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden="true" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex flex-wrap gap-3 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              aria-label="Search fuel events"
            />
          </div>
          <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
            <SelectTrigger className="w-40" aria-label="Filter by vehicle">
              <SelectValue placeholder="All Vehicles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vehicles</SelectItem>
              {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
            <SelectTrigger className="w-36" aria-label="Filter by event type">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="refuel">Refuel</SelectItem>
              <SelectItem value="theft">Theft</SelectItem>
              <SelectItem value="leak">Leak</SelectItem>
              <SelectItem value="drain">Drain</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36" aria-label="Filter by status">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="investigating">Investigating</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="false_positive">False Positive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-36" aria-label="Filter by date range">
              <Calendar className="w-4 h-4 mr-2" aria-hidden="true" />
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" className="gap-2" onClick={exportEventsCSV} aria-label="Export fuel events to CSV">
          <Download className="w-4 h-4" aria-hidden="true" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card role="region" aria-label="Refuel events count">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Droplet className="w-5 h-5 text-success" aria-hidden="true" />
              </div>
              <div>
                <div className="text-2xl font-bold">{filteredEvents.filter(e => e.event_type === 'refuel').length}</div>
                <div className="text-sm text-muted-foreground">Refuel Events</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card role="region" aria-label="Theft and drain events count">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="w-5 h-5 text-destructive" aria-hidden="true" />
              </div>
              <div>
                <div className="text-2xl font-bold">{filteredEvents.filter(e => e.event_type === 'theft' || e.event_type === 'drain').length}</div>
                <div className="text-sm text-muted-foreground">Theft/Drain</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card role="region" aria-label="Leak events count">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <TrendingDown className="w-5 h-5 text-warning" aria-hidden="true" />
              </div>
              <div>
                <div className="text-2xl font-bold">{filteredEvents.filter(e => e.event_type === 'leak').length}</div>
                <div className="text-sm text-muted-foreground">Leak Events</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card role="region" aria-label="Pending review count">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Clock className="w-5 h-5 text-primary" aria-hidden="true" />
              </div>
              <div>
                <div className="text-2xl font-bold">{filteredEvents.filter(e => e.status === 'pending').length}</div>
                <div className="text-sm text-muted-foreground">Pending Review</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events Timeline */}
      {Object.keys(groupedEvents).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground" role="status" aria-label="No fuel events recorded"><Droplet className="w-12 h-12 mx-auto mb-4 opacity-50" aria-hidden="true" /><p>No fuel events recorded yet</p></CardContent></Card>
      ) : (
        Object.entries(groupedEvents).map(([date, events]) => (
          <div key={date}>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">{format(new Date(date), "EEEE, MMMM d, yyyy")}</h3>
            <div className="space-y-3">
              {events.map(event => (
                <Card key={event.id} className={event.event_type === 'theft' || event.event_type === 'drain' ? 'border-destructive/30' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 min-w-0 flex-1">
                        <div className={`p-2 rounded-lg shrink-0 ${event.event_type === 'refuel' ? 'bg-success/10' : event.event_type === 'theft' || event.event_type === 'drain' ? 'bg-destructive/10' : 'bg-warning/10'}`}>
                          <Droplet className={`w-5 h-5 ${event.event_type === 'refuel' ? 'text-success' : event.event_type === 'theft' || event.event_type === 'drain' ? 'text-destructive' : 'text-warning'}`} aria-hidden="true" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold truncate" title={getVehiclePlate(event.vehicle_id)}>
                              {getVehiclePlate(event.vehicle_id)}
                            </span>
                            {getEventTypeBadge(event.event_type)}
                            {getStatusBadge(event.status)}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1 truncate" title={event.location_name || undefined}>
                            {format(new Date(event.event_time), "HH:mm")}
                            {event.location_name && ` • ${event.location_name}`}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-lg font-bold ${event.fuel_change_liters > 0 ? 'text-success' : 'text-destructive'}`}>
                          {event.fuel_change_liters > 0 ? '+' : ''}{formatFuel(event.fuel_change_liters)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {event.fuel_change_percent > 0 ? '+' : ''}{event.fuel_change_percent.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    {(event.event_type === 'theft' || event.event_type === 'drain') && event.status === 'pending' && (
                      <div className="flex gap-2 mt-4 pt-3 border-t border-border">
                        <Button size="sm" variant="default" onClick={() => markAsInvestigating(event.id)}>Investigate</Button>
                        <Button size="sm" variant="outline" onClick={() => markAsFalsePositive(event.id)}>Mark False Positive</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Pagination */}
      <TablePagination
        currentPage={currentPage}
        totalItems={filteredEvents.length}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default FuelEventsTab;
