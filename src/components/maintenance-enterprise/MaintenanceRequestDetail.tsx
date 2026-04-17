import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle, XCircle, Wrench, Truck, ClipboardCheck,
  AlertTriangle, FileText, DollarSign, Package, Eye, Loader2, Send
} from "lucide-react";
import { MaintenanceRequest, WorkflowStage } from "@/hooks/useMaintenanceRequests";
import MaintenanceWorkflowProgress from "./MaintenanceWorkflowProgress";
import MaintenanceWorkflowTimeline from "./MaintenanceWorkflowTimeline";
import DriverWorkflowActions from "./DriverWorkflowActions";
import { format } from "date-fns";

interface Props {
  request: MaintenanceRequest;
  onAction: (action: string, data?: any) => void;
  isPending?: boolean;
  drivers?: { id: string; first_name: string; last_name: string }[];
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-500/20 text-blue-400",
  approved: "bg-green-500/20 text-green-400",
  rejected: "bg-red-500/20 text-red-400",
  work_order_created: "bg-cyan-500/20 text-cyan-400",
  in_progress: "bg-yellow-500/20 text-yellow-400",
  completed: "bg-emerald-500/20 text-emerald-400",
};

const MaintenanceRequestDetail = ({ request: req, onAction, isPending, drivers = [] }: Props) => {
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [needsMaint, setNeedsMaint] = useState("yes");
  const [supplierName, setSupplierName] = useState("");
  const [variationNotes, setVariationNotes] = useState("");
  const [inspectorId, setInspectorId] = useState("");
  const [postResult, setPostResult] = useState("pass");
  const [postNotes, setPostNotes] = useState("");
  const [correctionNotes, setCorrectionNotes] = useState("");

  const stage = (req.workflow_stage || req.status) as WorkflowStage;

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      {/* Workflow Progress */}
      <MaintenanceWorkflowProgress currentStage={stage} />

      <Separator />

      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><span className="text-muted-foreground">Request #:</span> <span className="font-mono">{req.request_number}</span></div>
        <div><span className="text-muted-foreground">Status:</span> <Badge className={statusColors[req.status]} variant="outline">{req.status.replace(/_/g, " ")}</Badge></div>
        <div><span className="text-muted-foreground">Type:</span> <span className="capitalize">{req.request_type}</span></div>
        <div><span className="text-muted-foreground">Priority:</span> <span className="capitalize">{req.priority}</span></div>
        <div><span className="text-muted-foreground">Vehicle:</span> {req.vehicle?.plate_number || "—"}</div>
        <div><span className="text-muted-foreground">Driver:</span> {req.driver ? `${req.driver.first_name} ${req.driver.last_name}` : "—"}</div>
        <div><span className="text-muted-foreground">KM:</span> {req.km_reading ? Number(req.km_reading).toLocaleString() : "—"}</div>
        <div><span className="text-muted-foreground">Hours:</span> {req.running_hours || "—"}</div>
        <div><span className="text-muted-foreground">Created:</span> {format(new Date(req.created_at), "MMM dd, yyyy HH:mm")}</div>
        {req.requestor_department && <div><span className="text-muted-foreground">Dept:</span> {req.requestor_department}</div>}
      </div>

      {req.description && (
        <div className="text-sm">
          <span className="text-muted-foreground">Description:</span>
          <p className="mt-1 p-2 rounded bg-muted/30">{req.description}</p>
        </div>
      )}

      {/* Rejection */}
      {req.rejection_reason && (
        <div className="p-3 rounded bg-destructive/10 border border-destructive/20 text-sm">
          <AlertTriangle className="w-4 h-4 inline mr-1 text-destructive" /> <strong>Rejected:</strong> {req.rejection_reason}
        </div>
      )}

      {/* Pre-inspection done info */}
      {req.pre_inspection_done && (
        <div className="p-3 rounded bg-primary/10 border border-primary/20 text-sm space-y-1">
          <div className="font-medium flex items-center gap-1"><ClipboardCheck className="w-4 h-4" /> Pre-Inspection Completed</div>
          {req.pre_inspection_at && <div className="text-xs text-muted-foreground">At: {format(new Date(req.pre_inspection_at), "MMM dd, HH:mm")}</div>}
          {req.pre_inspection_notes && <p>{req.pre_inspection_notes}</p>}
          <div>Needs Maintenance: <Badge variant="outline">{req.needs_maintenance ? "Yes" : "No"}</Badge></div>
        </div>
      )}

      {/* Supplier info */}
      {req.supplier_name && (
        <div className="p-3 rounded bg-cyan-500/10 border border-cyan-500/20 text-sm space-y-1">
          <div className="font-medium flex items-center gap-1"><Truck className="w-4 h-4" /> Supplier: {req.supplier_name}</div>
          {req.vehicle_delivered_at && <div className="text-xs text-muted-foreground">Delivered: {format(new Date(req.vehicle_delivered_at), "MMM dd, HH:mm")}</div>}
        </div>
      )}

      {/* Variation info */}
      {req.variation_requested && (
        <div className="p-3 rounded bg-warning/10 border border-warning/20 text-sm space-y-1">
          <div className="font-medium flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> WO Variation Requested</div>
          {req.variation_notes && <p>{req.variation_notes}</p>}
          {req.variation_accepted !== null && (
            <div>Decision: <Badge variant="outline">{req.variation_accepted ? "Accepted" : "Rejected"}</Badge></div>
          )}
        </div>
      )}

      {/* Post-inspection info */}
      {req.post_inspection_result && (
        <div className={`p-3 rounded text-sm space-y-1 ${req.post_inspection_result === "pass" ? "bg-success/10 border border-success/20" : "bg-destructive/10 border border-destructive/20"}`}>
          <div className="font-medium flex items-center gap-1"><ClipboardCheck className="w-4 h-4" /> Post-Inspection: {req.post_inspection_result.toUpperCase()}</div>
          {req.post_inspection_notes && <p>{req.post_inspection_notes}</p>}
        </div>
      )}

      {/* Correction info */}
      {req.correction_notes && (
        <div className="p-3 rounded bg-orange-500/10 border border-orange-500/20 text-sm">
          <AlertTriangle className="w-4 h-4 inline mr-1" /> <strong>Correction Required:</strong> {req.correction_notes}
        </div>
      )}

      {/* Delivery info */}
      {req.vehicle_received_at && (
        <div className="p-3 rounded bg-success/10 border border-success/20 text-sm">
          <CheckCircle className="w-4 h-4 inline mr-1 text-success" /> Vehicle received: {format(new Date(req.vehicle_received_at), "MMM dd, HH:mm")}
        </div>
      )}

      <Separator />

      {/* Driver geofence-verified actions (delivery / receipt) */}
      <DriverWorkflowActions request={req} />

      {/* ============ ACTION PANELS based on workflow_stage ============ */}

      {/* Step 2: Fleet Review → move to pre-inspection */}
      {(stage === "submitted" || stage === "under_review") && (
        <div className="space-y-3 p-3 rounded border border-primary/20 bg-primary/5">
          <h4 className="font-medium text-sm flex items-center gap-1"><Eye className="w-4 h-4" /> Fleet Operations Review</h4>
          <p className="text-xs text-muted-foreground">Review the request and schedule pre-inspection, or approve/reject directly.</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => onAction("review")} disabled={isPending}>
              <Send className="w-4 h-4 mr-1" /> Send to Pre-Inspection
            </Button>
            <Button size="sm" variant="default" className="bg-success hover:bg-success/80" onClick={() => onAction("approve")} disabled={isPending}>
              <CheckCircle className="w-4 h-4 mr-1" /> Approve Directly
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onAction("reject")} disabled={isPending}>
              <XCircle className="w-4 h-4 mr-1" /> Reject
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Pre-Inspection */}
      {stage === "pre_inspection" && (
        <div className="space-y-3 p-3 rounded border border-primary/20 bg-primary/5">
          <h4 className="font-medium text-sm flex items-center gap-1"><ClipboardCheck className="w-4 h-4" /> Pre-Inspection (Step 4)</h4>
          <div>
            <Label>Needs Maintenance?</Label>
            <Select value={needsMaint} onValueChange={setNeedsMaint}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes — Proceed to WO</SelectItem>
                <SelectItem value="no">No — Inform Requester</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Inspection Notes</Label>
            <Textarea value={inspectionNotes} onChange={e => setInspectionNotes(e.target.value)} placeholder="Findings..." rows={2} />
          </div>
          <Button onClick={() => onAction("pre_inspection", { needs_maintenance: needsMaint === "yes", notes: inspectionNotes })} disabled={isPending}>
            <ClipboardCheck className="w-4 h-4 mr-1" /> Submit Pre-Inspection
          </Button>
        </div>
      )}

      {/* Step 6: WO Preparation → Approve & deliver */}
      {(stage === "wo_preparation" || stage === "pending_approval" || stage === "approved") && (
        <div className="space-y-3 p-3 rounded border border-cyan-500/20 bg-cyan-500/5">
          <h4 className="font-medium text-sm flex items-center gap-1"><Wrench className="w-4 h-4" /> WO Approved — Deliver to Supplier (Step 7b)</h4>
          <div>
            <Label>Supplier Name *</Label>
            <Input value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="e.g. ABC Auto Service" />
          </div>
          <Button onClick={() => {
            if (!supplierName.trim()) return;
            onAction("deliver_supplier", { supplier_name: supplierName });
          }} disabled={isPending || !supplierName.trim()}>
            <Truck className="w-4 h-4 mr-1" /> Deliver Vehicle to Supplier
          </Button>
        </div>
      )}

      {/* Step 9-10: Supplier maintenance → variation or inspector */}
      {stage === "supplier_maintenance" && (
        <div className="space-y-3 p-3 rounded border border-warning/20 bg-warning/5">
          <h4 className="font-medium text-sm flex items-center gap-1"><Wrench className="w-4 h-4" /> Supplier Maintenance In Progress</h4>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => onAction("assign_inspector_panel")}>
              <ClipboardCheck className="w-4 h-4 mr-1" /> Assign Inspector (Step 11)
            </Button>
            <Button size="sm" variant="outline" onClick={() => onAction("variation_panel")}>
              <AlertTriangle className="w-4 h-4 mr-1" /> Report Variation (Step 10)
            </Button>
          </div>

          {/* Inline: Assign Inspector */}
          <div className="mt-2 space-y-2">
            <Label>Assign Fleet Inspector</Label>
            <Select value={inspectorId} onValueChange={setInspectorId}>
              <SelectTrigger><SelectValue placeholder="Select inspector" /></SelectTrigger>
              <SelectContent>
                {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => onAction("assign_inspector", { inspector_id: inspectorId })} disabled={!inspectorId || isPending}>
              Assign
            </Button>
          </div>

          <Separator />
          <div className="space-y-2">
            <Label>WO Variation Notes</Label>
            <Textarea value={variationNotes} onChange={e => setVariationNotes(e.target.value)} placeholder="Describe the variation..." rows={2} />
            <Button size="sm" variant="outline" onClick={() => onAction("submit_variation", { notes: variationNotes })} disabled={!variationNotes.trim() || isPending}>
              Submit Variation
            </Button>
          </div>
        </div>
      )}

      {/* Step 11: Variation Review */}
      {stage === "variation_review" && (
        <div className="space-y-3 p-3 rounded border border-warning/20 bg-warning/5">
          <h4 className="font-medium text-sm flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Variation Review (Step 11)</h4>
          <p className="text-sm">{req.variation_notes}</p>
          <div className="flex gap-2">
            <Button size="sm" className="bg-success hover:bg-success/80" onClick={() => onAction("accept_variation")} disabled={isPending}>
              <CheckCircle className="w-4 h-4 mr-1" /> Accept Variation
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onAction("reject_variation")} disabled={isPending}>
              <XCircle className="w-4 h-4 mr-1" /> Reject — Send for Correction
            </Button>
          </div>
        </div>
      )}

      {/* Step 15: Post-Maintenance Inspection */}
      {stage === "inspector_assigned" && (
        <div className="space-y-3 p-3 rounded border border-primary/20 bg-primary/5">
          <h4 className="font-medium text-sm flex items-center gap-1"><ClipboardCheck className="w-4 h-4" /> Post-Maintenance Inspection (Step 15)</h4>
          <div>
            <Label>Result</Label>
            <Select value={postResult} onValueChange={setPostResult}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pass">Pass — Accept</SelectItem>
                <SelectItem value="fail">Fail — Send for Correction</SelectItem>
                <SelectItem value="conditional">Conditional Pass</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={postNotes} onChange={e => setPostNotes(e.target.value)} placeholder="Inspection findings..." rows={2} />
          </div>
          <Button onClick={() => onAction("post_inspection", { result: postResult, notes: postNotes })} disabled={isPending}>
            Submit Post-Inspection
          </Button>
        </div>
      )}

      {/* Step 16: Payment pending → supplier sends docs */}
      {stage === "payment_pending" && (
        <div className="space-y-3 p-3 rounded border border-emerald-500/20 bg-emerald-500/5">
          <h4 className="font-medium text-sm flex items-center gap-1"><DollarSign className="w-4 h-4" /> Payment & Delivery Docs (Step 16-17)</h4>
          <p className="text-xs text-muted-foreground">Supplier sends maintenance report and invoice.</p>
          <Button onClick={() => onAction("supplier_docs")} disabled={isPending}>
            <FileText className="w-4 h-4 mr-1" /> Mark Docs Received → Delivery Check
          </Button>
        </div>
      )}

      {/* Step 28: Delivery Check */}
      {stage === "delivery_check" && (
        <div className="space-y-3 p-3 rounded border border-primary/20 bg-primary/5">
          <h4 className="font-medium text-sm flex items-center gap-1"><FileText className="w-4 h-4" /> Delivery Check (Step 28)</h4>
          <p className="text-xs text-muted-foreground">Check entry and delivery time, file the document.</p>
          <div className="flex gap-2">
            <Button size="sm" className="bg-success hover:bg-success/80" onClick={() => onAction("delivery_ok")} disabled={isPending}>
              <CheckCircle className="w-4 h-4 mr-1" /> Acceptable
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onAction("delivery_fail")} disabled={isPending}>
              <XCircle className="w-4 h-4 mr-1" /> Not Acceptable
            </Button>
          </div>
        </div>
      )}

      {/* Step 23: Vehicle Received — driver already confirmed via geofence RPC, advance to files step */}
      {stage === "vehicle_received" && req.status !== "completed" && (
        <div className="space-y-3 p-3 rounded border border-success/20 bg-success/5">
          <h4 className="font-medium text-sm flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Vehicle Received (Step 23)</h4>
          <p className="text-xs text-muted-foreground">
            {req.vehicle_received_at ? "Driver confirmed receipt. Proceed to file update." : "Mark vehicle as received from supplier."}
          </p>
          <Button onClick={() => onAction("receive_vehicle")} disabled={isPending}>
            <CheckCircle className="w-4 h-4 mr-1" /> Confirm Vehicle Received → Update Files
          </Button>
        </div>
      )}

      {/* Step 20-21: Files update → Complete */}
      {stage === "files_updated" && (
        <div className="space-y-3 p-3 rounded border border-success/20 bg-success/5">
          <h4 className="font-medium text-sm flex items-center gap-1"><Package className="w-4 h-4" /> Collect Spare Parts & Update Files (Step 20-21)</h4>
          <p className="text-xs text-muted-foreground">Confirm spare parts have been collected and maintenance records updated.</p>
          <Button onClick={() => onAction("complete")} disabled={isPending}>
            <CheckCircle className="w-4 h-4 mr-1" /> Complete — Files Updated
          </Button>
        </div>
      )}

      {/* Completed terminal state */}
      {(stage === "completed" || (stage === "vehicle_received" && req.status === "completed")) && (
        <div className="space-y-2 p-3 rounded border border-success/30 bg-success/10">
          <h4 className="font-medium text-sm flex items-center gap-1.5 text-success">
            <CheckCircle className="w-4 h-4" /> Maintenance Complete
          </h4>
          <p className="text-xs text-muted-foreground">
            Vehicle received{req.vehicle_received_at ? ` on ${new Date(req.vehicle_received_at).toLocaleString()}` : ""}.
            All workflow steps closed.
          </p>
        </div>
      )}

      {/* Correction Required */}
      {stage === "correction_required" && (
        <div className="space-y-3 p-3 rounded border border-orange-500/20 bg-orange-500/5">
          <h4 className="font-medium text-sm flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Correction Required (Step 25-26)</h4>
          <div>
            <Label>Correction Notes</Label>
            <Textarea value={correctionNotes} onChange={e => setCorrectionNotes(e.target.value)} placeholder="What needs correction..." rows={2} />
          </div>
          <Button onClick={() => onAction("send_correction", { notes: correctionNotes })} disabled={!correctionNotes.trim() || isPending}>
            <Send className="w-4 h-4 mr-1" /> Send Back to Supplier
          </Button>
        </div>
      )}

      {/* Loading overlay */}
      {isPending && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Processing...
        </div>
      )}

      <Separator />

      {/* Full audit timeline */}
      <div>
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-primary" /> Workflow Audit Trail
        </h4>
        <MaintenanceWorkflowTimeline requestId={req.id} />
      </div>
    </div>
  );
};

export default MaintenanceRequestDetail;
