import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, ClipboardCheck, Search } from "lucide-react";
import { usePostMaintenanceInspections } from "@/hooks/usePostMaintenanceInspections";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { format } from "date-fns";
import { toast } from "sonner";

const resultColors: Record<string, string> = {
  pass: "bg-green-500/20 text-green-400",
  fail: "bg-red-500/20 text-red-400",
  conditional: "bg-yellow-500/20 text-yellow-400",
  pending: "bg-muted text-muted-foreground",
};

const defaultChecklist = [
  { item: "Work completed as per WO specifications", checked: false },
  { item: "All replaced parts accounted for", checked: false },
  { item: "Vehicle cleanliness maintained", checked: false },
  { item: "Safety systems functional", checked: false },
  { item: "Test drive completed satisfactorily", checked: false },
  { item: "Fluid levels correct", checked: false },
  { item: "No fluid leaks detected", checked: false },
  { item: "Documentation complete", checked: false },
];

const PostMaintenanceTab = () => {
  const { organizationId } = useOrganization();
  const { inspections, isLoading, createInspection } = usePostMaintenanceInspections();
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: completedWOs = [] } = useQuery({
    queryKey: ["completed-wo-for-inspection", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase.from("work_orders").select("id, work_order_number, status")
        .eq("organization_id", organizationId)
        .in("status", ["completed", "in_progress"])
        .order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
    enabled: !!organizationId,
  });

  const [form, setForm] = useState({
    work_order_id: "", inspector_name: "", overall_result: "pending",
    findings: "", corrective_actions: "", scrap_returned: false, notes: "",
    checklist: defaultChecklist.map(c => ({ ...c })),
    parts_replaced: [] as { part_name: string; quantity: number; condition: string }[],
  });

  const [newPart, setNewPart] = useState({ part_name: "", quantity: "1", condition: "worn" });

  const handleCreate = async () => {
    if (!form.work_order_id || !form.inspector_name) { toast.error("Work order and inspector required"); return; }
    await createInspection.mutateAsync({
      work_order_id: form.work_order_id,
      inspector_name: form.inspector_name,
      overall_result: form.overall_result,
      checklist: form.checklist,
      findings: form.findings || undefined,
      corrective_actions: form.corrective_actions || undefined,
      parts_replaced: form.parts_replaced,
      scrap_returned: form.scrap_returned,
      notes: form.notes || undefined,
    });
    setShowCreate(false);
    setForm({
      work_order_id: "", inspector_name: "", overall_result: "pending",
      findings: "", corrective_actions: "", scrap_returned: false, notes: "",
      checklist: defaultChecklist.map(c => ({ ...c })),
      parts_replaced: [],
    });
  };

  const filtered = inspections.filter(i =>
    !searchQuery || i.work_order?.work_order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.inspector_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search inspections..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2"><Plus className="w-4 h-4" /> New Inspection</Button>
      </div>

      <Card className="glass-strong">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Work Order</TableHead>
                <TableHead>Inspector</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Parts Replaced</TableHead>
                <TableHead>Scrap Returned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No inspections recorded</TableCell></TableRow>
              ) : filtered.map(insp => (
                <TableRow key={insp.id}>
                  <TableCell className="font-mono text-sm">{insp.work_order?.work_order_number || "—"}</TableCell>
                  <TableCell>{insp.inspector_name || "—"}</TableCell>
                  <TableCell className="text-sm">{format(new Date(insp.inspection_date), "MMM dd, yyyy")}</TableCell>
                  <TableCell><Badge className={resultColors[insp.overall_result] || ""} variant="outline">{insp.overall_result}</Badge></TableCell>
                  <TableCell>{Array.isArray(insp.parts_replaced) ? insp.parts_replaced.length : 0}</TableCell>
                  <TableCell>{insp.scrap_returned ? "✓" : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ClipboardCheck className="w-5 h-5" /> Post-Maintenance Inspection</DialogTitle>
            <DialogDescription>Record inspection results after maintenance work is completed.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Work Order *</Label>
                <Select value={form.work_order_id} onValueChange={v => setForm(f => ({ ...f, work_order_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select WO" /></SelectTrigger>
                  <SelectContent>{completedWOs.map(w => <SelectItem key={w.id} value={w.id}>{w.work_order_number}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Inspector Name *</Label><Input value={form.inspector_name} onChange={e => setForm(f => ({ ...f, inspector_name: e.target.value }))} /></div>
              <div>
                <Label>Overall Result</Label>
                <Select value={form.overall_result} onValueChange={v => setForm(f => ({ ...f, overall_result: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pass">Pass</SelectItem>
                    <SelectItem value="fail">Fail</SelectItem>
                    <SelectItem value="conditional">Conditional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Checkbox checked={form.scrap_returned} onCheckedChange={v => setForm(f => ({ ...f, scrap_returned: !!v }))} id="scrap" />
                <Label htmlFor="scrap" className="cursor-pointer">Scrap/replaced parts returned to warehouse</Label>
              </div>
            </div>

            {/* Checklist */}
            <div>
              <Label className="mb-2 block">Inspection Checklist</Label>
              <div className="space-y-2 bg-muted/30 p-3 rounded-lg">
                {form.checklist.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Checkbox checked={item.checked} onCheckedChange={v => {
                      const updated = [...form.checklist];
                      updated[idx] = { ...updated[idx], checked: !!v };
                      setForm(f => ({ ...f, checklist: updated }));
                    }} />
                    <span className="text-sm">{item.item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Parts Replaced */}
            <div>
              <Label className="mb-2 block">Replaced Parts</Label>
              {form.parts_replaced.map((p, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-1 text-sm">
                  <span>{p.part_name} × {p.quantity} ({p.condition})</span>
                  <Button size="sm" variant="ghost" className="text-red-400 h-6" onClick={() => setForm(f => ({ ...f, parts_replaced: f.parts_replaced.filter((_, i) => i !== idx) }))}>×</Button>
                </div>
              ))}
              <div className="flex gap-2 mt-2">
                <Input placeholder="Part name" value={newPart.part_name} onChange={e => setNewPart(p => ({ ...p, part_name: e.target.value }))} className="flex-1" />
                <Input type="number" placeholder="Qty" value={newPart.quantity} onChange={e => setNewPart(p => ({ ...p, quantity: e.target.value }))} className="w-16" />
                <Button size="sm" variant="outline" onClick={() => {
                  if (!newPart.part_name) return;
                  setForm(f => ({ ...f, parts_replaced: [...f.parts_replaced, { part_name: newPart.part_name, quantity: Number(newPart.quantity), condition: newPart.condition }] }));
                  setNewPart({ part_name: "", quantity: "1", condition: "worn" });
                }}>Add</Button>
              </div>
            </div>

            <div><Label>Findings</Label><Textarea value={form.findings} onChange={e => setForm(f => ({ ...f, findings: e.target.value }))} rows={2} /></div>
            <div><Label>Corrective Actions</Label><Textarea value={form.corrective_actions} onChange={e => setForm(f => ({ ...f, corrective_actions: e.target.value }))} rows={2} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createInspection.isPending}>Record Inspection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PostMaintenanceTab;
