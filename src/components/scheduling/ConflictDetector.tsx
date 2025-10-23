import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ConflictDetectorProps {
  vehicleId?: string;
  driverId?: string;
  pickupAt: string;
  returnAt: string;
}

interface Conflict {
  type: 'vehicle' | 'driver' | 'maintenance' | 'none';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  details?: string;
}

export const ConflictDetector = ({
  vehicleId,
  driverId,
  pickupAt,
  returnAt,
}: ConflictDetectorProps) => {
  const { data: conflicts, isLoading } = useQuery({
    queryKey: ["conflicts", vehicleId, driverId, pickupAt, returnAt],
    queryFn: async () => {
      const detected: Conflict[] = [];

      // Check vehicle conflicts
      if (vehicleId) {
        const { data: vehicleConflicts } = await supabase
          .from("vehicle_calendar" as any)
          .select("*, trip_assignment:reference_id(*)")
          .eq("vehicle_id", vehicleId)
          .gte("window_end", pickupAt)
          .lte("window_start", returnAt);

        vehicleConflicts?.forEach((conflict: any) => {
          if (conflict.entry_type === 'trip') {
            detected.push({
              type: 'vehicle',
              severity: 'critical',
              message: 'Vehicle already scheduled',
              details: `Vehicle is assigned to another trip during this time`,
            });
          } else if (conflict.entry_type === 'maintenance') {
            detected.push({
              type: 'maintenance',
              severity: 'critical',
              message: 'Vehicle in maintenance',
              details: 'Vehicle has a scheduled maintenance during this period',
            });
          }
        });
      }

      // Check driver conflicts
      if (driverId) {
        const { data: driverConflicts } = await supabase
          .from("driver_calendar" as any)
          .select("*")
          .eq("driver_id", driverId)
          .gte("window_end", pickupAt)
          .lte("window_start", returnAt);

        if (driverConflicts && driverConflicts.length > 0) {
          detected.push({
            type: 'driver',
            severity: 'critical',
            message: 'Driver already scheduled',
            details: 'Driver is assigned to another trip during this time',
          });
        }
      }

      // Check vehicle status
      if (vehicleId) {
        const { data: vehicle } = await supabase
          .from("vehicles")
          .select("status")
          .eq("id", vehicleId)
          .single();

        if (vehicle?.status === 'out_of_service') {
          detected.push({
            type: 'vehicle',
            severity: 'critical',
            message: 'Vehicle out of service',
            details: 'Vehicle is currently marked as out of service',
          });
        }
      }

      // Check driver status
      if (driverId) {
        const { data: driver } = await supabase
          .from("drivers")
          .select("status")
          .eq("id", driverId)
          .single();

        if (driver?.status !== 'active') {
          detected.push({
            type: 'driver',
            severity: 'warning',
            message: 'Driver not active',
            details: 'Driver status is not active',
          });
        }
      }

      return detected.length > 0 ? detected : [{
        type: 'none' as const,
        severity: 'info' as const,
        message: 'No conflicts detected',
        details: 'Vehicle and driver are available for this time slot',
      }];
    },
    enabled: !!(vehicleId || driverId) && !!pickupAt && !!returnAt,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-sm text-muted-foreground">
            Checking for conflicts...
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasCritical = conflicts?.some(c => c.severity === 'critical');
  const hasWarning = conflicts?.some(c => c.severity === 'warning');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {hasCritical && <XCircle className="w-5 h-5 text-red-600" />}
          {!hasCritical && hasWarning && <AlertTriangle className="w-5 h-5 text-yellow-600" />}
          {!hasCritical && !hasWarning && <CheckCircle className="w-5 h-5 text-green-600" />}
          Conflict Check
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {conflicts?.map((conflict, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg border ${
              conflict.severity === 'critical' ? 'bg-red-50 border-red-200' :
              conflict.severity === 'warning' ? 'bg-yellow-50 border-yellow-200' :
              'bg-green-50 border-green-200'
            }`}
          >
            <div className="flex items-start gap-2">
              {conflict.severity === 'critical' && <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />}
              {conflict.severity === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />}
              {conflict.severity === 'info' && <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />}
              
              <div className="flex-1">
                <div className="font-medium text-sm">
                  {conflict.message}
                  <Badge 
                    variant="outline" 
                    className="ml-2"
                  >
                    {conflict.type}
                  </Badge>
                </div>
                {conflict.details && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {conflict.details}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
