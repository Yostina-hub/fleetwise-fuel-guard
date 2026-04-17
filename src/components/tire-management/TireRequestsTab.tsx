import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuthContext } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardList, CheckCircle2, XCircle, Clock, Package, AlertCircle, Truck } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const STATUS_META: Record<string, { label: string; cls: string; icon: any }> = {
  pending: { label: "Pending", cls: "bg-muted text-foreground", icon: Clock },
  awaiting_return: { label: "Awaiting Old Tire Return", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Truck },
  approved: { label: "Approved", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle2 },
  rejected: { label: "Rejected", cls: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
  fulfilled: { label: "Fulfilled", cls: "bg-primary/10 text-primary border-primary/20", icon: Package },
  cancelled: { label: "Cancelled", cls: "bg-muted text-muted-foreground", icon: XCircle },
};

const RETURN_META: Record<string, { label: string; cls: string }> = {
  pending: { label: "Awaiting return", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  returned: { label: "Returned ✓", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  not_required: { label: "Not required", cls: "bg-muted text-muted-foreground" },
  failed: { label: "Failed", cls: "bg-destructive/10 text-destructive border-destructive/20" },
};

export const TireRequestsTab = () => {
  const { organizationId } = useOrganization();
  const { user, profile } = useAuthContext() as any;
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const isMaintenance = ["maintenance_manager", "maintenance_supervisor", "fleet_owner", "operations_manager", "super_admin"].includes(profile?.role);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["tire-requests", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tire_requests")
        .select("*, vehicles:vehicle_id(plate_number), drivers:driver_id(full_name), items:tire_request_items(*)")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const selected: any = requests.find((r: any) => r.id === openId);

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tire_requests")
        .update({
          status: "approved",
          approved_by: user?.id || null,
          approved_by_name: profile?.full_name || user?.email || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Request approved");
      queryClient.invalidateQueries({ queryKey: ["tire-requests"] });
      setOpenId(null);
    },
    onError: (e: any) => {
      // Surface the trigger's hard-block message clearly
      if (e?.message?.includes("Cannot approve")) toast.error(e.message);
      else toast.error(e.message);
    },
  });

  const reject = useMutation({
    mutationFn: async (id: string) => {
      if (!rejectReason.trim()) throw new Error("Rejection reason is required");
      const { error } = await supabase
        .from("tire_requests")
        .update({ status: "rejected", rejected_reason: rejectReason })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Request rejected");
      queryClient.invalidateQueries({ queryKey: ["tire-requests"] });
      setOpenId(null);
      setRejectReason("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const markReturned = useMutation({
    mutationFn: async ({ itemId, ref }: { itemId: string; ref: string }) => {
      const { error } = await supabase
        .from("tire_request_items")
        .update({
          iproc_return_status: "returned",
          iproc_return_reference: ref || `MANUAL-${Date.now()}`,
          iproc_returned_at: new Date().toISOString(),
          iproc_received_by: profile?.full_name || user?.email || null,
        })
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marked returned (manual override)");
      queryClient.invalidateQueries({ queryKey: ["tire-requests"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="space-y-3">{[...Array(3)].map((_, i) => <Card key={i} className="h-24 animate-pulse" />)}</div>;
  }

  if (requests.length === 0) {
    return (
      <Card><CardContent className="py-12 text-center text-muted-foreground">
        <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No tire requests yet.</p>
        <p className="text-xs mt-1">Click "New Request" to submit one for the maintenance group.</p>
      </CardContent></Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {requests.map((r: any) => {
          const meta = STATUS_META[r.status] || STATUS_META.pending;
          const Icon = meta.icon;
          const itemCount = r.items?.length || 0;
          const pendingReturns = (r.items || []).filter((i: any) => i.iproc_return_status === "pending").length;
          return (
            <Card key={r.id} className="cursor-pointer hover:bg-accent/30 transition-colors" onClick={() => setOpenId(r.id)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold">{r.request_number}</span>
                      <Badge className={meta.cls + " border gap-1"}><Icon className="w-3 h-3" />{meta.label}</Badge>
                      {r.priority !== "normal" && <Badge variant="outline" className="text-[10px] uppercase">{r.priority}</Badge>}
                    </div>
                    <p className="text-sm">
                      <span className="font-semibold">{r.vehicles?.plate_number || "—"}</span>
                      <span className="text-muted-foreground"> • {r.request_type} • {itemCount} position{itemCount !== 1 ? "s" : ""}</span>
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      By {r.requested_by_name || "—"} • {format(new Date(r.created_at), "MMM dd, yyyy HH:mm")}
                      {r.reason && ` • ${r.reason}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {pendingReturns > 0 ? (
                      <Badge variant="outline" className="gap-1 text-amber-600 border-amber-500/30">
                        <AlertCircle className="w-3 h-3" /> {pendingReturns} return{pendingReturns !== 1 ? "s" : ""} pending
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-emerald-600 border-emerald-500/30">All returned</Badge>
                    )}
                    {r.estimated_cost && <p className="text-xs text-muted-foreground mt-1">~{Number(r.estimated_cost).toLocaleString()} ETB</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Sheet open={!!openId} onOpenChange={(o) => { if (!o) { setOpenId(null); setRejectReason(""); } }}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <span className="font-mono">{selected.request_number}</span>
                  <Badge className={(STATUS_META[selected.status] || STATUS_META.pending).cls + " border"}>
                    {(STATUS_META[selected.status] || STATUS_META.pending).label}
                  </Badge>
                </SheetTitle>
                <SheetDescription>
                  {selected.vehicles?.plate_number} • {selected.request_type} • Requested by {selected.requested_by_name || "—"}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Priority:</span> <span className="font-medium capitalize">{selected.priority}</span></div>
                  <div><span className="text-muted-foreground">Created:</span> <span className="font-medium">{format(new Date(selected.created_at), "MMM dd, yyyy HH:mm")}</span></div>
                  {selected.reason && <div className="col-span-2"><span className="text-muted-foreground">Reason:</span> <span className="font-medium">{selected.reason}</span></div>}
                  {selected.notes && <div className="col-span-2"><span className="text-muted-foreground">Notes:</span> <span>{selected.notes}</span></div>}
                  {selected.rejected_reason && <div className="col-span-2 text-destructive"><span className="font-medium">Rejected:</span> {selected.rejected_reason}</div>}
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2">Items & iPROC Return Status</h3>
                  <div className="space-y-2">
                    {(selected.items || []).map((it: any) => {
                      const rmeta = RETURN_META[it.iproc_return_status] || RETURN_META.pending;
                      return (
                        <div key={it.id} className="rounded-md border p-3 text-sm space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{it.position}</span>
                            <Badge className={rmeta.cls + " border"}>{rmeta.label}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            {it.tire_size && <div>Size: {it.tire_size}</div>}
                            {(it.preferred_brand || it.preferred_model) && <div>Preferred: {it.preferred_brand} {it.preferred_model}</div>}
                            {it.iproc_return_reference && <div>iPROC ref: <span className="font-mono">{it.iproc_return_reference}</span></div>}
                            {it.iproc_warehouse && <div>Warehouse: {it.iproc_warehouse}</div>}
                            {it.iproc_returned_at && <div>Returned at: {format(new Date(it.iproc_returned_at), "MMM dd, yyyy HH:mm")}</div>}
                            {it.return_skip_reason && <div>Skipped: {it.return_skip_reason}</div>}
                          </div>
                          {isMaintenance && it.iproc_return_status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => {
                                const ref = prompt("Enter iPROC return reference (or leave blank for manual override):") ?? "";
                                markReturned.mutate({ itemId: it.id, ref });
                              }}
                            >
                              Mark returned (override)
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {isMaintenance && ["pending", "awaiting_return"].includes(selected.status) && (
                  <div className="space-y-3 border-t pt-4">
                    <div>
                      <Label className="text-xs">Reject reason (if rejecting)</Label>
                      <Textarea rows={2} value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 gap-2"
                        onClick={() => approve.mutate(selected.id)}
                        disabled={approve.isPending}
                      >
                        <CheckCircle2 className="w-4 h-4" /> Approve
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1 gap-2"
                        onClick={() => reject.mutate(selected.id)}
                        disabled={reject.isPending || !rejectReason.trim()}
                      >
                        <XCircle className="w-4 h-4" /> Reject
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Approval is blocked by the system until every previous tire is marked <strong>Returned</strong> in iPROC.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};
