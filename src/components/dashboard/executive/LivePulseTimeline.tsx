import { motion, AnimatePresence } from "framer-motion";
import { Activity, MapPin, Fuel, AlertTriangle, Clock, Truck, Route } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TimelineEvent {
  id: string;
  type: 'trip' | 'alert' | 'fuel' | 'geofence' | 'vehicle';
  title: string;
  description: string;
  timestamp: Date;
  severity?: 'info' | 'warning' | 'critical';
  vehicleId?: string;
  vehiclePlate?: string;
}

interface LivePulseTimelineProps {
  events: TimelineEvent[];
  loading?: boolean;
}

const typeConfig = {
  trip: {
    icon: Route,
    color: 'bg-secondary/20 text-secondary border-secondary/30',
    pulse: 'bg-secondary',
  },
  alert: {
    icon: AlertTriangle,
    color: 'bg-warning/20 text-warning border-warning/30',
    pulse: 'bg-warning',
  },
  fuel: {
    icon: Fuel,
    color: 'bg-primary/20 text-primary border-primary/30',
    pulse: 'bg-primary',
  },
  geofence: {
    icon: MapPin,
    color: 'bg-success/20 text-success border-success/30',
    pulse: 'bg-success',
  },
  vehicle: {
    icon: Truck,
    color: 'bg-chart-2/20 text-chart-2 border-chart-2/30',
    pulse: 'bg-chart-2',
  },
};

const LivePulseTimeline = ({ events, loading }: LivePulseTimelineProps) => {
  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl bg-gradient-to-br from-card to-card/80 border border-border/50 p-6 h-96"
      >
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted/30 rounded w-1/3" />
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-muted/30" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted/30 rounded w-2/3" />
                <div className="h-3 bg-muted/20 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl bg-gradient-to-br from-card via-card/95 to-card/90 border border-border/50 overflow-hidden"
    >
      {/* Animated top border */}
      <motion.div 
        className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <motion.div 
              className="w-2 h-2 rounded-full bg-primary"
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <h3 className="text-lg font-semibold text-white">Live Activity Pulse</h3>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
            <Activity className="w-3 h-3 mr-1" />
            {events.length} Events
          </Badge>
        </div>

        <ScrollArea className="h-80 pr-4">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-transparent" />

            <AnimatePresence mode="popLayout">
              {events.map((event, index) => {
                const config = typeConfig[event.type];
                const Icon = config.icon;
                
                return (
                  <motion.div
                    key={event.id}
                    layout
                    initial={{ opacity: 0, x: -20, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 20, scale: 0.9 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="relative flex gap-4 pb-4 group"
                  >
                    {/* Icon with pulse */}
                    <div className="relative z-10">
                      <motion.div 
                        className={`w-10 h-10 rounded-xl ${config.color} border flex items-center justify-center`}
                        whileHover={{ scale: 1.1 }}
                      >
                        <Icon className="w-5 h-5" />
                      </motion.div>
                      {index === 0 && (
                        <motion.div 
                          className={`absolute -inset-1 rounded-xl ${config.pulse} opacity-30`}
                          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-medium text-white text-sm truncate">{event.title}</p>
                        <span className="text-xs text-white/70 whitespace-nowrap flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(event.timestamp, 'HH:mm')}
                        </span>
                      </div>
                      <p className="text-xs text-white/70 line-clamp-2">{event.description}</p>
                      {event.vehiclePlate && (
                        <Badge variant="outline" className="mt-1 text-xs bg-background/50">
                          <Truck className="w-3 h-3 mr-1" />
                          {event.vehiclePlate}
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </div>
    </motion.div>
  );
};

export default LivePulseTimeline;
