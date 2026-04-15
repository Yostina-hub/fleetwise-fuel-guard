import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClipboardList, Plus, Clock, CheckCircle, Truck, Eye, LogIn, Shuffle } from "lucide-react";
import { VehicleRequestForm } from "@/components/vehicle-requests/VehicleRequestForm";
import { VehicleRequestApprovalFlow } from "@/components/vehicle-requests/VehicleRequestApprovalFlow";
import { DriverCheckInDialog } from "@/components/vehicle-requests/DriverCheckInDialog";
import { CrossPoolAssignmentDialog } from "@/components/vehicle-requests/CrossPoolAssignmentDialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  pending: "secondary", approved: "default", assigned: "default",
  rejected: "destructive", completed: "outline", cancelled: "secondary",
};

const requestTypeLabels: Record<string, string> = {
  daily_operation: "Daily", project_operation: "Project", field_operation: "Field",
};

export const VehicleRequestsPanel = () => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [showCheckIn, setShowCheckIn] = useState<any>(null);
  const [showCrossPool, setShowCrossPool] = useState<any>(null);

  useEffect(() => {
    if (!organizationId) return;
    const channel = supabase
      .channel("vr-panel-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "vehicle_requests" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["vehicle-requests-panel", organizationId] });
          queryClient.invalidateQueries({ queryKey: ["vr-approvals-panel", organizationId] });
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient, organizationId]);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["vehicle-requests-panel", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vehicle_requests")
        .select("*, assigned_vehicle:assigned_vehicle_id(plate_number, make, model), assigned_driver:assigned_driver_id(first_name, last_name)")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: approvals = [] } = useQuery({
    queryKey: ["vr-approvals-panel", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vehicle_request_approvals")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const pending = requests.filter((r: any) => r.status === "pending").length;
  const assigned = requests.filter((r: any) => r.status === "assigned").length;
  const completed = requests.filter((r: any) => r.status === "completed").length;

  return (
    <div className="space-y-4">
      {/* Quick Stats + Create */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-semibold">{pending}</span>
            <span className="text-muted-foreground">Pending</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-blue-500" />
            <span className="font-semibold">{assigned}</span>
            <span className="text-muted-foreground">Assigned</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
            <span className="font-semibold">{completed}</span>
            <span className="text-muted-foreground">Completed</span>
          </div>
        </div>
        <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setShowCreate(true)}>
          <Plus className="w-3.5 h-3.5" /> New Request
        </Button>
      </div>

      {/* Requests Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-center text-muted-foreground text-sm">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No vehicle requests yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-2 px-3">Request #</th>
                    <th className="text-left py-2 px-3">Type</th>
                    <th className="text-left py-2 px-3">Requester</th>
                    <th className="text-left py-2 px-3">Route</th>
                    <th className="text-left py-2 px-3">Needed From</th>
                    <th className="text-left py-2 px-3">Vehicle</th>
                    <th className="text-center py-2 px-3">Status</th>
                    <th className="text-center py-2 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r: any) => (
                    <tr key={r.id} className="border-b hover:bg-muted/30">
                      <td className="py-2 px-3 font-medium">{r.request_number}</td>
                      <td className="py-2 px-3">
                        <Badge variant="outline" className="text-[10px]">
                          {requestTypeLabels[r.request_type] || r.request_type || "—"}
                        </Badge>
                      </td>
                      <td className="py-2 px-3">{r.requester_name}</td>
                      <td className="py-2 px-3 text-muted-foreground text-xs max-w-[150px] truncate">
                        {r.departure_place && r.destination
                          ? `${r.departure_place} → ${r.destination}`
                          : r.destination || r.departure_place || "—"}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">
                        {format(new Date(r.needed_from), "MMM dd, HH:mm")}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">{r.assigned_vehicle?.plate_number || "—"}</td>
                      <td className="py-2 px-3 text-center">
                        <Badge variant={(statusColors[r.status] || "secondary") as any} className="text-[10px]">
                          {r.status}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setShowDetail(r)}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <VehicleRequestForm open={showCreate} onOpenChange={setShowCreate} />

      {showDetail && (
        <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Request {showDetail.request_number}</DialogTitle>
            </DialogHeader>
            <VehicleRequestApprovalFlow
              request={showDetail}
              approvals={approvals}
              onClose={() => setShowDetail(null)}
              onCheckIn={() => { setShowDetail(null); setShowCheckIn(showDetail); }}
              onCrossPool={() => { setShowDetail(null); setShowCrossPool(showDetail); }}
            />
          </DialogContent>
        </Dialog>
      )}

      {showCheckIn && (
        <DriverCheckInDialog request={showCheckIn} open={!!showCheckIn} onClose={() => setShowCheckIn(null)} />
      )}
      {showCrossPool && (
        <CrossPoolAssignmentDialog request={showCrossPool} open={!!showCrossPool} onClose={() => setShowCrossPool(null)} />
      )}
    </div>
  );
};
