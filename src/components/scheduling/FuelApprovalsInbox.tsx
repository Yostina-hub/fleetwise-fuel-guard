import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { CheckCircle, XCircle, Fuel, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useApprovals } from "@/hooks/useApprovals";
import { Label } from "@/components/ui/label";
import { TablePagination, usePagination } from "@/components/reports/TablePagination";
import { useVehicles } from "@/hooks/useVehicles";
import { useDrivers } from "@/hooks/useDrivers";

interface FuelApprovalDialogData {
  approvalId: string;
  fuelRequestId: string;
  requestNumber: string;
  litersRequested: number;
  action: "approve" | "reject";
}

export const FuelApprovalsInbox = () => {
  const { pendingFuelApprovals, loading, approveFuelRequest, rejectFuelRequest } = useApprovals();
  const { vehicles } = useVehicles();
  const { drivers } = useDrivers();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogData, setDialogData] = useState<FuelApprovalDialogData | null>(null);
  const [comment, setComment] = useState("");
  const [litersApproved, setLitersApproved] = useState("");
  const [processing, setProcessing] = useState(false);
  const { currentPage, setCurrentPage, startIndex, endIndex } = usePagination(pendingFuelApprovals?.length || 0, 10);

  const getPlate = (id: string) => vehicles.find(v => v.id === id)?.plate_number || "—";
  const getDriverName = (id?: string | null) => {
    if (!id) return "—";
    const d = drivers.find(dr => dr.id === id);
    return d ? `${d.first_name} ${d.last_name}` : "—";
  };

  const openDialog = (approval: any, action: "approve" | "reject") => {
    setDialogData({
      approvalId: approval.id,
      fuelRequestId: approval.fuel_request_id,
      requestNumber: approval.fuel_request?.request_number,
      litersRequested: approval.fuel_request?.liters_requested,
      action,
    });
    setComment("");
    setLitersApproved(String(approval.fuel_request?.liters_requested || ""));
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!dialogData) return;
    setProcessing(true);
    try {
      if (dialogData.action === "approve") {
        await approveFuelRequest.mutateAsync({
          approvalId: dialogData.approvalId,
          fuelRequestId: dialogData.fuelRequestId,
          comment,
          litersApproved: parseFloat(litersApproved) || undefined,
        });
      } else {
        await rejectFuelRequest.mutateAsync({
          approvalId: dialogData.approvalId,
          fuelRequestId: dialogData.fuelRequestId,
          comment: comment || "Fuel request rejected",
        });
      }
      setDialogOpen(false);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pendingFuelApprovals || pendingFuelApprovals.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            No pending fuel approvals. ✓
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
            <Fuel className="w-5 h-5" />
            Pending Fuel Approvals ({pendingFuelApprovals.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Request #</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Fuel Type</TableHead>
                  <TableHead>Liters</TableHead>
                  <TableHead>Est. Cost</TableHead>
                  <TableHead>Step</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingFuelApprovals.slice(startIndex, endIndex).map((approval: any) => (
                  <TableRow key={approval.id}>
                    <TableCell className="font-mono text-sm">
                      {approval.fuel_request?.request_number}
                    </TableCell>
                    <TableCell>{getPlate(approval.fuel_request?.vehicle_id)}</TableCell>
                    <TableCell>{getDriverName(approval.fuel_request?.driver_id)}</TableCell>
                    <TableCell className="capitalize">{approval.fuel_request?.fuel_type}</TableCell>
                    <TableCell>{approval.fuel_request?.liters_requested} L</TableCell>
                    <TableCell>{approval.fuel_request?.estimated_cost ? `${approval.fuel_request.estimated_cost}` : "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">Step {approval.step}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="default" onClick={() => openDialog(approval, "approve")} disabled={processing}>
                          <CheckCircle className="w-3 h-3 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => openDialog(approval, "reject")} disabled={processing}>
                          <XCircle className="w-3 h-3 mr-1" /> Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <TablePagination currentPage={currentPage} totalItems={pendingFuelApprovals.length} itemsPerPage={10} onPageChange={setCurrentPage} />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogData?.action === "approve" ? "Approve" : "Reject"} Fuel Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Request</Label>
              <div className="text-lg font-semibold">{dialogData?.requestNumber}</div>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Liters Requested</Label>
              <div>{dialogData?.litersRequested} L</div>
            </div>
            {dialogData?.action === "approve" && (
              <div>
                <Label htmlFor="liters">Liters to Approve</Label>
                <Input id="liters" type="number" step="0.1" value={litersApproved} onChange={e => setLitersApproved(e.target.value)} />
              </div>
            )}
            <div>
              <Label htmlFor="fuel-comment">
                {dialogData?.action === "reject" ? "Rejection Reason *" : "Comment (Optional)"}
              </Label>
              <Textarea
                id="fuel-comment"
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder={dialogData?.action === "reject" ? "Reason for rejection" : "Add comments"}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={processing}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={processing || (dialogData?.action === "reject" && !comment)}
              variant={dialogData?.action === "approve" ? "default" : "destructive"}
            >
              {processing ? "Processing..." : dialogData?.action === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
