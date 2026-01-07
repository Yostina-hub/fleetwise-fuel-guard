import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Truck, AlertTriangle, MapPin, Fuel, Wrench, Route, Radio } from "lucide-react";
import { FleetActivity, GeofenceActivity } from "@/hooks/useExecutiveMetrics";
import { formatDistanceToNow } from "date-fns";

interface LiveActivityFeedProps {
  activities: FleetActivity[];
  geofenceActivities: GeofenceActivity[];
  loading?: boolean;
}

const LiveActivityFeed = ({ activities, geofenceActivities, loading }: LiveActivityFeedProps) => {
  const getActivityIcon = (type: FleetActivity['type']) => {
    switch (type) {
      case 'trip_start': return <Route className="w-4 h-4 text-primary" />;
      case 'trip_end': return <Route className="w-4 h-4 text-success" />;
      case 'alert': return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'maintenance': return <Wrench className="w-4 h-4 text-orange-500" />;
      case 'geofence': return <MapPin className="w-4 h-4 text-purple-500" />;
      case 'fuel': return <Fuel className="w-4 h-4 text-blue-500" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity?: 'info' | 'warning' | 'critical') => {
    switch (severity) {
      case 'critical': return 'border-l-destructive bg-destructive/5';
      case 'warning': return 'border-l-warning bg-warning/5';
      default: return 'border-l-primary bg-muted/30';
    }
  };

  if (loading) {
    return (
      <Card className="glass-strong h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-success animate-pulse" />
            Live Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-strong h-full w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-success animate-pulse" />
            Live Activity
          </CardTitle>
          <Badge variant="outline" className="text-xs gap-1">
            <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
            Real-time
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="w-full">
        <ScrollArea className="h-[400px] w-full">
          <div className="space-y-2 pr-2 w-full">
            {/* Geofence Activities Section */}
            {geofenceActivities.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-medium text-muted-foreground uppercase">Geofence Events</span>
                </div>
                <div className="space-y-2">
                  {geofenceActivities.slice(0, 5).map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-3 p-2 rounded-lg border-l-4 border-l-purple-500 bg-purple-500/5"
                    >
                      <div className={`p-1.5 rounded-full ${
                        event.eventType === 'entry' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                      }`}>
                        <MapPin className="w-3 h-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            <Truck className="w-3 h-3 mr-1" />
                            {event.vehiclePlate}
                          </Badge>
                          <span className="text-xs">
                            {event.eventType === 'entry' ? 'entered' : 'exited'}
                          </span>
                          <span className="text-xs font-medium">{event.geofenceName}</span>
                        </div>
                        {event.driverName && (
                          <span className="text-xs text-muted-foreground">{event.driverName}</span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* General Activities */}
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground uppercase">Fleet Activity</span>
            </div>
            {activities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No recent activity
              </div>
            ) : (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border-l-4 transition-all hover:shadow-sm ${getSeverityColor(activity.severity)}`}
                >
                  <div className="p-1.5 rounded-full bg-muted/50">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{activity.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {activity.vehiclePlate && (
                        <Badge variant="outline" className="text-xs">
                          <Truck className="w-3 h-3 mr-1" />
                          {activity.vehiclePlate}
                        </Badge>
                      )}
                      {activity.driverName && (
                        <span className="text-xs text-muted-foreground">{activity.driverName}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default LiveActivityFeed;
