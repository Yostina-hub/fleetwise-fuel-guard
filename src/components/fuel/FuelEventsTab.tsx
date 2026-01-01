import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Droplet, TrendingDown, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useFuelEvents } from "@/hooks/useFuelEvents";
import { useFuelPageContext } from "@/pages/FuelMonitoring";
import { format } from "date-fns";

const FuelEventsTab = () => {
  const { fuelEvents, loading } = useFuelEvents();
  const { getVehiclePlate } = useFuelPageContext();

  const getEventTypeBadge = (type: string) => {
    switch (type) {
      case 'refuel':
        return <Badge className="bg-success/10 text-success border-success/20">Refuel</Badge>;
      case 'theft':
        return <Badge variant="destructive">Theft</Badge>;
      case 'leak':
        return <Badge className="bg-warning/10 text-warning border-warning/20">Leak</Badge>;
      case 'drain':
        return <Badge className="bg-destructive/20 text-destructive">Drain</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-success/10 text-success border-success/20"><CheckCircle className="w-3 h-3 mr-1" />Confirmed</Badge>;
      case 'pending':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'investigating':
        return <Badge className="bg-warning/10 text-warning border-warning/20">Investigating</Badge>;
      case 'false_positive':
        return <Badge variant="secondary">False Positive</Badge>;
      default:
        return null;
    }
  };

  // Group events by date
  const groupedEvents = useMemo(() => {
    const groups: Record<string, typeof fuelEvents> = {};
    fuelEvents.forEach(event => {
      const date = format(new Date(event.event_time), "yyyy-MM-dd");
      if (!groups[date]) groups[date] = [];
      groups[date].push(event);
    });
    return groups;
  }, [fuelEvents]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Droplet className="w-5 h-5 text-success" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {fuelEvents.filter(e => e.event_type === 'refuel').length}
                </div>
                <div className="text-sm text-muted-foreground">Refuel Events</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {fuelEvents.filter(e => e.event_type === 'theft' || e.event_type === 'drain').length}
                </div>
                <div className="text-sm text-muted-foreground">Theft/Drain</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <TrendingDown className="w-5 h-5 text-warning" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {fuelEvents.filter(e => e.event_type === 'leak').length}
                </div>
                <div className="text-sm text-muted-foreground">Leak Events</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {fuelEvents.filter(e => e.status === 'pending').length}
                </div>
                <div className="text-sm text-muted-foreground">Pending Review</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events Timeline */}
      {Object.keys(groupedEvents).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Droplet className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No fuel events recorded yet</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedEvents).map(([date, events]) => (
          <div key={date}>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              {format(new Date(date), "EEEE, MMMM d, yyyy")}
            </h3>
            <div className="space-y-3">
              {events.map(event => (
                <Card key={event.id} className={
                  event.event_type === 'theft' || event.event_type === 'drain' 
                    ? 'border-destructive/30' 
                    : ''
                }>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg ${
                          event.event_type === 'refuel' ? 'bg-success/10' :
                          event.event_type === 'theft' || event.event_type === 'drain' ? 'bg-destructive/10' :
                          'bg-warning/10'
                        }`}>
                          <Droplet className={`w-5 h-5 ${
                            event.event_type === 'refuel' ? 'text-success' :
                            event.event_type === 'theft' || event.event_type === 'drain' ? 'text-destructive' :
                            'text-warning'
                          }`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{getVehiclePlate(event.vehicle_id)}</span>
                            {getEventTypeBadge(event.event_type)}
                            {getStatusBadge(event.status)}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {format(new Date(event.event_time), "HH:mm")}
                            {event.location_name && ` • ${event.location_name}`}
                          </div>
                          {event.confidence_score && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Confidence: {Math.round(event.confidence_score * 100)}%
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${
                          event.fuel_change_liters > 0 ? 'text-success' : 'text-destructive'
                        }`}>
                          {event.fuel_change_liters > 0 ? '+' : ''}{event.fuel_change_liters.toFixed(1)}L
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {event.fuel_change_percent > 0 ? '+' : ''}{event.fuel_change_percent.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    
                    {(event.event_type === 'theft' || event.event_type === 'drain') && event.status === 'pending' && (
                      <div className="flex gap-2 mt-4 pt-3 border-t border-border">
                        <Button size="sm" variant="default">Investigate</Button>
                        <Button size="sm" variant="outline">Mark False Positive</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default FuelEventsTab;
