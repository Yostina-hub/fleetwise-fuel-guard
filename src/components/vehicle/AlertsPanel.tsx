import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  Gauge,
  MapPin,
  Zap
} from "lucide-react";
import { format, addDays, subDays, isSameDay, differenceInDays } from "date-fns";
import { useNavigate } from "react-router-dom";

interface DriverEvent {
  id?: string;
  event_type: string;
  event_time: string;
  address?: string | null;
  severity: string;
  speed_kmh?: number | null;
  speed_limit_kmh?: number | null;
  lat?: number | null;
  lng?: number | null;
}

interface AlertsPanelProps {
  alerts: DriverEvent[];
  isLoading: boolean;
  vehicleId?: string;
}

const AlertsPanel = ({ alerts, isLoading, vehicleId }: AlertsPanelProps) => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  // Find most recent alert date
  const mostRecentAlertDate = useMemo(() => {
    if (alerts.length === 0) return null;
    return new Date(alerts[0].event_time);
  }, [alerts]);

  // Filter alerts for selected date and severity
  const filteredAlerts = useMemo(() => {
    return alerts
      .filter(alert => {
        const alertDate = new Date(alert.event_time);
        const matchesDate = isSameDay(alertDate, selectedDate);
        const matchesSeverity = severityFilter === "all" || alert.severity === severityFilter;
        return matchesDate && matchesSeverity;
      })
      .sort((a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime());
  }, [alerts, selectedDate, severityFilter]);

  // Calculate stats for the day
  const dailyStats = useMemo(() => {
    const high = filteredAlerts.filter(a => a.severity === 'high' || a.severity === 'critical').length;
    const medium = filteredAlerts.filter(a => a.severity === 'medium').length;
    const low = filteredAlerts.filter(a => a.severity === 'low' || a.severity === 'info').length;
    return { high, medium, low, total: filteredAlerts.length };
  }, [filteredAlerts]);

  // Overall stats
  const overallStats = useMemo(() => {
    const total = alerts.length;
    const highSeverity = alerts.filter(a => a.severity === 'high' || a.severity === 'critical').length;
    const daysWithAlerts = new Set(alerts.map(a => format(new Date(a.event_time), 'yyyy-MM-dd'))).size;
    return { total, highSeverity, daysWithAlerts };
  }, [alerts]);

  const handlePreviousDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
  };

  const handleNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
  };

  const handleGoToAlerts = () => {
    navigate('/alerts', { state: { vehicleId } });
  };

  const handleJumpToRecent = () => {
    if (mostRecentAlertDate) {
      setSelectedDate(mostRecentAlertDate);
    }
  };

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'high':
      case 'critical':
        return { 
          icon: AlertTriangle, 
          color: 'text-destructive', 
          bg: 'bg-destructive/10',
          border: 'border-destructive/20'
        };
      case 'medium':
        return { 
          icon: AlertCircle, 
          color: 'text-warning', 
          bg: 'bg-warning/10',
          border: 'border-warning/20'
        };
      default:
        return { 
          icon: Info, 
          color: 'text-muted-foreground', 
          bg: 'bg-muted',
          border: 'border-muted'
        };
    }
  };

  const getEventIcon = (eventType: string) => {
    if (eventType.includes('speed') || eventType.includes('overspeed')) {
      return <Gauge className="h-4 w-4" />;
    }
    if (eventType.includes('geofence') || eventType.includes('zone')) {
      return <MapPin className="h-4 w-4" />;
    }
    if (eventType.includes('acceleration') || eventType.includes('braking')) {
      return <Zap className="h-4 w-4" />;
    }
    return <Bell className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-12 w-full" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Critical</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{dailyStats.high}</p>
          </CardContent>
        </Card>
        <Card className="border-warning/20 bg-warning/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-warning" />
              <span className="text-xs text-muted-foreground">Medium</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{dailyStats.medium}</p>
          </CardContent>
        </Card>
        <Card className="border-muted bg-muted/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Low</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{dailyStats.low}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{dailyStats.total}</p>
          </CardContent>
        </Card>
      </div>

      {/* Date Header with Navigation */}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h3 className="text-lg font-semibold">
          {format(selectedDate, "EEEE, dd MMM yyyy")}
        </h3>
        <div className="flex items-center gap-2">
          {/* Severity Filter */}
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[130px]" aria-label="Filter by severity">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2" aria-label="Select date">
                <CalendarIcon className="h-4 w-4" />
                {format(selectedDate, "dd MMM")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          {/* Day Navigation */}
          <Button 
            variant="outline" 
            size="icon"
            onClick={handlePreviousDay}
            aria-label="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleNextDay}
            aria-label="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Alerts List */}
      <AnimatePresence mode="wait">
        {filteredAlerts.length > 0 ? (
          <ScrollArea className="flex-1 pr-2">
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {filteredAlerts.map((alert, index) => {
                const config = getSeverityConfig(alert.severity);
                const IconComponent = config.icon;
                
                return (
                  <motion.div
                    key={alert.id || index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Card className={`${config.bg} ${config.border} hover:shadow-sm transition-shadow`}>
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-full ${config.bg}`}>
                            <IconComponent className={`h-4 w-4 ${config.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-foreground capitalize">
                                {alert.event_type.replace(/_/g, ' ')}
                              </span>
                              <Badge variant="outline" className="text-xs capitalize">
                                {alert.severity}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span>{format(new Date(alert.event_time), "HH:mm:ss")}</span>
                              {alert.speed_kmh && (
                                <span className="flex items-center gap-1">
                                  <Gauge className="h-3 w-3" />
                                  {alert.speed_kmh} km/h
                                  {alert.speed_limit_kmh && (
                                    <span className="text-destructive">
                                      (limit: {alert.speed_limit_kmh})
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                            
                            {alert.address && (
                              <p className="text-sm text-muted-foreground mt-1 truncate">
                                <MapPin className="h-3 w-3 inline mr-1" />
                                {alert.address}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          </ScrollArea>
        ) : (
          <motion.div 
            className="flex-1 flex flex-col items-center justify-center py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            role="status" 
            aria-live="polite"
          >
            <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" aria-hidden="true" />
            <p className="text-muted-foreground font-medium mb-1">
              No alerts for this date
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {overallStats.total > 0 
                ? `${overallStats.total} total alerts over ${overallStats.daysWithAlerts} days`
                : "No alert history found"}
            </p>
            {mostRecentAlertDate && differenceInDays(selectedDate, mostRecentAlertDate) !== 0 && (
              <Button variant="outline" size="sm" onClick={handleJumpToRecent} className="gap-2">
                <Bell className="h-4 w-4" />
                Jump to {format(mostRecentAlertDate, "dd MMM")}
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <div className="flex items-center justify-between pt-4 mt-4 border-t gap-2 flex-wrap">
        <div className="text-sm text-muted-foreground">
          {overallStats.total} alerts • {overallStats.highSeverity} critical
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleGoToAlerts} className="gap-2">
            <Bell className="h-4 w-4" />
            All Alerts
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={handlePreviousDay}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleNextDay}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AlertsPanel;