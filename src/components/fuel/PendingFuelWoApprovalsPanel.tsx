// Step 6: Fuel Work Order approvals routed via the delegation matrix.
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileCheck, Check, X, UserCheck, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

export const PendingFuelWoApprovalsPanel = () => {
  const queryClient = useQueryClient();
  const [actionDialog, setActionDialog] = useState<{ id: string; action: "approved" | "rejected"; req: any } | null>(null);
  const [comment, setComment] = useState("");

  const { data: approvals = [] } = useQuery({
    queryKey: ["my-pending-fuel-wo-approvals"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_pending_fuel_wo_approvals" as any);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, action, comment }: { id: string; action: string; comment: string }) => {
      const { data, error } = await supabase.rpc("action_fuel_wo_approval" as any, {
        p_approval_id: id,
        p_action: action,
        p_comment: comment || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["my-pending-fuel-wo-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["fuel-work-orders"] });
      setActionDialog(null);
      setComment("");
      const finalStatus = data?.final_status;
      if (finalStatus === "approved") toast.success("✓ Work order fully approved & released");
      else if (finalStatus === "rejected") toast.success("Work order rejected");
      else toast.success(`Step approved. ${data?.remaining_steps} step(s) remaining.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (approvals.length === 0) return null;

  return (
    <>
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            Pending Fuel Work Order Approvals
            <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-primary/30">
              {approvals.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>WO #</TableHead>
                  <TableHead>Request #</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Amount (ETB)</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Step / Role</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvals.map((a: any) => (
                  <TableRow key={a.approval_id}>
                    <TableCell className="font-mono text-xs">{a.work_order_number}</TableCell>
                    <TableCell className="font-mono text-xs">{a.request_number}</TableCell>
                    <TableCell className="text-xs">{a.vehicle_plate || a.generator_name || "—"}</TableCell>
                    <TableCell className="font-medium">{a.emoney_amount ? Number(a.emoney_amount).toLocaleString() : "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        a.priority === "critical" ? "bg-destructive/10 text-destructive border-destructive/30 text-[10px]"
                        : a.priority === "high" ? "bg-warning/10 text-warning border-warning/30 text-[10px]"
                        : "text-[10px]"
                      }>{a.priority || "medium"}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="font-medium">Step {a.step}</span>
                      <span className="text-muted-foreground"> · {a.approver_role?.replace("_", " ")}</span>
                    </TableCell>
                    <TableCell>
                      {a.is_delegated ? (
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-[10px]">
                          <UserCheck className="h-3 w-3 mr-1" />
                          Delegated{a.original_approver_name ? ` from ${a.original_approver_name}` : ""}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          <ShieldCheck className="h-3 w-3 mr-1" /> Direct
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(a.created_at), "MMM dd HH:mm")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="text-success hover:bg-success/10"
                          onClick={() => setActionDialog({ id: a.approval_id, action: "approved", req: a })}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10"
                          onClick={() => setActionDialog({ id: a.approval_id, action: "rejected", req: a })}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.action === "approved" ? "Approve" : "Reject"} Fuel Work Order
            </DialogTitle>
            <DialogDescription>
              {actionDialog?.req?.work_order_number} — Step {actionDialog?.req?.step} ({actionDialog?.req?.approver_role?.replace("_", " ")})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{actionDialog?.action === "rejected" ? "Reason for Rejection *" : "Approval Comment (optional)"}</Label>
              <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button
              variant={actionDialog?.action === "approved" ? "default" : "destructive"}
              onClick={() => actionDialog && actionMutation.mutate({
                id: actionDialog.id, action: actionDialog.action, comment,
              })}
              disabled={actionMutation.isPending || (actionDialog?.action === "rejected" && !comment.trim())}
            >
              {actionMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {actionDialog?.action === "approved" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
