import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  CheckCircle, XCircle, Clock, ArrowRight, Loader2, 
  ShieldCheck, SkipForward, UserCheck
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface WorkOrderApprovalFlowProps {
  workOrderId: string;
  totalCost?: number;
}

const STATUS_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  pending: { icon: Clock, color: "text-yellow-500", label: "Pending" },
  approved: { icon: CheckCircle, color: "text-emerald-500", label: "Approved" },
  rejected: { icon: XCircle, color: "text-red-500", label: "Rejected" },
  delegated: { icon: UserCheck, color: "text-blue-500", label: "Delegated" },
  skipped: { icon: SkipForward, color: "text-muted-foreground", label: "Auto-Approved" },
};

const WorkOrderApprovalFlow = ({ workOrderId, totalCost }: WorkOrderApprovalFlowProps) => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [comments, setComments] = useState<Record<string, string>>({});

  const { data: approvals = [], isLoading } = useQuery({
    queryKey: ["wo-approvals", workOrderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_order_approvals")
        .select("*, approval_levels!inner(level_name, level_order, role)")
        .eq("work_order_id", workOrderId)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!workOrderId,
  });

  const { data: currentUser } = useQuery({
    queryKey: ["current-user-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const decideMutation = useMutation({
    mutationFn: async ({ id, status, comment }: { id: string; status: 'approved' | 'rejected'; comment?: string }) => {
      const { error } = await supabase
        .from("work_order_approvals")
        .update({
          status,
          decision_at: new Date().toISOString(),
          approver_id: currentUser?.id,
          comments: comment || null,
        })
        .eq("id", id);
      if (error) throw error;

      // If all steps approved, update work order
      if (status === 'approved') {
        const pending = approvals.filter(a => a.id !== id && a.status === 'pending');
        if (pending.length === 0) {
          await supabase
            .from("work_orders")
            .update({ approval_status: "approved", approved_by: currentUser?.id, approved_at: new Date().toISOString() })
            .eq("id", workOrderId);
        }
      } else if (status === 'rejected') {
        await supabase
          .from("work_orders")
          .update({ approval_status: "rejected" })
          .eq("id", workOrderId);
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["wo-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["work-orders"] });
      toast.success(vars.status === 'approved' ? "Step approved" : "Work order rejected");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const initiateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("initiate_work_order_approval", {
        p_work_order_id: workOrderId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wo-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["work-orders"] });
      toast.success("Approval chain initiated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (approvals.length === 0) {
    return (
      <div className="text-center py-6 space-y-3">
        <ShieldCheck className="w-8 h-8 mx-auto text-muted-foreground opacity-40" />
        <p className="text-sm text-muted-foreground">No approval chain started</p>
        {totalCost != null && totalCost > 0 && (
          <Button size="sm" onClick={() => initiateMutation.mutate()} disabled={initiateMutation.isPending}>
            {initiateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            Start Approval (Cost: {totalCost.toLocaleString()} ETB)
          </Button>
        )}
      </div>
    );
  }

  const canActOn = (approval: any) => {
    if (approval.status !== 'pending') return false;
    if (!currentUser) return false;
    return approval.approver_id === currentUser.id || approval.delegated_to === currentUser.id;
  };

  return (
    <div className="space-y-1">
      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-primary" />
        Approval Chain
      </h4>
      
      <div className="relative">
        {/* Vertical connector line */}
        <div className="absolute left-5 top-6 bottom-6 w-0.5 bg-border" />
        
        <div className="space-y-4">
          {approvals.map((approval: any, idx: number) => {
            const config = STATUS_CONFIG[approval.status] || STATUS_CONFIG.pending;
            const Icon = config.icon;
            const levelInfo = approval.approval_levels;
            const isActionable = canActOn(approval);

            return (
              <div key={approval.id} className="relative flex items-start gap-3 pl-1">
                {/* Step indicator */}
                <div className={cn(
                  "relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 bg-background",
                  approval.status === 'approved' && "border-emerald-500",
                  approval.status === 'rejected' && "border-red-500",
                  approval.status === 'pending' && "border-yellow-500",
                  approval.status === 'skipped' && "border-muted",
                  approval.status === 'delegated' && "border-blue-500",
                )}>
                  <Icon className={cn("w-4 h-4", config.color)} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{levelInfo?.level_name || `Step ${idx + 1}`}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">{levelInfo?.role?.replace('_', ' ')}</Badge>
                    <Badge variant={approval.status === 'approved' ? 'default' : 'secondary'} className="text-[10px]">
                      {config.label}
                    </Badge>
                  </div>

                  {approval.decision_at && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {format(new Date(approval.decision_at), "MMM d, yyyy h:mm a")}
                    </p>
                  )}

                  {approval.comments && (
                    <p className="text-xs text-muted-foreground mt-1 italic">"{approval.comments}"</p>
                  )}

                  {approval.delegated_to && (
                    <p className="text-xs text-blue-400 mt-1 flex items-center gap-1">
                      <ArrowRight className="w-3 h-3" /> Delegated
                    </p>
                  )}

                  {/* Action buttons for current approver */}
                  {isActionable && (
                    <div className="mt-2 space-y-2">
                      <Textarea
                        placeholder="Comments (optional)..."
                        value={comments[approval.id] || ""}
                        onChange={e => setComments(c => ({ ...c, [approval.id]: e.target.value }))}
                        rows={2}
                        className="text-xs"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="gap-1 h-7 text-xs"
                          onClick={() => decideMutation.mutate({ id: approval.id, status: 'approved', comment: comments[approval.id] })}
                          disabled={decideMutation.isPending}
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-1 h-7 text-xs"
                          onClick={() => decideMutation.mutate({ id: approval.id, status: 'rejected', comment: comments[approval.id] })}
                          disabled={decideMutation.isPending}
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WorkOrderApprovalFlow;
