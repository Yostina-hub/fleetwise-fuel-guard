import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Navigation, 
  Route,
  Clock,
  Gauge,
  Fuel,
  Play,
  MapPin
} from "lucide-react";
import { format, addDays, subDays, isSameDay, differenceInDays } from "date-fns";
import { useNavigate } from "react-router-dom";

interface LocationData {
  lat?: number;
  lng?: number;
}

interface Trip {
  id?: string;
  start_time: string;
  end_time?: string | null;
  start_location?: string | LocationData | null;
  end_location?: string | LocationData | null;
  distance_km?: number | null;
  duration_minutes?: number | null;
  status?: string | null;
  max_speed_kmh?: number | null;
  avg_speed_kmh?: number | null;
  fuel_consumed_liters?: number | null;
}

// Helper to format location - handles both string and {lat, lng} object
const formatLocation = (location: string | LocationData | null | undefined, fallback: string): string => {
  if (!location) return fallback;
  if (typeof location === 'string') return location;
  if (typeof location === 'object' && 'lat' in location && 'lng' in location) {
    return `${Number(location.lat).toFixed(4)}°, ${Number(location.lng).toFixed(4)}°`;
  }
  return fallback;
};

interface TripTimelineProps {
  trips: Trip[];
  isLoading: boolean;
  vehicleId?: string;
}

const TripTimeline = ({ trips, isLoading, vehicleId }: TripTimelineProps) => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Find the most recent trip date if no trips today
  const mostRecentTripDate = useMemo(() => {
    if (trips.length === 0) return null;
    return new Date(trips[0].start_time);
  }, [trips]);

  // Filter trips for selected date and sort by time descending (newest first)
  const filteredTrips = useMemo(() => {
    return trips
      .filter(trip => {
        const tripDate = new Date(trip.start_time);
        return isSameDay(tripDate, selectedDate);
      })
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
  }, [trips, selectedDate]);

  // Calculate daily stats
  const dailyStats = useMemo(() => {
    const totalDistance = filteredTrips.reduce((sum, t) => sum + (t.distance_km || 0), 0);
    const totalDuration = filteredTrips.reduce((sum, t) => sum + (t.duration_minutes || 0), 0);
    const avgSpeed = filteredTrips.length > 0 
      ? filteredTrips.reduce((sum, t) => sum + (t.avg_speed_kmh || 0), 0) / filteredTrips.length 
      : 0;
    const totalFuel = filteredTrips.reduce((sum, t) => sum + (t.fuel_consumed_liters || 0), 0);
    
    return { totalDistance, totalDuration, avgSpeed, totalFuel, tripCount: filteredTrips.length };
  }, [filteredTrips]);

  // Overall stats (all trips)
  const overallStats = useMemo(() => {
    const totalTrips = trips.length;
    const totalDistance = trips.reduce((sum, t) => sum + (t.distance_km || 0), 0);
    const daysWithTrips = new Set(trips.map(t => format(new Date(t.start_time), 'yyyy-MM-dd'))).size;
    return { totalTrips, totalDistance, daysWithTrips };
  }, [trips]);

  const handlePreviousDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
  };

  const handleNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
  };

  const handleGoToTrips = () => {
    navigate('/routes', { state: { vehicleId } });
  };

  const handleJumpToRecent = () => {
    if (mostRecentTripDate) {
      setSelectedDate(mostRecentTripDate);
    }
  };

  const formatDuration = (minutes: number | null | undefined) => {
    if (!minutes) return "0m";
    const hrs = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), "HH:mm");
  };

  // Get status color
  const getStatusBadge = (status?: string | null) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-success/10 text-success border-success/20">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-warning/10 text-warning border-warning/20">In Progress</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-12 w-full" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Quick Stats Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Route className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Today&apos;s Trips</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{dailyStats.tripCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-success/5 border-success/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4 text-success" />
              <span className="text-xs text-muted-foreground">Distance</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{dailyStats.totalDistance.toFixed(1)} km</p>
          </CardContent>
        </Card>
        <Card className="bg-warning/5 border-warning/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning" />
              <span className="text-xs text-muted-foreground">Drive Time</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{formatDuration(dailyStats.totalDuration)}</p>
          </CardContent>
        </Card>
        <Card className="bg-secondary border-secondary">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Avg Speed</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{dailyStats.avgSpeed.toFixed(0)} km/h</p>
          </CardContent>
        </Card>
      </div>

      {/* Date Header with Navigation */}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h3 className="text-lg font-semibold">
          {format(selectedDate, "EEEE, dd MMM yyyy")}
        </h3>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
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

      {/* Trip List */}
      <AnimatePresence mode="wait">
        {filteredTrips.length > 0 ? (
          <ScrollArea className="flex-1 pr-2">
            <motion.div 
              className="space-y-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {filteredTrips.map((trip, index) => (
                <motion.div
                  key={trip.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        {/* Left: Time and locations */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-semibold">{formatTime(trip.start_time)}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className="text-lg font-semibold">
                                {trip.end_time ? formatTime(trip.end_time) : "In Progress"}
                              </span>
                            </div>
                            {getStatusBadge(trip.status)}
                          </div>
                          
                          <div className="space-y-1.5">
                            <div className="flex items-start gap-2">
                              <div className="w-2 h-2 rounded-full bg-success mt-1.5 shrink-0" />
                              <p className="text-sm text-foreground truncate">
                                {formatLocation(trip.start_location, "Unknown start location")}
                              </p>
                            </div>
                            <div className="flex items-start gap-2">
                              <div className="w-2 h-2 rounded-full bg-destructive mt-1.5 shrink-0" />
                              <p className="text-sm text-foreground truncate">
                                {formatLocation(trip.end_location, "Unknown destination")}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Right: Stats */}
                        <div className="flex flex-col items-end gap-1 ml-4">
                          <div className="text-right">
                            <p className="text-xl font-bold text-primary">{(trip.distance_km || 0).toFixed(1)} km</p>
                            <p className="text-xs text-muted-foreground">{formatDuration(trip.duration_minutes)}</p>
                          </div>
                          {trip.avg_speed_kmh && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Gauge className="h-3 w-3" />
                              {trip.avg_speed_kmh.toFixed(0)} km/h
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Bottom action */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {trip.max_speed_kmh && (
                            <span>Max: {trip.max_speed_kmh} km/h</span>
                          )}
                          {trip.fuel_consumed_liters && (
                            <span className="flex items-center gap-1">
                              <Fuel className="h-3 w-3" />
                              {trip.fuel_consumed_liters.toFixed(1)} L
                            </span>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => navigate('/route-history', { 
                            state: { tripId: trip.id, vehicleId } 
                          })}
                        >
                          <Play className="h-3 w-3" />
                          Replay
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </ScrollArea>
        ) : (
          <motion.div 
            className="flex-1 flex flex-col items-center justify-center py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Navigation className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium mb-1">No trips for this date</p>
            <p className="text-sm text-muted-foreground mb-4">
              {overallStats.totalTrips > 0 
                ? `This vehicle has ${overallStats.totalTrips} trips over ${overallStats.daysWithTrips} days`
                : "No trip history found"}
            </p>
            {mostRecentTripDate && differenceInDays(selectedDate, mostRecentTripDate) !== 0 && (
              <Button variant="outline" size="sm" onClick={handleJumpToRecent} className="gap-2">
                <MapPin className="h-4 w-4" />
                Jump to {format(mostRecentTripDate, "dd MMM")}
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <div className="flex items-center justify-between pt-4 mt-4 border-t gap-2 flex-wrap">
        <div className="text-sm text-muted-foreground">
          {overallStats.totalTrips} trips • {overallStats.totalDistance.toFixed(0)} km total
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleGoToTrips} className="gap-2">
            <Route className="h-4 w-4" />
            All Trips
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

export default TripTimeline;