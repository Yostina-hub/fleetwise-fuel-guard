import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, User } from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ApprovalFlowViewerProps {
  requestId: string;
}

export const ApprovalFlowViewer = ({ requestId }: ApprovalFlowViewerProps) => {
  const { data: approvals, isLoading } = useQuery({
    queryKey: ["approval-flow", requestId],
    queryFn: async () => {
      // 1. Load the approval steps. (No PostgREST FK to profiles, so we hydrate manually.)
      const { data: rows, error } = await supabase
        .from("trip_approvals" as any)
        .select("*")
        .eq("trip_request_id", requestId)
        .order("step");

      if (error) throw error;
      const approvalRows = (rows as any[]) || [];
      if (approvalRows.length === 0) return [];

      // 2. Resolve approver names via profiles (one round-trip).
      const approverIds = Array.from(
        new Set(approvalRows.map((r) => r.approver_id).filter(Boolean)),
      );

      let profileById = new Map<string, { full_name: string | null; email: string | null }>();
      if (approverIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles" as any)
          .select("id, full_name, email")
          .in("id", approverIds);
        (profiles as any[] | null)?.forEach((p) => {
          profileById.set(p.id, { full_name: p.full_name, email: p.email });
        });
      }

      return approvalRows.map((r) => ({
        ...r,
        approver_name:
          profileById.get(r.approver_id)?.full_name ||
          profileById.get(r.approver_id)?.email?.split("@")[0] ||
          "Unknown",
        approver_email: profileById.get(r.approver_id)?.email || null,
      }));
    },
    enabled: !!requestId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-sm text-muted-foreground">
            Loading approval history...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!approvals || approvals.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-sm text-muted-foreground">
            No approval steps recorded yet
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (action: string) => {
    switch (action) {
      case "approve":
      case "approved":
        return <CheckCircle className="w-5 h-5 text-success" />;
      case "reject":
      case "rejected":
        return <XCircle className="w-5 h-5 text-destructive" />;
      case "pending":
        return <Clock className="w-5 h-5 text-warning" />;
      default:
        return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusStyles = (action: string) => {
    switch (action) {
      case "approve":
      case "approved":
        return "border-success/40 bg-success/5";
      case "reject":
      case "rejected":
        return "border-destructive/40 bg-destructive/5";
      case "pending":
        return "border-warning/40 bg-warning/5";
      default:
        return "border-border bg-muted/40";
    }
  };

  const getStatusLabel = (action: string) => {
    switch (action) {
      case "approve":
      case "approved":
        return "Approved";
      case "reject":
      case "rejected":
        return "Rejected";
      case "pending":
        return "Awaiting Approval";
      default:
        return action;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Approval History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {approvals.map((approval: any, index: number) => (
            <div key={approval.id}>
              <div
                className={`p-4 rounded-lg border-2 ${getStatusStyles(approval.action)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getStatusIcon(approval.action)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <Badge variant="outline">Step {approval.step}</Badge>
                      <span className="font-medium text-sm">
                        {getStatusLabel(approval.action)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-foreground mb-1">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-medium">{approval.approver_name}</span>
                      {approval.approver_email && (
                        <span className="text-xs text-muted-foreground truncate">
                          ({approval.approver_email})
                        </span>
                      )}
                    </div>

                    {approval.acted_at && (
                      <div className="text-xs text-muted-foreground">
                        {approval.action === "approve" || approval.action === "approved"
                          ? "Approved on "
                          : approval.action === "reject" || approval.action === "rejected"
                          ? "Rejected on "
                          : "Updated on "}
                        {format(new Date(approval.acted_at), "MMM dd, yyyy 'at' HH:mm")}
                      </div>
                    )}

                    {approval.comment && (
                      <div className="text-sm mt-2 p-2 bg-background/60 rounded border">
                        <span className="font-medium">Comment: </span>
                        {approval.comment}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {index < approvals.length - 1 && (
                <div className="flex justify-center">
                  <div className="w-0.5 h-4 bg-border" />
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
