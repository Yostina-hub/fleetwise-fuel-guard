import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ClipboardCheck, CheckCircle, XCircle, Eye } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import MaintenanceWorkflowProgress from "./MaintenanceWorkflowProgress";

const FleetOpsReviewTab = () => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [decisionFor, setDecisionFor] = useState<{ id: string; decision: "approve" | "reject" } | null>(null);
  const [notes, setNotes] = useState("");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["fleet-ops-review", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("maintenance_requests")
        .select("*, vehicle:vehicles(plate_number, make, model), driver:drivers(first_name, last_name)")
        .eq("organization_id", organizationId)
        .in("workflow_stage", ["submitted", "under_review"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, decision, notes }: { id: string; decision: string; notes: string }) => {
      const { error } = await supabase.rpc("fleet_ops_review_request", {
        p_request_id: id,
        p_decision: decision,
        p_notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fleet-ops-review"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance-requests"] });
      toast.success("Decision recorded");
      setDecisionFor(null);
      setNotes("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <Card className="glass-strong">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" /> Fleet Operations Review Queue
            <Badge variant="outline" className="ml-2">{requests.length} pending</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Step 2: Review submitted maintenance requests. Approve to move to pre-inspection or reject with reason.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request #</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Type / Priority</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    No requests awaiting fleet ops review.
                  </TableCell></TableRow>
                ) : requests.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.request_number}</TableCell>
                    <TableCell>{r.vehicle?.plate_number || "—"}</TableCell>
                    <TableCell>{r.driver ? `${r.driver.first_name} ${r.driver.last_name}` : "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs capitalize">{r.request_type}</span>
                        <Badge variant={r.priority === "critical" || r.priority === "high" ? "destructive" : "outline"} className="capitalize text-xs w-fit">
                          {r.priority}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.workflow_stage}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(r.created_at), "MMM dd, HH:mm")}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="sm" variant="default" className="gap-1" onClick={() => setDecisionFor({ id: r.id, decision: "approve" })}>
                        <CheckCircle className="w-3 h-3" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" className="gap-1" onClick={() => setDecisionFor({ id: r.id, decision: "reject" })}>
                        <XCircle className="w-3 h-3" /> Reject
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!decisionFor} onOpenChange={() => { setDecisionFor(null); setNotes(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{decisionFor?.decision === "approve" ? "Approve Request" : "Reject Request"}</DialogTitle>
            <DialogDescription>
              {decisionFor?.decision === "approve"
                ? "Forward this request to the maintenance section for pre-inspection."
                : "Provide a reason for rejecting this request. The driver will be notified."}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Textarea
              placeholder={decisionFor?.decision === "approve" ? "Optional notes…" : "Reason for rejection (required)…"}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDecisionFor(null); setNotes(""); }}>Cancel</Button>
            <Button
              variant={decisionFor?.decision === "approve" ? "default" : "destructive"}
              disabled={reviewMutation.isPending || (decisionFor?.decision === "reject" && !notes.trim())}
              onClick={() => decisionFor && reviewMutation.mutate({ id: decisionFor.id, decision: decisionFor.decision, notes })}
            >
              {reviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FleetOpsReviewTab;
