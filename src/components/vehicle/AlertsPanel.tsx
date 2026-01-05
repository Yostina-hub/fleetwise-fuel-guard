import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Bell,
  AlertTriangle,
  AlertCircle,
  Info
} from "lucide-react";
import { format, addDays, subDays, isSameDay } from "date-fns";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface DriverEvent {
  id?: string;
  event_type: string;
  event_time: string;
  address?: string | null;
  severity: string;
  speed_kmh?: number | null;
  speed_limit_kmh?: number | null;
}

interface AlertsPanelProps {
  alerts: DriverEvent[];
  isLoading: boolean;
  vehicleId?: string;
}

const AlertsPanel = ({ alerts, isLoading, vehicleId }: AlertsPanelProps) => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Filter alerts for selected date and priority
  const filteredAlerts = alerts
    .filter(alert => {
      const alertDate = new Date(alert.event_time);
      const matchesDate = isSameDay(alertDate, selectedDate);
      const matchesPriority = priorityFilter === "all" || alert.severity === priorityFilter;
      return matchesDate && matchesPriority;
    })
    .sort((a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime());

  const handlePreviousDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
  };

  const handleNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
  };

  const handleGoToAlerts = () => {
    navigate('/alerts', { state: { vehicleId } });
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />;
      case 'medium':
        return <AlertCircle className="h-4 w-4 text-warning" aria-hidden="true" />;
      default:
        return <Info className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
      case 'critical':
        return <Badge variant="destructive">{severity}</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">{severity}</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Date Header with Navigation */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h3 className="text-lg font-semibold">
          {format(selectedDate, "dd MMM yyyy")}
        </h3>
        <div className="flex items-center gap-2">
          {/* Priority Filter */}
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[140px]" aria-label="Filter by priority">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          
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
                onSelect={(date) => date && setSelectedDate(date)}
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

      {/* Alerts List */}
      {filteredAlerts.length > 0 ? (
        <ScrollArea className="flex-1">
          <div className="space-y-3 pr-4">
            {filteredAlerts.map((alert, index) => (
              <Card key={alert.id || index} className="hover:bg-muted/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${
                      alert.severity === 'high' || alert.severity === 'critical' 
                        ? 'bg-destructive/10' 
                        : alert.severity === 'medium' 
                          ? 'bg-warning/10' 
                          : 'bg-muted'
                    }`}>
                      {getSeverityIcon(alert.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium capitalize">
                        {alert.event_type.replace(/_/g, ' ')}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {alert.address || 'Unknown location'}
                      </p>
                      {alert.speed_kmh && alert.speed_limit_kmh && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Speed: {alert.speed_kmh} km/h (limit: {alert.speed_limit_kmh} km/h)
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(alert.event_time), "HH:mm:ss")} • {formatDistanceToNow(new Date(alert.event_time), { addSuffix: true })}
                      </p>
                    </div>
                    {getSeverityBadge(alert.severity)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-12" role="status" aria-live="polite">
          <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" aria-hidden="true" />
          <p className="text-muted-foreground mb-2">
            There are no alerts for {format(selectedDate, "EEEE - dd MMM yyyy")}
          </p>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t flex-wrap">
        <Button onClick={handleGoToAlerts} className="bg-primary hover:bg-primary/90">
          Go to Alerts
        </Button>
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

export default AlertsPanel;
