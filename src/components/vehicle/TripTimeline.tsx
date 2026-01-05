import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Navigation, Route } from "lucide-react";
import { format, addDays, subDays, isSameDay } from "date-fns";
import { useNavigate } from "react-router-dom";

interface Trip {
  id?: string;
  start_time: string;
  end_time?: string | null;
  start_location?: string | null;
  end_location?: string | null;
  distance_km?: number | null;
  duration_minutes?: number | null;
  status?: string | null;
}

interface TripTimelineProps {
  trips: Trip[];
  isLoading: boolean;
  vehicleId?: string;
}

const TripTimeline = ({ trips, isLoading, vehicleId }: TripTimelineProps) => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Filter trips for selected date
  const filteredTrips = trips.filter(trip => {
    const tripDate = new Date(trip.start_time);
    return isSameDay(tripDate, selectedDate);
  });

  const handlePreviousDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
  };

  const handleNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
  };

  const handleGoToTrips = () => {
    navigate('/routes', { state: { vehicleId } });
  };

  const formatDuration = (minutes: number | null | undefined) => {
    if (!minutes) return "0 min";
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) {
      return `${hrs} hr ${mins} min`;
    }
    return `${mins} min ${Math.floor((minutes % 1) * 60)} sec`;
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), "HH:mm:ss");
  };

  // Get alternating dot colors
  const getDotColor = (index: number) => {
    const colors = ["bg-pink-500", "bg-blue-600", "bg-green-500"];
    return colors[index % colors.length];
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Date Header with Navigation */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">
          {format(selectedDate, "dd MMM yyyy")}
        </h3>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                {format(selectedDate, "dd MMM yyyy")}
                <CalendarIcon className="h-4 w-4" />
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
            variant="default" 
            size="icon"
            onClick={handlePreviousDay}
            className="bg-primary hover:bg-primary/90"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="default" 
            size="icon"
            onClick={handleNextDay}
            className="bg-primary hover:bg-primary/90"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Timeline */}
      {filteredTrips.length > 0 ? (
        <ScrollArea className="flex-1 pr-4">
          <div className="relative">
            {/* Central timeline line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-muted-foreground/30 -translate-x-1/2" />

            {filteredTrips.map((trip, index) => {
              const isLeft = index % 2 === 1;
              const distance = trip.distance_km?.toFixed(1) || "0";

              return (
                <div key={trip.id || index} className="relative mb-8">
                  {/* Distance marker */}
                  <div className={`absolute left-1/2 -translate-x-1/2 ${isLeft ? 'top-1/2' : 'top-1/2'} -translate-y-1/2 z-10`}>
                    <span className="text-sm text-muted-foreground bg-background px-2 py-1">
                      {distance} km
                    </span>
                  </div>

                  {/* Dot on timeline */}
                  <div className={`absolute left-1/2 -translate-x-1/2 top-4 z-20`}>
                    <div className={`w-3 h-3 rounded-full ${getDotColor(index)}`} />
                  </div>

                  {/* Trip Card */}
                  <div className={`flex ${isLeft ? 'justify-start pr-[52%]' : 'justify-end pl-[52%]'}`}>
                    <div className="bg-muted/50 rounded-lg p-4 max-w-full hover:bg-muted transition-colors">
                      {/* End Location & Time */}
                      <div className="text-center mb-2">
                        <p className="font-medium text-foreground">
                          {trip.end_location || "Unknown destination"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Ended {trip.end_time ? formatTime(trip.end_time) : "In progress"}
                        </p>
                      </div>

                      {/* Duration */}
                      <p className="text-center text-primary font-medium my-2">
                        {formatDuration(trip.duration_minutes)}
                      </p>

                      {/* Start Location & Time */}
                      <div className="text-center mb-3">
                        <p className="font-medium text-foreground">
                          {trip.start_location || "Unknown origin"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Started {formatTime(trip.start_time)}
                        </p>
                      </div>

                      {/* View Trip Button */}
                      <div className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => navigate('/route-history', { 
                            state: { tripId: trip.id, vehicleId } 
                          })}
                          className="text-foreground hover:text-primary"
                        >
                          View Trip
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-12">
          <Navigation className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground mb-2">No trips for this date</p>
          <p className="text-xs text-muted-foreground">
            Select a different date or check trip history
          </p>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="flex items-center justify-center gap-3 pt-4 mt-4 border-t">
        <Button onClick={handleGoToTrips} className="bg-primary hover:bg-primary/90">
          Go to trips
        </Button>
        <Button 
          variant="outline" 
          onClick={handlePreviousDay}
          className="gap-2 border-primary text-primary hover:bg-primary/10"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous Day
        </Button>
        <Button 
          variant="outline"
          onClick={handleNextDay}
          className="gap-2 border-primary text-primary hover:bg-primary/10"
        >
          Next Day
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default TripTimeline;
