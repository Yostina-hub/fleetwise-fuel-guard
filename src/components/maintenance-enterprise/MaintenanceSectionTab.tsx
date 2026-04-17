import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Wrench, FileSignature, ClipboardCheck, XCircle, FileText } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type Action = "pre_inspection" | "create_pdr";

const MaintenanceSectionTab = () => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeAction, setActiveAction] = useState<{ id: string; type: Action } | null>(null);
  const [needsMaintenance, setNeedsMaintenance] = useState(true);
  const [notes, setNotes] = useState("");
  const [pdrNumber, setPdrNumber] = useState("");

  const { data: preInspection = [], isLoading: l1 } = useQuery({
    queryKey: ["msec-pre-inspection", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase
        .from("maintenance_requests")
        .select("*, vehicle:vehicles(plate_number, make, model)")
        .eq("organization_id", organizationId)
        .eq("workflow_stage", "pre_inspection")
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: woPrep = [], isLoading: l2 } = useQuery({
    queryKey: ["msec-wo-prep", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase
        .from("maintenance_requests")
        .select("*, vehicle:vehicles(plate_number, make, model)")
        .eq("organization_id", organizationId)
        .eq("workflow_stage", "wo_preparation")
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!organizationId,
  });

  const preInspectionMut = useMutation({
    mutationFn: async ({ id, needs, notes }: { id: string; needs: boolean; notes: string }) => {
      const { error } = await supabase.rpc("maintenance_pre_inspection", {
        p_request_id: id,
        p_needs_maintenance: needs,
        p_notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["msec-pre-inspection"] });
      queryClient.invalidateQueries({ queryKey: ["msec-wo-prep"] });
      toast.success("Pre-inspection recorded");
      setActiveAction(null); setNotes(""); setNeedsMaintenance(true);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pdrMut = useMutation({
    mutationFn: async ({ id, pdr, notes }: { id: string; pdr: string; notes: string }) => {
      const { error } = await supabase.rpc("maintenance_create_pdr", {
        p_request_id: id,
        p_pdr_number: pdr,
        p_notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["msec-wo-prep"] });
      toast.success("PDR created — sent to procurement");
      setActiveAction(null); setNotes(""); setPdrNumber("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renderTable = (rows: any[], type: Action) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Request #</TableHead>
            <TableHead>Vehicle</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
              No requests at this stage.
            </TableCell></TableRow>
          ) : rows.map((r: any) => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-sm">{r.request_number}</TableCell>
              <TableCell>{r.vehicle?.plate_number || "—"}</TableCell>
              <TableCell className="capitalize text-xs">{r.request_type}</TableCell>
              <TableCell>
                <Badge variant={r.priority === "critical" || r.priority === "high" ? "destructive" : "outline"} className="capitalize text-xs">
                  {r.priority}
                </Badge>
              </TableCell>
              <TableCell className="max-w-xs truncate text-sm">{r.description || "—"}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{format(new Date(r.created_at), "MMM dd")}</TableCell>
              <TableCell className="text-right">
                {type === "pre_inspection" ? (
                  <Button size="sm" className="gap-1" onClick={() => setActiveAction({ id: r.id, type: "pre_inspection" })}>
                    <ClipboardCheck className="w-3 h-3" /> Pre-Inspect
                  </Button>
                ) : (
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => navigate(`/maintenance-enterprise/wo/new?request=${r.id}`)}
                    >
                      <FileText className="w-3 h-3" /> Open WO Editor
                    </Button>
                    <Button size="sm" className="gap-1" onClick={() => setActiveAction({ id: r.id, type: "create_pdr" })}>
                      <FileSignature className="w-3 h-3" /> Create PDR
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  if (l1 || l2) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <Card className="glass-strong">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary" /> Maintenance Section Workspace
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Steps 4–6: Conduct pre-inspections and prepare Purchase Demand Requests (PDR) for sourcing.
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pre" className="space-y-4">
            <TabsList>
              <TabsTrigger value="pre" className="gap-2">
                <ClipboardCheck className="w-4 h-4" /> Pre-Inspection
                <Badge variant="outline" className="ml-1">{preInspection.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="pdr" className="gap-2">
                <FileSignature className="w-4 h-4" /> WO / PDR Preparation
                <Badge variant="outline" className="ml-1">{woPrep.length}</Badge>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="pre">{renderTable(preInspection, "pre_inspection")}</TabsContent>
            <TabsContent value="pdr">{renderTable(woPrep, "create_pdr")}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Pre-Inspection Dialog */}
      <Dialog open={activeAction?.type === "pre_inspection"} onOpenChange={() => setActiveAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Pre-Inspection</DialogTitle>
            <DialogDescription>Determine whether maintenance is required for this vehicle.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={needsMaintenance ? "default" : "outline"}
                onClick={() => setNeedsMaintenance(true)}
                className="flex-1 gap-1"
              >
                <Wrench className="w-4 h-4" /> Needs Maintenance
              </Button>
              <Button
                variant={!needsMaintenance ? "default" : "outline"}
                onClick={() => setNeedsMaintenance(false)}
                className="flex-1 gap-1"
              >
                <XCircle className="w-4 h-4" /> No Maintenance
              </Button>
            </div>
            <div>
              <Label>Inspection Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Findings, observations…" rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveAction(null)}>Cancel</Button>
            <Button
              disabled={preInspectionMut.isPending}
              onClick={() => activeAction && preInspectionMut.mutate({ id: activeAction.id, needs: needsMaintenance, notes })}
            >
              {preInspectionMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDR Dialog */}
      <Dialog open={activeAction?.type === "create_pdr"} onOpenChange={() => setActiveAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Purchase Demand Request (PDR)</DialogTitle>
            <DialogDescription>Submit PDR to forward this request to SCD Sourcing for PO issuance.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>PDR Number *</Label>
              <Input value={pdrNumber} onChange={e => setPdrNumber(e.target.value)} placeholder="PDR-2026-0001" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Scope, parts, justification…" rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveAction(null)}>Cancel</Button>
            <Button
              disabled={pdrMut.isPending || !pdrNumber.trim()}
              onClick={() => activeAction && pdrMut.mutate({ id: activeAction.id, pdr: pdrNumber, notes })}
            >
              {pdrMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit PDR"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MaintenanceSectionTab;
