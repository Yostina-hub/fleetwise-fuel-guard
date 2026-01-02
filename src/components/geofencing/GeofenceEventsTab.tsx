import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LogIn, LogOut, Clock, Search, Filter, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";

const GeofenceEventsTab = () => {
  const { organizationId } = useOrganization();
  const [searchTerm, setSearchTerm] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");

  const { data: events, isLoading, refetch } = useQuery({
    queryKey: ["geofence-events", organizationId, eventTypeFilter],
    queryFn: async () => {
      let query = supabase
        .from("geofence_events")
        .select(`
          *,
          geofence:geofences(name, category),
          vehicle:vehicles(plate_number, make, model)
        `)
        .eq("organization_id", organizationId!)
        .order("event_time", { ascending: false })
        .limit(100);

      if (eventTypeFilter !== "all") {
        query = query.eq("event_type", eventTypeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const filteredEvents = events?.filter((event: any) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      event.geofence?.name?.toLowerCase().includes(searchLower) ||
      event.vehicle?.plate_number?.toLowerCase().includes(searchLower)
    );
  });

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "entry":
        return <LogIn className="h-4 w-4 text-green-500" aria-hidden="true" />;
      case "exit":
        return <LogOut className="h-4 w-4 text-orange-500" aria-hidden="true" />;
      case "dwell":
        return <Clock className="h-4 w-4 text-blue-500" aria-hidden="true" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
    }
  };

  const getEventBadge = (eventType: string) => {
    switch (eventType) {
      case "entry":
        return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Entry</Badge>;
      case "exit":
        return <Badge className="bg-orange-500/10 text-orange-500 hover:bg-orange-500/20">Exit</Badge>;
      case "dwell":
        return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">Dwell</Badge>;
      default:
        return <Badge variant="secondary">{eventType}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8" role="status" aria-live="polite" aria-label="Loading geofence events">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Geofence Events</CardTitle>
            <Button variant="outline" size="sm" onClick={() => refetch()} aria-label="Refresh events">
              <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="Search by geofence or vehicle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                aria-label="Search geofence events"
              />
            </div>
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger className="w-[150px]" aria-label="Filter by event type">
                <Filter className="h-4 w-4 mr-2" aria-hidden="true" />
                <SelectValue placeholder="Event type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="entry">Entry</SelectItem>
                <SelectItem value="exit">Exit</SelectItem>
                <SelectItem value="dwell">Dwell</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Events Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Type</TableHead>
                  <TableHead>Geofence</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Speed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents && filteredEvents.length > 0 ? (
                  filteredEvents.map((event: any) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getEventIcon(event.event_type)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{event.geofence?.name || "Unknown"}</div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {event.geofence?.category?.replace("_", " ") || "-"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{event.vehicle?.plate_number || "Unknown"}</div>
                          <div className="text-xs text-muted-foreground">
                            {event.vehicle?.make} {event.vehicle?.model}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(event.event_time), "MMM d, yyyy")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(event.event_time), "HH:mm:ss")}
                        </div>
                      </TableCell>
                      <TableCell>
                        {event.dwell_time_seconds ? (
                          <span className="text-sm">
                            {Math.floor(event.dwell_time_seconds / 60)}m {event.dwell_time_seconds % 60}s
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {event.speed_at_event ? (
                          <span className="text-sm">{event.speed_at_event} km/h</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div role="status" aria-label="No geofence events found">
                        <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" aria-hidden="true" />
                        <p className="text-sm text-muted-foreground">No geofence events recorded yet</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Events will appear here when vehicles enter or exit geofences
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GeofenceEventsTab;
