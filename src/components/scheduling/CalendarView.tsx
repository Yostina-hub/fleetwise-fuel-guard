import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  startOfWeek,
  endOfWeek,
  parseISO,
  isToday,
} from "date-fns";

export const CalendarView = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: calendarData, isLoading } = useQuery({
    queryKey: ["calendar-view", currentMonth],
    queryFn: async () => {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

      const { data: assignments, error } = await supabase
        .from("trip_assignments" as any)
        .select(`
          *,
          trip_request:trip_request_id(
            request_number,
            purpose,
            pickup_at,
            return_at,
            status
          )
        `)
        .gte("trip_request.pickup_at", calendarStart.toISOString())
        .lte("trip_request.pickup_at", calendarEnd.toISOString())
        .in("status", ["scheduled", "dispatched", "in_progress"]);

      if (error) throw error;

      const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
      
      return {
        days,
        assignments: assignments || [],
      };
    },
  });

  const getAssignmentsForDay = (day: Date) => {
    if (!calendarData) return [];
    return calendarData.assignments.filter((assignment: any) => {
      const pickupDate = parseISO(assignment.trip_request?.pickup_at);
      return isSameDay(pickupDate, day);
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(addMonths(currentMonth, direction === 'next' ? 1 : -1));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading calendar...</div>
        </CardContent>
      </Card>
    );
  }

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Calendar View
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
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 bg-muted">
            {weekDays.map((day) => (
              <div key={day} className="p-3 text-center font-medium text-sm border-r last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7">
            {calendarData?.days.map((day, index) => {
              const assignments = getAssignmentsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isDayToday = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[120px] p-2 border-r border-b ${
                    index % 7 === 6 ? 'border-r-0' : ''
                  } ${
                    !isCurrentMonth ? 'bg-muted/30' : 'bg-background'
                  } hover:bg-muted/50 transition-colors`}
                >
                  {/* Day Number */}
                  <div className="flex items-center justify-between mb-2">
                    <div className={`text-sm font-medium ${
                      isDayToday 
                        ? 'bg-primary text-primary-foreground w-7 h-7 rounded-full flex items-center justify-center' 
                        : !isCurrentMonth 
                        ? 'text-muted-foreground' 
                        : ''
                    }`}>
                      {format(day, 'd')}
                    </div>
                    {assignments.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {assignments.length}
                      </Badge>
                    )}
                  </div>

                  {/* Assignments */}
                  <div className="space-y-1">
                    {assignments.slice(0, 3).map((assignment: any) => (
                      <div
                        key={assignment.id}
                        className="text-xs p-1 rounded bg-primary/10 border-l-2 border-primary truncate hover:bg-primary/20 cursor-pointer transition-colors"
                        title={`${assignment.trip_request?.request_number}: ${assignment.trip_request?.purpose}`}
                      >
                        <div className="font-medium truncate">
                          {assignment.trip_request?.request_number}
                        </div>
                        <div className="text-muted-foreground truncate">
                          {format(parseISO(assignment.trip_request?.pickup_at), "HH:mm")}
                        </div>
                      </div>
                    ))}
                    {assignments.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{assignments.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">
              T
            </div>
            <span className="text-muted-foreground">Today</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary/10 border-l-2 border-primary rounded" />
            <span className="text-muted-foreground">Scheduled Trip</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
