import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle, XCircle, Clock, AlertCircle, Calendar, Users } from "lucide-react";
import { format, differenceInHours } from "date-fns";
import { useApprovals } from "@/hooks/useApprovals";
import { Label } from "@/components/ui/label";

interface ApprovalDialogData {
  approvalId: string;
  requestId: string;
  requestNumber: string;
  purpose: string;
  action: 'approve' | 'reject';
}

export const ApprovalsInbox = () => {
  const { pendingApprovals, loading, approveRequest, rejectRequest } = useApprovals();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogData, setDialogData] = useState<ApprovalDialogData | null>(null);
  const [comment, setComment] = useState("");
  const [processing, setProcessing] = useState(false);

  const openApprovalDialog = (approval: any, action: 'approve' | 'reject') => {
    setDialogData({
      approvalId: approval.id,
      requestId: approval.trip_request_id,
      requestNumber: approval.trip_request?.request_number,
      purpose: approval.trip_request?.purpose,
      action,
    });
    setComment("");
    setDialogOpen(true);
  };

  const handleSubmitDecision = async () => {
    if (!dialogData) return;

    setProcessing(true);
    try {
      if (dialogData.action === 'approve') {
        await approveRequest.mutateAsync({
          approvalId: dialogData.approvalId,
          requestId: dialogData.requestId,
          comment,
        });
      } else {
        await rejectRequest.mutateAsync({
          approvalId: dialogData.approvalId,
          requestId: dialogData.requestId,
          comment: comment || "Request rejected",
        });
      }
      setDialogOpen(false);
      setComment("");
    } finally {
      setProcessing(false);
    }
  };

  const getSLAStatus = (slaDeadline: string | null) => {
    if (!slaDeadline) return { label: "No SLA", color: "bg-gray-500" };
    
    const hoursRemaining = differenceInHours(new Date(slaDeadline), new Date());
    
    if (hoursRemaining < 0) {
      return { label: "Overdue", color: "bg-red-500" };
    } else if (hoursRemaining < 4) {
      return { label: `${hoursRemaining}h remaining`, color: "bg-orange-500" };
    } else {
      return { label: `${hoursRemaining}h remaining`, color: "bg-green-500" };
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading approvals...</div>
        </CardContent>
      </Card>
    );
  }

  if (!pendingApprovals || pendingApprovals.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            No pending approvals. All caught up! ✓
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Pending Approvals ({pendingApprovals.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Step</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingApprovals.map((approval: any) => {
                const sla = getSLAStatus(approval.trip_request?.sla_deadline_at);
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
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(approval.trip_request?.pickup_at), "MMM dd, HH:mm")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="w-3 h-3" />
                        {approval.trip_request?.profiles?.email?.split('@')[0]}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">Step {approval.step}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={sla.color}>
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {sla.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => openApprovalDialog(approval, 'approve')}
                          disabled={processing}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openApprovalDialog(approval, 'reject')}
                          disabled={processing}
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Approval Decision Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogData?.action === 'approve' ? 'Approve' : 'Reject'} Trip Request
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Request</Label>
              <div className="text-lg font-semibold">{dialogData?.requestNumber}</div>
            </div>

            <div>
              <Label className="text-sm font-medium text-muted-foreground">Purpose</Label>
              <div>{dialogData?.purpose}</div>
            </div>

            <div>
              <Label htmlFor="comment">
                {dialogData?.action === 'reject' ? 'Rejection Reason *' : 'Comment (Optional)'}
              </Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  dialogData?.action === 'reject'
                    ? "Please provide a reason for rejection"
                    : "Add any comments or notes"
                }
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitDecision}
              disabled={processing || (dialogData?.action === 'reject' && !comment)}
              variant={dialogData?.action === 'approve' ? 'default' : 'destructive'}
            >
              {processing ? 'Processing...' : dialogData?.action === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
