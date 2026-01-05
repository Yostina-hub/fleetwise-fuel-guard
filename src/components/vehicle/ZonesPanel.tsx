import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  MapPin,
  Search
} from "lucide-react";
import { format, addDays, subDays, isSameDay } from "date-fns";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface GeofenceEvent {
  id: string;
  event_time: string;
  event_type: string;
  dwell_time_minutes: number | null;
  geofence: {
    name: string;
    category: string | null;
  } | null;
}

interface ZonesPanelProps {
  vehicleId: string;
}

const ZonesPanel = ({ vehicleId }: ZonesPanelProps) => {
  const navigate = useNavigate();
  const { organizationId } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [compactMode, setCompactMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Fetch geofence events for this vehicle
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['vehicle-geofence-events', vehicleId, organizationId],
    queryFn: async () => {
      if (!vehicleId || !organizationId) return [];
      
      const { data, error } = await supabase
        .from('geofence_events')
        .select(`
          id,
          event_time,
          event_type,
          dwell_time_minutes,
          geofence:geofences(name, category)
        `)
        .eq('vehicle_id', vehicleId)
        .eq('organization_id', organizationId)
        .order('event_time', { ascending: false })
        .limit(500);
      
      if (error) throw error;
      return (data || []) as unknown as GeofenceEvent[];
    },
    enabled: !!vehicleId && !!organizationId
  });

  // Filter events by date and search
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const eventDate = new Date(event.event_time);
      const matchesDate = isSameDay(eventDate, selectedDate);
      const zoneName = event.geofence?.name || '';
      const matchesSearch = searchQuery === '' || 
        zoneName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDate && matchesSearch;
    });
  }, [events, selectedDate, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredEvents.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedEvents = filteredEvents.slice(startIndex, startIndex + rowsPerPage);

  const handlePreviousDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
    setCurrentPage(1);
  };

  const handleNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
    setCurrentPage(1);
  };

  const handleGoToGeofencing = () => {
    navigate('/geofencing');
  };

  const getActivityBadge = (eventType: string) => {
    const isEntry = eventType.toLowerCase() === 'enter' || eventType.toLowerCase() === 'entry';
    return (
      <Badge 
        variant="outline" 
        className={isEntry 
          ? 'border-green-500 text-green-600 bg-green-50' 
          : 'border-red-500 text-red-600 bg-red-50'
        }
      >
        {isEntry ? 'Enter' : 'Exit'}
      </Badge>
    );
  };

  const getZoneTypeBadge = (category: string | null) => {
    const type = category || 'Location';
    return (
      <Badge variant="outline" className="border-primary text-primary bg-primary/5">
        {type}
      </Badge>
    );
  };

  const formatDwellTime = (minutes: number | null) => {
    if (!minutes) return '-';
    const hrs = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Date Header with Navigation */}
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <h3 className="text-lg font-semibold">
          {format(selectedDate, "dd MMM yyyy")}
        </h3>
        <div className="flex items-center gap-2">
          {/* Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2" aria-label="Select date">
                {format(selectedDate, "dd MMM yyyy")}
                <CalendarIcon className="h-4 w-4" aria-hidden="true" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    setCurrentPage(1);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          {/* Day Navigation */}
          <Button 
            variant="default" 
            size="icon"
            onClick={handlePreviousDay}
            className="bg-primary hover:bg-primary/90"
            aria-label="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="secondary" 
            size="icon"
            onClick={handleNextDay}
            aria-label="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="pl-10"
          aria-label="Search zones"
        />
      </div>

      {/* Events Table */}
      {filteredEvents.length > 0 ? (
        <div className="flex-1 overflow-auto">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Date</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Zone Type</TableHead>
                  <TableHead>Time in Zone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEvents.map((event) => (
                  <TableRow key={event.id} className={compactMode ? 'h-10' : ''}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{format(new Date(event.event_time), "hh:mm a")}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(event.event_time), "dd MMM yyyy")}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getActivityBadge(event.event_type)}</TableCell>
                    <TableCell className="font-medium">{event.geofence?.name || 'Unknown'}</TableCell>
                    <TableCell>{getZoneTypeBadge(event.geofence?.category)}</TableCell>
                    <TableCell>{formatDwellTime(event.dwell_time_minutes)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination Footer */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Switch 
                id="compact-mode" 
                checked={compactMode} 
                onCheckedChange={setCompactMode}
              />
              <Label htmlFor="compact-mode" className="text-sm">Compact</Label>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rows per page</span>
                <Select 
                  value={rowsPerPage.toString()} 
                  onValueChange={(v) => {
                    setRowsPerPage(Number(v));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-16 h-8" aria-label="Rows per page">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <span className="text-sm text-muted-foreground">
                {startIndex + 1}–{Math.min(startIndex + rowsPerPage, filteredEvents.length)} of {filteredEvents.length}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-12" role="status" aria-live="polite">
          <MapPin className="h-12 w-12 text-muted-foreground/50 mb-4" aria-hidden="true" />
          <p className="text-muted-foreground mb-2">
            No zone events for {format(selectedDate, "EEEE - dd MMM yyyy")}
          </p>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t flex-wrap">
        <Button 
          variant="default" 
          onClick={handlePreviousDay}
          className="gap-2 bg-primary hover:bg-primary/90"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Previous Day
        </Button>
        <Button 
          variant="secondary"
          onClick={handleNextDay}
          className="gap-2"
        >
          Next Day
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
};

export default ZonesPanel;
