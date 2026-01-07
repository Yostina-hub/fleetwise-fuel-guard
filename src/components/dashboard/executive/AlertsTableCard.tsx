import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Search, Download, BarChart2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import GlowingCard from "./GlowingCard";
import { format } from "date-fns";

interface Alert {
  id: string;
  status: 'active' | 'resolved' | 'acknowledged';
  alertType: string;
  startDate: string;
  endDate: string;
  duration: string;
  group: string;
  title: string;
  information: string;
  lat?: number;
  lng?: number;
}

interface AlertsTableCardProps {
  alerts: Alert[];
  loading?: boolean;
}

const AlertsTableCard = ({ alerts, loading }: AlertsTableCardProps) => {
  if (loading) {
    return (
      <GlowingCard className="lg:col-span-2" glowColor="destructive">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </div>
      </GlowingCard>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-destructive text-destructive-foreground';
      case 'acknowledged': return 'bg-warning text-warning-foreground';
      case 'resolved': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const activeAlerts = alerts.filter(a => a.status === 'active').length;

  return (
    <GlowingCard glowColor="destructive" className="lg:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg">Alerts</h3>
          {activeAlerts > 0 && (
            <Badge variant="destructive" className="text-xs animate-pulse">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {activeAlerts} Active
            </Badge>
          )}
          <Badge variant="outline" className="text-xs bg-red-500/20 text-red-400 border-red-500/50">
            <motion.span
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-flex items-center gap-1"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              Live
            </motion.span>
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <BarChart2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/20 text-white/80">
              <th className="text-left py-2 px-2 font-semibold">Status</th>
              <th className="text-left py-2 px-2 font-semibold">Alert Type</th>
              <th className="text-left py-2 px-2 font-semibold">Time</th>
              <th className="text-left py-2 px-2 font-semibold">Title</th>
              <th className="text-left py-2 px-2 font-semibold">Details</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {alerts.slice(0, 5).map((alert, i) => (
                <motion.tr
                  key={alert.id}
                  initial={{ opacity: 0, y: -10, backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
                  animate={{ opacity: 1, y: 0, backgroundColor: 'transparent' }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className="border-b hover:bg-muted/30 transition-colors"
                >
                  <td className="py-2 px-2">
                    <motion.div
                      animate={alert.status === 'active' ? { scale: [1, 1.05, 1] } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Badge className={`text-xs ${getStatusColor(alert.status)}`}>
                        {alert.status}
                      </Badge>
                    </motion.div>
                  </td>
                  <td className="py-2 px-2 text-white/90">{alert.alertType}</td>
                  <td className="py-2 px-2 text-xs text-white/80">{format(new Date(alert.startDate), 'MM/dd, h:mm a')}</td>
                  <td className="py-2 px-2 max-w-[150px] truncate text-white/90">{alert.title}</td>
                  <td className="py-2 px-2 max-w-[200px] truncate text-white/70">{alert.information}</td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {alerts.length === 0 && (
        <motion.div 
          className="text-center py-8 text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p>No active alerts - Fleet running smoothly ✓</p>
        </motion.div>
      )}
    </GlowingCard>
  );
};

export default AlertsTableCard;
