import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle, XCircle, AlertTriangle, Clock } from "lucide-react";
import { format } from "date-fns";
import { useApprovals } from "@/hooks/useApprovals";

const actionIcons = {
  approve: CheckCircle,
  reject: XCircle,
  escalate: AlertTriangle,
  pending: Clock,
};

const actionColors = {
  approve: "bg-green-500",
  reject: "bg-red-500",
  escalate: "bg-yellow-500",
  pending: "bg-gray-500",
};

const actionLabels = {
  approve: "Approved",
  reject: "Rejected",
  escalate: "Escalated",
  pending: "Pending",
};

export const ApprovalHistory = () => {
  const { approvalHistory, loading } = useApprovals();

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading history...</div>
        </CardContent>
      </Card>
    );
  }

  if (!approvalHistory || approvalHistory.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            No approval history found
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Approval History</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request</TableHead>
              <TableHead>Purpose</TableHead>
              <TableHead>Step</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Comment</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {approvalHistory.map((approval: any) => {
              const ActionIcon = actionIcons[approval.action as keyof typeof actionIcons];
              return (
                <TableRow key={approval.id}>
                  <TableCell className="font-medium">
                    {approval.trip_request?.request_number}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate">
                      {approval.trip_request?.purpose}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">Step {approval.step}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={actionColors[approval.action as keyof typeof actionColors]}>
                      <ActionIcon className="w-3 h-3 mr-1" />
                      {actionLabels[approval.action as keyof typeof actionLabels]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {approval.acted_at && format(new Date(approval.acted_at), "MMM dd, yyyy HH:mm")}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate text-sm text-muted-foreground">
                      {approval.comment || "-"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {approval.trip_request?.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
