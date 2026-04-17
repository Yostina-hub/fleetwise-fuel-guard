import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PendingPostTrip {
  id: string;
  vehicle_id: string;
  inspection_date: string;
  vehicles?: { plate_number: string | null; make: string | null; model: string | null } | null;
}

interface Props {
  driverId?: string;
  organizationId?: string;
  onStart: (inspection: PendingPostTrip) => void;
}

/**
 * Driver Portal banner that surfaces pending post-trip inspections.
 * The system auto-creates these when a Vehicle Dispatch trip completes,
 * and the assigned vehicle is held in 'in_use' status until the driver
 * submits the checklist (hybrid enforcement).
 */
const PendingPostTripBanner = ({ driverId, organizationId, onStart }: Props) => {
  const { data: pending } = useQuery({
    queryKey: ["driver-pending-post-trip", driverId, organizationId],
    enabled: !!driverId && !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_inspections")
        .select("id, vehicle_id, inspection_date, vehicles:vehicle_id(plate_number, make, model)")
        .eq("organization_id", organizationId!)
        .eq("driver_id", driverId!)
        .eq("inspection_type", "post_trip")
        .eq("status", "pending")
        .order("inspection_date", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as PendingPostTrip[];
    },
    refetchInterval: 30_000,
  });

  if (!pending || pending.length === 0) return null;
  const first = pending[0];
  const veh = first.vehicles;

  return (
    <Card className="glass-strong border-warning/40">
      <CardContent className="p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="p-2 rounded-md bg-warning/15 text-warning">
            <AlertTriangle className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium">Post-trip inspection required</p>
              {pending.length > 1 && (
                <Badge variant="outline">{pending.length} pending</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {veh?.plate_number || "Vehicle"}
              {veh?.make ? ` · ${veh.make} ${veh.model || ""}` : ""}
              {" · "}
              <span>created {formatDistanceToNow(new Date(first.inspection_date), { addSuffix: true })}</span>
            </p>
          </div>
        </div>
        <Button onClick={() => onStart(first)} className="gap-2">
          <ClipboardCheck className="w-4 h-4" aria-hidden="true" />
          Complete checklist
        </Button>
      </CardContent>
    </Card>
  );
};

export default PendingPostTripBanner;
