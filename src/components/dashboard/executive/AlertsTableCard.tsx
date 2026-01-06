import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Search, Download, BarChart2, MapPin } from "lucide-react";
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

  return (
    <GlowingCard glowColor="destructive" className="lg:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">Alerts</h3>
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
            <tr className="border-b text-muted-foreground">
              <th className="text-left py-2 px-2 font-medium">Status</th>
              <th className="text-left py-2 px-2 font-medium">Alert Type</th>
              <th className="text-left py-2 px-2 font-medium">Start Date</th>
              <th className="text-left py-2 px-2 font-medium">End Date</th>
              <th className="text-left py-2 px-2 font-medium">Duration</th>
              <th className="text-left py-2 px-2 font-medium">Group</th>
              <th className="text-left py-2 px-2 font-medium">Title</th>
              <th className="text-left py-2 px-2 font-medium">Information</th>
            </tr>
          </thead>
          <tbody>
            {alerts.slice(0, 5).map((alert, i) => (
              <motion.tr
                key={alert.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="border-b hover:bg-muted/30 transition-colors"
              >
                <td className="py-2 px-2">
                  <Badge className={`text-xs ${getStatusColor(alert.status)}`}>
                    {alert.status}
                  </Badge>
                </td>
                <td className="py-2 px-2">{alert.alertType}</td>
                <td className="py-2 px-2 text-xs">{format(new Date(alert.startDate), 'MM/dd/yyyy, h:mm a')}</td>
                <td className="py-2 px-2 text-xs">{format(new Date(alert.endDate), 'MM/dd/yyyy, h:mm a')}</td>
                <td className="py-2 px-2">{alert.duration}</td>
                <td className="py-2 px-2">
                  <Badge variant="outline" className="text-xs">{alert.group}</Badge>
                </td>
                <td className="py-2 px-2 max-w-[150px] truncate">{alert.title}</td>
                <td className="py-2 px-2 max-w-[200px] truncate text-muted-foreground">{alert.information}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {alerts.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No active alerts</p>
        </div>
      )}
    </GlowingCard>
  );
};

export default AlertsTableCard;
