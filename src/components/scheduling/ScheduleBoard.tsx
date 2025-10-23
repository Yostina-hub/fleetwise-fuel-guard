import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, ChevronLeft, ChevronRight, Truck, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  addDays, 
  startOfWeek, 
  endOfWeek, 
  format, 
  isSameDay,
  parseISO,
  differenceInMinutes,
  startOfDay,
  addHours
} from "date-fns";

type ViewMode = 'day' | 'week' | 'month';

export const ScheduleBoard = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [viewBy, setViewBy] = useState<'vehicle' | 'driver'>('vehicle');

  const { data: scheduleData, isLoading } = useQuery({
    queryKey: ["schedule-board", currentDate, viewMode, viewBy],
    queryFn: async () => {
      const start = viewMode === 'week' 
        ? startOfWeek(currentDate, { weekStartsOn: 1 })
        : startOfDay(currentDate);
      
      const end = viewMode === 'week'
        ? endOfWeek(currentDate, { weekStartsOn: 1 })
        : addDays(start, 1);

      // Fetch resources (vehicles or drivers)
      const resourceTable = viewBy === 'vehicle' ? 'vehicles' : 'drivers';
      const { data: resources, error: resourcesError } = await supabase
        .from(resourceTable as any)
        .select(viewBy === 'vehicle' 
          ? 'id, plate_number, make, model, vehicle_class' 
          : 'id, first_name, last_name, employee_id'
        )
        .eq('status', 'active')
        .limit(20);

      if (resourcesError) throw resourcesError;

      // Fetch assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from("trip_assignments" as any)
        .select(`
          *,
          trip_request:trip_request_id(
            request_number,
            purpose,
            pickup_at,
            return_at,
            status
          ),
          vehicle:vehicle_id(plate_number),
          driver:driver_id(first_name, last_name)
        `)
        .gte("trip_request.return_at", start.toISOString())
        .lte("trip_request.pickup_at", end.toISOString())
        .in("status", ["scheduled", "dispatched", "in_progress"]);

      if (assignmentsError) throw assignmentsError;

      return {
        resources: resources || [],
        assignments: assignments || [],
        start,
        end,
      };
    },
  });

  const navigateDate = (direction: 'prev' | 'next') => {
    if (viewMode === 'day') {
      setCurrentDate(addDays(currentDate, direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      setCurrentDate(addDays(currentDate, direction === 'next' ? 7 : -7));
    }
  };

  const getTimeSlots = () => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      slots.push(hour);
    }
    return slots;
  };

  const getDaysInView = () => {
    if (viewMode === 'day') {
      return [currentDate];
    } else if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    return [currentDate];
  };

  const getAssignmentsForResource = (resourceId: string, date: Date) => {
    if (!scheduleData) return [];
    
    return scheduleData.assignments.filter((assignment: any) => {
      const resourceMatch = viewBy === 'vehicle' 
        ? assignment.vehicle_id === resourceId
        : assignment.driver_id === resourceId;
      
      const pickupDate = parseISO(assignment.trip_request?.pickup_at);
      const returnDate = parseISO(assignment.trip_request?.return_at);
      
      const dateMatch = isSameDay(pickupDate, date) || 
                       (pickupDate <= date && returnDate >= date);
      
      return resourceMatch && dateMatch;
    });
  };

  const calculatePosition = (pickupAt: string, returnAt: string, date: Date) => {
    const dayStart = startOfDay(date);
    const pickup = parseISO(pickupAt);
    const returnTime = parseISO(returnAt);

    // Calculate minutes from start of day
    const startMinutes = Math.max(0, differenceInMinutes(pickup, dayStart));
    const endMinutes = Math.min(1440, differenceInMinutes(returnTime, dayStart)); // 1440 = 24 hours
    const duration = endMinutes - startMinutes;

    // Convert to percentage of day
    const top = (startMinutes / 1440) * 100;
    const height = (duration / 1440) * 100;

    return { top: `${top}%`, height: `${height}%` };
  };

  const days = getDaysInView();
  const timeSlots = getTimeSlots();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading schedule...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Schedule Board</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {viewMode === "day" ? format(currentDate, "PPP") : `Week of ${format(startOfWeek(currentDate), "PPP")}`}
            </p>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            {/* View By Selector */}
            <Select value={viewBy} onValueChange={(value: any) => setViewBy(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vehicle">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    Vehicles
                  </div>
                </SelectItem>
                <SelectItem value="driver">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Drivers
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode Selector */}
            <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day View</SelectItem>
                <SelectItem value="week">Week View</SelectItem>
              </SelectContent>
            </Select>

            {/* Navigation */}
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => navigateDate('prev')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setCurrentDate(new Date())}>
                Today
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigateDate('next')}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="text-sm font-medium whitespace-nowrap">
              {viewMode === 'week' ? (
                `${format(days[0], "MMM dd")} - ${format(days[days.length - 1], "MMM dd, yyyy")}`
              ) : (
                format(currentDate, "EEEE, MMM dd, yyyy")
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          {/* Header Row - Days */}
          <div className="grid" style={{ gridTemplateColumns: `120px repeat(${days.length}, 1fr)` }}>
            <div className="bg-muted p-3 border-r border-b font-medium text-sm">
              {viewBy === 'vehicle' ? 'Vehicle' : 'Driver'}
            </div>
            {days.map((day) => (
              <div key={day.toISOString()} className="bg-muted p-3 border-r border-b text-center">
                <div className="font-medium">{format(day, "EEE")}</div>
                <div className="text-sm text-muted-foreground">{format(day, "MMM dd")}</div>
              </div>
            ))}
          </div>

          {/* Schedule Grid */}
          <div className="max-h-[600px] overflow-y-auto">
            {scheduleData?.resources.map((resource: any) => (
              <div
                key={resource.id}
                className="grid border-b hover:bg-muted/30 transition-colors"
                style={{ gridTemplateColumns: `120px repeat(${days.length}, 1fr)` }}
              >
                {/* Resource Label */}
                <div className="p-3 border-r bg-background sticky left-0 z-10">
                  <div className="font-medium text-sm">
                    {viewBy === 'vehicle' 
                      ? resource.plate_number
                      : `${resource.first_name} ${resource.last_name}`
                    }
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {viewBy === 'vehicle' 
                      ? `${resource.make} ${resource.model}`
                      : resource.employee_id
                    }
                  </div>
                </div>

                {/* Day Cells */}
                {days.map((day) => {
                  const assignments = getAssignmentsForResource(resource.id, day);
                  
                  return (
                    <div
                      key={day.toISOString()}
                      className="border-r relative min-h-[80px] bg-background"
                    >
                      {assignments.map((assignment: any) => {
                        const position = calculatePosition(
                          assignment.trip_request?.pickup_at,
                          assignment.trip_request?.return_at,
                          day
                        );

                        return (
                          <div
                            key={assignment.id}
                            className="absolute left-1 right-1 bg-primary/10 border-l-4 border-primary rounded p-2 overflow-hidden hover:z-20 hover:shadow-lg transition-all cursor-pointer group"
                            style={position}
                            title={assignment.trip_request?.purpose}
                          >
                            <div className="text-xs font-medium truncate">
                              {assignment.trip_request?.request_number}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {assignment.trip_request?.purpose}
                            </div>
                            <div className="text-xs font-medium mt-1">
                              {format(parseISO(assignment.trip_request?.pickup_at), "HH:mm")} - 
                              {format(parseISO(assignment.trip_request?.return_at), "HH:mm")}
                            </div>
                            <Badge className="mt-1 text-xs" variant="secondary">
                              {assignment.status}
                            </Badge>
                            
                            {/* Hover Details */}
                            <div className="hidden group-hover:block absolute top-0 left-full ml-2 w-64 bg-popover border rounded-lg shadow-lg p-3 z-30">
                              <div className="font-medium mb-2">{assignment.trip_request?.purpose}</div>
                              <div className="space-y-1 text-xs">
                                <div>Request: {assignment.trip_request?.request_number}</div>
                                <div>Vehicle: {assignment.vehicle?.plate_number}</div>
                                <div>Driver: {assignment.driver?.first_name} {assignment.driver?.last_name}</div>
                                <div>
                                  Time: {format(parseISO(assignment.trip_request?.pickup_at), "HH:mm")} - 
                                  {format(parseISO(assignment.trip_request?.return_at), "HH:mm")}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary/10 border-l-4 border-primary rounded" />
            <span>Scheduled Trip</span>
          </div>
          <div className="text-xs">
            Hover over trips for more details
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
