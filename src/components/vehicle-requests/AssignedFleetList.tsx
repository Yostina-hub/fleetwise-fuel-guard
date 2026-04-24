/**
 * AssignedFleetList
 * -----------------
 * Renders the full per-vehicle/per-driver assignment list for a multi-
 * vehicle request. Each row shows the vehicle plate, driver, current
 * status (assigned / checked-in / checked-out) plus an inline Check
 * In / Check Out button when the viewer is allowed to act on it.
 *
 * Visibility rules (mirrors useVehicleRequestScope):
 *   - admins / operators       → can act on every row
 *   - the assigned driver only → can act on their own row
 *   - everyone else            → read-only
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Truck, UserCheck, LogIn, LogOut, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import { useRequestAssignments, RequestAssignment } from "@/hooks/useRequestAssignments";
import { useVehicleRequestScope } from "@/hooks/useVehicleRequestScope";

interface Props {
  request: any;
  onCheckIn?: (assignment: RequestAssignment) => void;
}

const statusBadge = (a: RequestAssignment) => {
  if (a.driver_checked_out_at)
    return <Badge variant="secondary" className="text-[10px]"><CheckCircle2 className="w-3 h-3 mr-0.5" /> Completed</Badge>;
  if (a.driver_checked_in_at)
    return <Badge className="text-[10px] bg-emerald-600 hover:bg-emerald-700"><LogIn className="w-3 h-3 mr-0.5" /> Checked In</Badge>;
  return <Badge variant="outline" className="text-[10px]"><Clock className="w-3 h-3 mr-0.5" /> Assigned</Badge>;
};

export const AssignedFleetList = ({ request, onCheckIn }: Props) => {
  const { data: assignments = [], isLoading } = useRequestAssignments(request?.id);
  const scope = useVehicleRequestScope();
  const canManageAll = scope.tier === "all" || scope.tier === "operator";

  // Hide entirely for single-vehicle requests with no extra rows in the
  // assignments table — the parent row already renders the same info.
  if (!isLoading && assignments.length <= 1 && (request?.num_vehicles || 1) <= 1) {
    return null;
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted/50 px-3 py-2 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Truck className="w-3.5 h-3.5" /> Assigned Fleet
        </div>
        <Badge variant="outline" className="text-[10px]">
          {assignments.length} / {request?.num_vehicles || assignments.length}
        </Badge>
      </div>

      {isLoading ? (
        <div className="p-3 text-xs text-muted-foreground">Loading…</div>
      ) : assignments.length === 0 ? (
        <div className="p-3 text-xs text-muted-foreground">No assignments yet.</div>
      ) : (
        <table className="w-full text-xs">
          <thead className="bg-muted/30 text-[10px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-1.5">Vehicle</th>
              <th className="text-left px-3 py-1.5">Driver</th>
              <th className="text-left px-3 py-1.5">Status</th>
              <th className="text-left px-3 py-1.5">Check-in</th>
              <th className="text-right px-3 py-1.5"></th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a) => {
              const isOwnAssignment =
                scope.tier === "driver" && a.driver_id && a.driver_id === scope.driverId;
              const canAct = canManageAll || isOwnAssignment;
              const isCheckedIn = !!a.driver_checked_in_at;
              const isCheckedOut = !!a.driver_checked_out_at;
              return (
                <tr key={a.id} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                    {a.vehicle?.plate_number || "—"}
                    {a.vehicle?.make && (
                      <span className="text-muted-foreground font-normal">
                        ({a.vehicle.make} {a.vehicle.model})
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {a.driver ? (
                      <span className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-muted-foreground" />
                        {a.driver.first_name} {a.driver.last_name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic">— outsource —</span>
                    )}
                  </td>
                  <td className="px-3 py-2">{statusBadge(a)}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {a.driver_checked_in_at ? format(new Date(a.driver_checked_in_at), "MMM dd, h:mm a") : "—"}
                    {a.driver_checked_out_at && (
                      <div className="text-[10px]">out: {format(new Date(a.driver_checked_out_at), "MMM dd, h:mm a")}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {canAct && !isCheckedOut && onCheckIn && (
                      <Button
                        size="sm"
                        variant={isCheckedIn ? "outline" : "default"}
                        className="h-7 text-xs"
                        onClick={() => onCheckIn(a)}
                      >
                        {isCheckedIn ? (
                          <><LogOut className="w-3 h-3 mr-1" /> Check Out</>
                        ) : (
                          <><LogIn className="w-3 h-3 mr-1" /> Check In</>
                        )}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};
