import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Radio, MapPin, Truck, AlertTriangle, Route, Fuel, Wrench, Activity,
  ArrowRight, Clock
} from "lucide-react";
import { FleetActivity, GeofenceActivity } from "@/hooks/useExecutiveMetrics";
import { formatDistanceToNow } from "date-fns";

interface LiveActivityTimelineProps {
  activities: FleetActivity[];
  geofenceActivities: GeofenceActivity[];
  loading?: boolean;
}

const LiveActivityTimeline = ({ activities, geofenceActivities, loading }: LiveActivityTimelineProps) => {
  const getActivityIcon = (type: FleetActivity['type']) => {
    const iconClass = "w-4 h-4";
    switch (type) {
      case 'trip_start': return <Route className={`${iconClass} text-primary`} />;
      case 'trip_end': return <Route className={`${iconClass} text-success`} />;
      case 'alert': return <AlertTriangle className={`${iconClass} text-warning`} />;
      case 'maintenance': return <Wrench className={`${iconClass} text-orange-500`} />;
      case 'geofence': return <MapPin className={`${iconClass} text-purple-500`} />;
      case 'fuel': return <Fuel className={`${iconClass} text-blue-500`} />;
      default: return <Activity className={iconClass} />;
    }
  };

  const getSeverityStyles = (severity?: 'info' | 'warning' | 'critical') => {
    switch (severity) {
      case 'critical': return 'border-destructive/50 bg-destructive/5';
      case 'warning': return 'border-warning/50 bg-warning/5';
      default: return 'border-primary/20 bg-primary/5';
    }
  };

  // Combine and sort all activities
  const allActivities = [
    ...geofenceActivities.slice(0, 5).map(g => ({
      id: `geo-${g.id}`,
      type: 'geofence' as const,
      message: `${g.vehiclePlate} ${g.eventType === 'entry' ? 'entered' : 'exited'} ${g.geofenceName}`,
      timestamp: g.timestamp,
      severity: 'info' as const,
      vehiclePlate: g.vehiclePlate,
      driverName: g.driverName,
      eventType: g.eventType,
    })),
    ...activities.slice(0, 10),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 12);

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
    <Card className="glass-strong h-full overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Radio className="w-5 h-5 text-success" />
            </motion.div>
            Live Activity
          </CardTitle>
          <Badge variant="outline" className="gap-1.5">
            <motion.span 
              className="w-2 h-2 bg-success rounded-full"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            Real-time
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[420px]">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-gradient-to-b from-primary/50 via-primary/20 to-transparent" />
            
            <AnimatePresence>
              <div className="space-y-4 pl-2">
                {allActivities.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative flex gap-3"
                  >
                    {/* Timeline dot */}
                    <div className="relative z-10 flex items-center justify-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.05 + 0.2 }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          activity.severity === 'critical' ? 'bg-destructive/20' :
                          activity.severity === 'warning' ? 'bg-warning/20' :
                          'bg-primary/20'
                        }`}
                      >
                        {getActivityIcon(activity.type)}
                      </motion.div>
                    </div>

                    {/* Content */}
                    <div className={`flex-1 p-3 rounded-lg border ${getSeverityStyles(activity.severity)}`}>
                      <p className="text-sm leading-relaxed">{activity.message}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {activity.vehiclePlate && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Truck className="w-3 h-3" />
                            {activity.vehiclePlate}
                          </Badge>
                        )}
                        {activity.driverName && (
                          <span className="text-xs text-muted-foreground">
                            {activity.driverName}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>

            {allActivities.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Activity className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-sm">No recent activity</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default LiveActivityTimeline;
