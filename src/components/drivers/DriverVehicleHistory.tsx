import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Car, ArrowRight, Clock, CalendarDays } from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface VehicleAssignment {
  id: string;
  vehicle_id: string;
  assigned_at: string;
  unassigned_at: string | null;
  reason: string | null;
  is_current: boolean;
}

interface DriverVehicleHistoryProps {
  driverId: string;
  driverName: string;
}

export const DriverVehicleHistory = ({ driverId, driverName }: DriverVehicleHistoryProps) => {
  const { organizationId } = useOrganization();
  const [assignments, setAssignments] = useState<VehicleAssignment[]>([]);
  const [vehicles, setVehicles] = useState<Record<string, { plate_number: string; make: string; model: string }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId || !driverId) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("driver_vehicle_assignments")
        .select("*")
        .eq("driver_id", driverId)
        .eq("organization_id", organizationId)
        .order("assigned_at", { ascending: false });

      const items = (data as any) || [];
      setAssignments(items);

      // Fetch vehicle details
      const vehicleIds = [...new Set(items.map((a: any) => a.vehicle_id))] as string[];
      if (vehicleIds.length > 0) {
        const { data: vData } = await supabase
          .from("vehicles")
          .select("id, plate_number, make, model")
          .in("id", vehicleIds);
        const map: Record<string, any> = {};
        vData?.forEach((v: any) => { map[v.id] = v; });
        setVehicles(map);
      }
      setLoading(false);
    };
    fetch();
  }, [driverId, organizationId]);

  const currentAssignment = assignments.find(a => a.is_current);

  return (
    <div className="space-y-4">
      {/* Current Assignment */}
      {currentAssignment && vehicles[currentAssignment.vehicle_id] && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Car className="w-4 h-4 text-primary" />
              Current Vehicle Assignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Car className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="font-bold">{vehicles[currentAssignment.vehicle_id].plate_number}</p>
                <p className="text-sm text-muted-foreground">
                  {vehicles[currentAssignment.vehicle_id].make} {vehicles[currentAssignment.vehicle_id].model}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Since {format(new Date(currentAssignment.assigned_at), "MMM d, yyyy")} ·{" "}
                  {differenceInDays(new Date(), new Date(currentAssignment.assigned_at))} days
                </p>
              </div>
              <Badge className="ml-auto">Active</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assignment History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            Assignment History
          </CardTitle>
          <CardDescription>{assignments.length} total assignments</CardDescription>
        </CardHeader>
        <CardContent>
          {assignments.length > 0 ? (
            <div className="space-y-2">
              {assignments.map(a => {
                const v = vehicles[a.vehicle_id];
                const duration = a.unassigned_at
                  ? differenceInDays(new Date(a.unassigned_at), new Date(a.assigned_at))
                  : differenceInDays(new Date(), new Date(a.assigned_at));
                return (
                  <div key={a.id} className={`flex items-center gap-3 p-3 rounded-lg border ${a.is_current ? "bg-primary/5 border-primary/20" : "hover:bg-accent/50"} transition-colors`}>
                    <Car className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{v ? `${v.plate_number} — ${v.make} ${v.model}` : "Unknown Vehicle"}</p>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                        <span>{format(new Date(a.assigned_at), "MMM d, yyyy")}</span>
                        <ArrowRight className="w-3 h-3" />
                        <span>{a.unassigned_at ? format(new Date(a.unassigned_at), "MMM d, yyyy") : "Present"}</span>
                        <span className="ml-1">({duration} days)</span>
                      </div>
                      {a.reason && <p className="text-[10px] text-muted-foreground mt-0.5">{a.reason}</p>}
                    </div>
                    {a.is_current && <Badge variant="default" className="text-[10px]">Current</Badge>}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No vehicle assignment history found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
