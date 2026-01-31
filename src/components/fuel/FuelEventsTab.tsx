import { useState, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Droplet, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useFuelEvents } from "@/hooks/useFuelEvents";
import { useFuelPageContext } from "@/contexts/FuelPageContext";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { format, subDays, isWithinInterval, parseISO } from "date-fns";
import { toast } from "sonner";
import { TablePagination, usePagination } from "@/components/reports/TablePagination";
import FuelToolbar from "./FuelToolbar";
import FuelStatusChips from "./FuelStatusChips";
import FuelEventsListView from "./FuelEventsListView";
import FuelEventsMapView from "./FuelEventsMapView";

const ITEMS_PER_PAGE = 10;

interface FuelEvent {
  id: string;
  vehicle_id: string;
  event_type: string;
  event_time: string;
  fuel_change_liters: number;
  fuel_change_percent: number;
  location_name?: string | null;
  status?: string | null;
  lat?: number | null;
  lng?: number | null;
}

const FuelEventsTab = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "grid" | "map">("list");
  const [dateRange] = useState<string>("30");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  
  const { fuelEvents, loading, markAsInvestigating, markAsFalsePositive } = useFuelEvents();
  const { vehicles, getVehiclePlate } = useFuelPageContext();
  const { formatFuel } = useOrganizationSettings();

  // Filter by date range, search, and status
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
      
      // Status/Type filter from chips
      if (statusFilter !== "all") {
        if (statusFilter === "pending" || statusFilter === "confirmed") {
          if (event.status !== statusFilter) return false;
        } else {
          if (event.event_type !== statusFilter) return false;
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
  }, [fuelEvents, dateRange, searchQuery, statusFilter, getVehiclePlate]);

  // Calculate counts for status chips
  const statusCounts = useMemo(() => ({
    all: fuelEvents.length,
    refuel: fuelEvents.filter(e => e.event_type === 'refuel').length,
    theft: fuelEvents.filter(e => e.event_type === 'theft').length,
    leak: fuelEvents.filter(e => e.event_type === 'leak').length,
    drain: fuelEvents.filter(e => e.event_type === 'drain').length,
    pending: fuelEvents.filter(e => e.status === 'pending').length,
    confirmed: fuelEvents.filter(e => e.status === 'confirmed').length,
  }), [fuelEvents]);

  const { currentPage, setCurrentPage, startIndex, endIndex } = usePagination(filteredEvents.length, ITEMS_PER_PAGE);
  const paginatedEvents = filteredEvents.slice(startIndex, endIndex);

  // Handle "View on Map" from list view
  const handleViewOnMap = useCallback((event: FuelEvent) => {
    setSelectedEventId(event.id);
    setViewMode("map");
  }, []);

  // Handle event selection in map view
  const handleEventSelect = useCallback((event: FuelEvent) => {
    setSelectedEventId(event.id);
  }, []);

  // Export to CSV - exports all filtered events
  const exportEventsCSV = () => {
    const headers = ["Date/Time", "Vehicle", "Event Type", "Status", "Fuel Change (L)", "Change %", "Location", "Latitude", "Longitude"];
    const rows = filteredEvents.map(e => [
      format(new Date(e.event_time), "yyyy-MM-dd HH:mm"),
      getVehiclePlate(e.vehicle_id),
      e.event_type,
      e.status || "",
      e.fuel_change_liters.toFixed(1),
      e.fuel_change_percent.toFixed(1),
      e.location_name || "",
      e.lat?.toString() || "",
      e.lng?.toString() || ""
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
    return (
      <div className="flex items-center justify-center min-h-[300px]" role="status">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <FuelToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalCount={fuelEvents.length}
        filteredCount={filteredEvents.length}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Status Filter Chips */}
      <FuelStatusChips
        counts={statusCounts}
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
      />

      {/* Export Button */}
      <div className="flex justify-end">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2" onClick={exportEventsCSV}>
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Export all filtered events to CSV</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Events Display */}
      {viewMode === "map" ? (
        <FuelEventsMapView
          events={filteredEvents}
          getVehiclePlate={getVehiclePlate}
          formatFuel={formatFuel}
          selectedEventId={selectedEventId}
          onEventSelect={handleEventSelect}
        />
      ) : viewMode === "list" ? (
        <FuelEventsListView
          events={paginatedEvents}
          getVehiclePlate={getVehiclePlate}
          formatFuel={formatFuel}
          onInvestigate={markAsInvestigating}
          onMarkFalsePositive={markAsFalsePositive}
          onViewOnMap={handleViewOnMap}
        />
      ) : (
        // Grid View - Card-based display
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedEvents.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Droplet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No fuel events found</p>
              </CardContent>
            </Card>
          ) : (
            paginatedEvents.map(event => (
              <Card 
                key={event.id} 
                className={event.event_type === 'theft' || event.event_type === 'drain' ? 'border-destructive/30' : ''}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${
                        event.event_type === 'refuel' ? 'bg-success/10' : 
                        event.event_type === 'theft' || event.event_type === 'drain' ? 'bg-destructive/10' : 
                        'bg-warning/10'
                      }`}>
                        <Droplet className={`w-4 h-4 ${
                          event.event_type === 'refuel' ? 'text-success' : 
                          event.event_type === 'theft' || event.event_type === 'drain' ? 'text-destructive' : 
                          'text-warning'
                        }`} />
                      </div>
                      <span className="font-semibold">{getVehiclePlate(event.vehicle_id)}</span>
                    </div>
                    <span className={`text-lg font-bold ${event.fuel_change_liters > 0 ? 'text-success' : 'text-destructive'}`}>
                      {event.fuel_change_liters > 0 ? '+' : ''}{formatFuel(event.fuel_change_liters)}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(event.event_time), "dd MMM yyyy, HH:mm")}
                  </div>
                  {event.location_name && (
                    <div className="text-sm text-muted-foreground truncate mt-1">
                      {event.location_name}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Pagination - only for list and grid views */}
      {viewMode !== "map" && (
        <TablePagination
          currentPage={currentPage}
          totalItems={filteredEvents.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
};

export default FuelEventsTab;
