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
      const { data, error } = await supabase
        .from("trip_approvals" as any)
        .select(`
          *,
          approver:approver_id(email, profiles(full_name))
        `)
        .eq("trip_request_id", requestId)
        .order("step");

      if (error) throw error;
      return data as any;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-sm text-muted-foreground">
            Loading approval flow...
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
            No approval steps configured
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (action: string) => {
    switch (action) {
      case "approve":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "reject":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (action: string) => {
    switch (action) {
      case "approve":
        return "border-green-500 bg-green-50";
      case "reject":
        return "border-red-500 bg-red-50";
      case "pending":
        return "border-yellow-500 bg-yellow-50";
      default:
        return "border-gray-300 bg-gray-50";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Approval Flow</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {approvals.map((approval: any, index: number) => (
            <div key={approval.id}>
              <div
                className={`p-4 rounded-lg border-2 ${getStatusColor(approval.action)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getStatusIcon(approval.action)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">Step {approval.step}</Badge>
                      <span className="font-medium text-sm">
                        {approval.action === "pending" ? "Awaiting Approval" : 
                         approval.action === "approve" ? "Approved" : "Rejected"}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <User className="w-3 h-3" />
                      <span>
                        {approval.approver?.profiles?.full_name || 
                         approval.approver?.email?.split('@')[0] || 
                         "Unknown"}
                      </span>
                    </div>

                    {approval.acted_at && (
                      <div className="text-xs text-muted-foreground mb-2">
                        {format(new Date(approval.acted_at), "MMM dd, yyyy 'at' HH:mm")}
                      </div>
                    )}

                    {approval.comment && (
                      <div className="text-sm mt-2 p-2 bg-white rounded border">
                        <span className="font-medium">Comment: </span>
                        {approval.comment}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Connector line */}
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
