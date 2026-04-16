import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth,
  isSameDay, addMonths, startOfWeek, endOfWeek, parseISO, isToday,
} from "date-fns";

export const CalendarView = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: calendarData, isLoading } = useQuery({
    queryKey: ["calendar-view", format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

      // Query trip_requests directly (avoids nested filter issues)
      const { data: tripRequests, error } = await supabase
        .from("trip_requests")
        .select(`
          id, request_number, purpose, pickup_at, return_at, status, priority,
          pickup_geofence:pickup_geofence_id(name),
          drop_geofence:drop_geofence_id(name)
        `)
        .gte("pickup_at", calendarStart.toISOString())
        .lte("pickup_at", calendarEnd.toISOString())
        .in("status", ["approved", "scheduled", "dispatched", "in_service", "submitted"])
        .order("pickup_at", { ascending: true });

      if (error) throw error;

      const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
      return { days, trips: tripRequests || [] };
    },
  });

  const getTripsForDay = (day: Date) => {
    if (!calendarData) return [];
    return calendarData.trips.filter((trip: any) => {
      const pickupDate = parseISO(trip.pickup_at);
      return isSameDay(pickupDate, day);
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(addMonths(currentMonth, direction === 'next' ? 1 : -1));
  };

  if (isLoading) {
    return (
      <Card><CardContent className="pt-6">
        <div className="text-center text-muted-foreground">Loading calendar...</div>
      </CardContent></Card>
    );
  }

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const statusColor: Record<string, string> = {
    submitted: "bg-warning/20 border-warning",
    approved: "bg-success/20 border-success",
    scheduled: "bg-secondary/20 border-secondary",
    dispatched: "bg-purple-500/20 border-purple-500",
    in_service: "bg-primary/20 border-primary",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" /> Calendar View
          </CardTitle>
          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-lg font-semibold min-w-[180px] text-center">
              {format(currentMonth, "MMMM yyyy")}
            </div>
            <Button size="sm" variant="outline" onClick={() => navigateMonth('next')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setCurrentMonth(new Date())}>
              Today
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <div className="grid grid-cols-7 bg-muted">
            {weekDays.map((day) => (
              <div key={day} className="p-3 text-center font-medium text-sm border-r last:border-r-0">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarData?.days.map((day, index) => {
              const trips = getTripsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isDayToday = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[120px] p-2 border-r border-b ${
                    index % 7 === 6 ? 'border-r-0' : ''
                  } ${!isCurrentMonth ? 'bg-muted/30' : 'bg-background'} hover:bg-muted/50 transition-colors`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`text-sm font-medium ${
                      isDayToday ? 'bg-primary text-primary-foreground w-7 h-7 rounded-full flex items-center justify-center'
                      : !isCurrentMonth ? 'text-muted-foreground' : ''
                    }`}>
                      {format(day, 'd')}
                    </div>
                    {trips.length > 0 && (
                      <Badge variant="secondary" className="text-xs">{trips.length}</Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    {trips.slice(0, 3).map((trip: any) => (
                      <div
                        key={trip.id}
                        className={`text-xs p-1 rounded border-l-2 truncate cursor-pointer transition-colors ${
                          statusColor[trip.status] || "bg-primary/10 border-primary"
                        } hover:opacity-80`}
                        title={`${trip.request_number}: ${trip.purpose}`}
                      >
                        <div className="font-medium truncate">{trip.request_number}</div>
                        <div className="text-muted-foreground truncate">
                          {format(parseISO(trip.pickup_at), "HH:mm")}
                        </div>
                      </div>
                    ))}
                    {trips.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center">+{trips.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">T</div>
            <span className="text-muted-foreground">Today</span>
          </div>
          {Object.entries({ submitted: "Pending", approved: "Approved", scheduled: "Scheduled", dispatched: "Dispatched", in_service: "Active" }).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded border-l-2 ${statusColor[k]}`} />
              <span className="text-muted-foreground">{v}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
