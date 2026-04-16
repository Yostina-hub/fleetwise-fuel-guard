import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClipboardList, Plus, Clock, CheckCircle, XCircle, Truck, Eye, MessageSquare, LogIn, Shuffle } from "lucide-react";
import { VehicleRequestKPI } from "@/components/vehicle-requests/VehicleRequestKPI";
import { VehicleRequestForm } from "@/components/vehicle-requests/VehicleRequestForm";
import { VehicleRequestApprovalFlow } from "@/components/vehicle-requests/VehicleRequestApprovalFlow";
import { RequesterFeedbackDialog } from "@/components/vehicle-requests/RequesterFeedbackDialog";
import { DriverCheckInDialog } from "@/components/vehicle-requests/DriverCheckInDialog";
import { CrossPoolAssignmentDialog } from "@/components/vehicle-requests/CrossPoolAssignmentDialog";
import { PoolReviewPanel } from "@/components/vehicle-requests/PoolReviewPanel";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

const VehicleRequests = () => {
  const { t } = useTranslation();
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [showFeedback, setShowFeedback] = useState<any>(null);
  const [showCheckIn, setShowCheckIn] = useState<any>(null);
  const [showCrossPool, setShowCrossPool] = useState<any>(null);

  // Realtime subscription for vehicle_requests
  useEffect(() => {
    const channel = supabase
      .channel("vehicle-requests-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vehicle_requests" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["vehicle-requests", organizationId] });
          queryClient.invalidateQueries({ queryKey: ["vehicle-request-approvals", organizationId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient, organizationId]);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["vehicle-requests", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vehicle_requests")
        .select("*, assigned_vehicle:assigned_vehicle_id(plate_number, make, model), assigned_driver:assigned_driver_id(first_name, last_name)")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: approvals = [] } = useQuery({
    queryKey: ["vehicle-request-approvals", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vehicle_request_approvals")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const statusColors: Record<string, string> = {
    pending: "secondary", approved: "default", assigned: "default", rejected: "destructive", completed: "outline", cancelled: "secondary",
  };

  const requestTypeLabels: Record<string, string> = {
    daily_operation: "Daily",
    project_operation: "Project",
    field_operation: "Field",
  };

  const pending = requests.filter((r: any) => r.status === "pending").length;
  const assigned = requests.filter((r: any) => r.status === "assigned").length;
  const completed = requests.filter((r: any) => r.status === "completed").length;

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ClipboardList className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">{t('pages.vehicle_requests.title', 'Vehicle Requests')}</h1>
              <p className="text-muted-foreground text-xs">{t('pages.vehicle_requests.description', 'Request, approve & assign vehicles')}</p>
            </div>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
            <Plus className="w-3.5 h-3.5" /> New Request
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center"><Clock className="w-4 h-4 text-amber-500" /></div>
            <div><p className="text-xl font-bold">{pending}</p><p className="text-xs text-muted-foreground">Pending</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center"><Truck className="w-4 h-4 text-blue-500" /></div>
            <div><p className="text-xl font-bold">{assigned}</p><p className="text-xs text-muted-foreground">Assigned</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center"><CheckCircle className="w-4 h-4 text-green-500" /></div>
            <div><p className="text-xl font-bold">{completed}</p><p className="text-xs text-muted-foreground">{t('common.completed', 'Completed')}</p></div>
          </CardContent></Card>
        </div>

        <VehicleRequestKPI requests={requests} />

        {/* Pool Supervisor Review Panel */}
        {organizationId && (
          <PoolReviewPanel requests={requests} organizationId={organizationId} />
        )}

        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">All Requests</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <div className="animate-pulse h-32" /> : requests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No vehicle requests yet.</p>
                <p className="text-xs mt-1">Create a new request to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-2 px-3">Request #</th>
                    <th className="text-left py-2 px-3">Type</th>
                    <th className="text-left py-2 px-3">Requester</th>
                    <th className="text-left py-2 px-3">Route</th>
                    <th className="text-left py-2 px-3">Pool</th>
                    <th className="text-left py-2 px-3">Needed From</th>
                    <th className="text-left py-2 px-3">Vehicle</th>
                    <th className="text-center py-2 px-3">Trip</th>
                    <th className="text-center py-2 px-3">Check-in</th>
                    <th className="text-center py-2 px-3">Status</th>
                    <th className="text-center py-2 px-3">Actions</th>
                  </tr></thead>
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
                        <td className="py-2 px-3 text-muted-foreground text-xs">
                          {r.cross_pool_assignment ? (
                            <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-500">
                              <Shuffle className="w-2.5 h-2.5 mr-0.5" /> {r.pool_name || "—"}
                            </Badge>
                          ) : (r.pool_name || "—")}
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">{format(new Date(r.needed_from), "MMM dd, HH:mm")}</td>
                        <td className="py-2 px-3 text-muted-foreground">{r.assigned_vehicle?.plate_number || "—"}</td>
                        <td className="py-2 px-3 text-center">
                          {r.trip_type ? (
                            <Badge variant="outline" className="text-[10px]">
                              {r.trip_type === "one_way" ? "One Way" : "Round"}
                            </Badge>
                          ) : "—"}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {r.driver_checked_in_at ? (
                            <Badge variant="default" className="text-[10px] bg-green-600">
                              {r.driver_checked_out_at ? "Out" : "In"}
                            </Badge>
                          ) : r.status === "assigned" ? (
                            <Button size="sm" variant="ghost" className="h-6 px-1.5" onClick={() => setShowCheckIn(r)}>
                              <LogIn className="w-3 h-3" />
                            </Button>
                          ) : "—"}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Badge variant={(statusColors[r.status] || "secondary") as any} className="text-[10px]">
                            {r.status}
                            {r.auto_closed && " ⚡"}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Button size="sm" variant="ghost" onClick={() => setShowDetail(r)}><Eye className="w-3.5 h-3.5" /></Button>
                          {r.status === "completed" && !r.requester_rating && !r.auto_closed && (
                            <Button size="sm" variant="ghost" onClick={() => setShowFeedback(r)} title="Give feedback (available for manually completed trips)"><MessageSquare className="w-3.5 h-3.5" /></Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

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

        {showFeedback && (
          <RequesterFeedbackDialog
            request={showFeedback}
            open={!!showFeedback}
            onClose={() => setShowFeedback(null)}
          />
        )}

        {showCheckIn && (
          <DriverCheckInDialog
            request={showCheckIn}
            open={!!showCheckIn}
            onClose={() => setShowCheckIn(null)}
          />
        )}

        {showCrossPool && (
          <CrossPoolAssignmentDialog
            request={showCrossPool}
            open={!!showCrossPool}
            onClose={() => setShowCrossPool(null)}
          />
        )}
      </div>
    </Layout>
  );
};

export default VehicleRequests;
