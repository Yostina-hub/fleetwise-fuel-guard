import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, AlertCircle, Info, CheckCircle, ChevronRight, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface Alert {
  id: string;
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info' | 'resolved';
  timestamp: Date;
  vehiclePlate?: string;
}

interface AlertHeatStripProps {
  alerts: Alert[];
  loading?: boolean;
  onViewAll?: () => void;
}

const severityConfig = {
  critical: {
    icon: AlertTriangle,
    bg: 'bg-gradient-to-r from-destructive/20 via-destructive/10 to-transparent',
    border: 'border-destructive/50',
    text: 'text-destructive',
    badge: 'bg-destructive text-destructive-foreground',
  },
  warning: {
    icon: AlertCircle,
    bg: 'bg-gradient-to-r from-warning/20 via-warning/10 to-transparent',
    border: 'border-warning/50',
    text: 'text-warning',
    badge: 'bg-warning text-warning-foreground',
  },
  info: {
    icon: Info,
    bg: 'bg-gradient-to-r from-secondary/20 via-secondary/10 to-transparent',
    border: 'border-secondary/50',
    text: 'text-secondary',
    badge: 'bg-secondary text-secondary-foreground',
  },
  resolved: {
    icon: CheckCircle,
    bg: 'bg-gradient-to-r from-success/20 via-success/10 to-transparent',
    border: 'border-success/50',
    text: 'text-success',
    badge: 'bg-success text-success-foreground',
  },
};

const AlertHeatStrip = ({ alerts, loading, onViewAll }: AlertHeatStripProps) => {
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl bg-gradient-to-br from-card to-card/80 border border-border/50 p-6"
      >
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-muted/30 rounded w-1/3" />
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-muted/20 rounded-xl" />
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
      {/* Pulsing top bar for critical alerts */}
      {criticalCount > 0 && (
        <motion.div 
          className="absolute top-0 left-0 right-0 h-1 bg-destructive"
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}

      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.div 
              className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center"
              animate={criticalCount > 0 ? { scale: [1, 1.1, 1] } : undefined}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <Bell className="w-5 h-5 text-warning" />
            </motion.div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Alert Center</h3>
              <p className="text-sm text-muted-foreground">
                {criticalCount > 0 ? `${criticalCount} critical needs attention` : 'All systems operational'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <Badge className="bg-destructive text-destructive-foreground animate-pulse">
                {criticalCount} Critical
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge className="bg-warning text-warning-foreground">
                {warningCount} Warning
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-2 mb-4 max-h-64 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="popLayout">
            {alerts.slice(0, 5).map((alert, index) => {
              const config = severityConfig[alert.severity];
              const Icon = config.icon;
              
              return (
                <motion.div
                  key={alert.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className={`
                    relative flex items-center gap-3 p-3 rounded-xl 
                    ${config.bg} border ${config.border}
                    hover:scale-[1.01] transition-transform cursor-pointer
                  `}
                >
                  <div className={`p-2 rounded-lg bg-background/50`}>
                    <Icon className={`w-5 h-5 ${config.text}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-medium text-foreground text-sm truncate">{alert.title}</p>
                      {alert.vehiclePlate && (
                        <Badge variant="outline" className="text-xs">{alert.vehiclePlate}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{alert.message}</p>
                  </div>
                  
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(alert.timestamp, 'HH:mm')}
                  </span>
                  
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {alerts.length > 5 && (
          <Button 
            variant="outline" 
            className="w-full gap-2 bg-background/50 hover:bg-background"
            onClick={onViewAll}
          >
            View All {alerts.length} Alerts
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </motion.div>
  );
};

export default AlertHeatStrip;
