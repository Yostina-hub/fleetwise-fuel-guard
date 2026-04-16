import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Wrench, PlayCircle, CheckCircle2, AlertTriangle, Truck } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type ActionMode = "ack" | "variation" | "complete" | "delivered" | null;

const SupplierWorkflowTasksTab = () => {
  const { organizationId } = useOrganization();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<ActionMode>(null);
  const [notes, setNotes] = useState("");
  const [invoiceUrl, setInvoiceUrl] = useState("");
  const [reportUrl, setReportUrl] = useState("");
  const [docUrl, setDocUrl] = useState("");

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["supplier-workflow-tasks", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("maintenance_requests")
        .select("*, vehicle:vehicles(plate_number, make, model)")
        .eq("organization_id", organizationId)
        .in("workflow_stage", ["vehicle_delivery", "supplier_maintenance", "variation_review"])
        .not("supplier_id", "is", null)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
    refetchInterval: 20000,
  });

  const reset = () => { setActiveId(null); setMode(null); setNotes(""); setInvoiceUrl(""); setReportUrl(""); setDocUrl(""); };

  const actionMut = useMutation({
    mutationFn: async () => {
      if (!activeId || !mode) return;
      let rpc: string; let args: any = { p_request_id: activeId };
      if (mode === "ack") { rpc = "supplier_acknowledge_request"; args.p_notes = notes || null; }
      else if (mode === "variation") { rpc = "supplier_request_variation"; args.p_variation_notes = notes; }
      else if (mode === "complete") { rpc = "supplier_complete_work"; args.p_invoice_url = invoiceUrl || null; args.p_report_url = reportUrl || null; args.p_notes = notes || null; }
      else { rpc = "supplier_mark_delivered_back"; args.p_document_url = docUrl || null; args.p_notes = notes || null; }
      const { error } = await supabase.rpc(rpc as any, args);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplier-workflow-tasks"] });
      toast.success("Action recorded");
      reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const stageBadge = (s: string) => {
    if (s === "vehicle_delivery") return <Badge className="bg-blue-500/20 text-blue-400">Awaiting Vehicle</Badge>;
    if (s === "supplier_maintenance") return <Badge className="bg-yellow-500/20 text-yellow-400">In Progress</Badge>;
    if (s === "variation_review") return <Badge className="bg-orange-500/20 text-orange-400">Variation Pending</Badge>;
    return <Badge variant="outline">{s}</Badge>;
  };

  const dlgTitle = mode === "ack" ? "Acknowledge & Start Work" :
    mode === "variation" ? "Request Variation" :
    mode === "complete" ? "Complete Work & Upload Documents" :
    "Mark Vehicle Ready for Pickup";

  return (
    <div className="space-y-4">
      <Card className="glass-strong">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary" /> Supplier Workflow Tasks
            <Badge variant="outline" className="ml-2">{tasks.length} active</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Steps 7 → 9 → 22: Supplier acknowledges PO, performs work, optionally requests variation, then marks vehicle ready.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request #</TableHead>
                  <TableHead>PDR / PO</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No supplier tasks active. POs will appear here once issued by SCD Sourcing.
                  </TableCell></TableRow>
                ) : tasks.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.request_number}</TableCell>
                    <TableCell className="font-mono text-xs">{r.pdr_number || "—"}</TableCell>
                    <TableCell>{r.vehicle?.plate_number || "—"}</TableCell>
                    <TableCell>{stageBadge(r.workflow_stage)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(r.updated_at), "MMM dd, HH:mm")}</TableCell>
                    <TableCell className="text-right space-x-1">
                      {r.workflow_stage === "vehicle_delivery" && (
                        <Button size="sm" className="gap-1" onClick={() => { setActiveId(r.id); setMode("ack"); }}>
                          <PlayCircle className="w-3 h-3" /> Start
                        </Button>
                      )}
                      {r.workflow_stage === "supplier_maintenance" && (
                        <>
                          <Button size="sm" variant="outline" className="gap-1" onClick={() => { setActiveId(r.id); setMode("variation"); }}>
                            <AlertTriangle className="w-3 h-3" /> Variation
                          </Button>
                          <Button size="sm" className="gap-1" onClick={() => { setActiveId(r.id); setMode("complete"); }}>
                            <CheckCircle2 className="w-3 h-3" /> Complete
                          </Button>
                        </>
                      )}
                      {r.workflow_stage === "variation_review" && (
                        <Badge variant="outline" className="text-xs">Awaiting fleet decision</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!mode} onOpenChange={(o) => { if (!o) reset(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dlgTitle}</DialogTitle>
            <DialogDescription>
              {mode === "ack" && "Confirm receipt of PO and that vehicle has arrived. Status moves to In Progress."}
              {mode === "variation" && "Describe the additional scope or cost change required. Fleet ops will review."}
              {mode === "complete" && "Upload your invoice and service report URLs. Request moves to Inspector Assigned."}
              {mode === "delivered" && "Confirm vehicle is ready for pickup. Fleet will perform delivery check."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {mode === "complete" && (
              <>
                <div><Label>Invoice URL</Label><Input value={invoiceUrl} onChange={e => setInvoiceUrl(e.target.value)} placeholder="https://..." /></div>
                <div><Label>Service Report URL</Label><Input value={reportUrl} onChange={e => setReportUrl(e.target.value)} placeholder="https://..." /></div>
              </>
            )}
            {mode === "delivered" && (
              <div><Label>Delivery Document URL</Label><Input value={docUrl} onChange={e => setDocUrl(e.target.value)} placeholder="https://..." /></div>
            )}
            <div>
              <Label>{mode === "variation" ? "Variation Details *" : "Notes"}</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={reset}>Cancel</Button>
            <Button
              disabled={actionMut.isPending || (mode === "variation" && !notes.trim())}
              onClick={() => actionMut.mutate()}
            >
              {actionMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierWorkflowTasksTab;
