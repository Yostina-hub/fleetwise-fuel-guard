import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit2, Trash2, ShieldOff, Eye } from "lucide-react";
import { format } from "date-fns";
import { TablePagination, usePagination } from "@/components/reports/TablePagination";
import { useToast } from "@/hooks/use-toast";
import { friendlyToastError } from "@/lib/errorMessages";

interface HoldFormData {
  hold_name: string;
  case_number: string;
  hold_type: string;
  description: string;
  notes: string;
  data_types: string[];
}

const emptyForm: HoldFormData = {
  hold_name: "",
  case_number: "",
  hold_type: "litigation",
  description: "",
  notes: "",
  data_types: [],
};

const holdTypes = [
  { value: "litigation", label: "Litigation" },
  { value: "regulatory", label: "Regulatory" },
  { value: "investigation", label: "Investigation" },
  { value: "audit", label: "Audit" },
];

const dataTypeOptions = ["trips", "fuel_transactions", "alerts", "driver_penalties", "maintenance", "telemetry"];

const LegalHoldsTab = () => {
  const { organizationId } = useOrganization();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const ITEMS_PER_PAGE = 10;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<HoldFormData>({ ...emptyForm });
  const [viewingHold, setViewingHold] = useState<any>(null);

  const { data: legalHolds, isLoading } = useQuery({
    queryKey: ["legal_holds", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("legal_holds")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: HoldFormData) => {
      const { error } = await (supabase as any).from("legal_holds").insert({
        organization_id: organizationId,
        hold_name: data.hold_name,
        case_number: data.case_number || null,
        hold_type: data.hold_type,
        description: data.description,
        notes: data.notes || null,
        data_types: data.data_types.length > 0 ? data.data_types : null,
        issued_by: user?.id,
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["legal_holds"] });
      toast({ title: "Legal hold created" });
      closeDialog();
    },
    onError: (e: any) => friendlyToastError(e),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: HoldFormData }) => {
      const { error } = await (supabase as any).from("legal_holds").update({
        hold_name: data.hold_name,
        case_number: data.case_number || null,
        hold_type: data.hold_type,
        description: data.description,
        notes: data.notes || null,
        data_types: data.data_types.length > 0 ? data.data_types : null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["legal_holds"] });
      toast({ title: "Legal hold updated" });
      closeDialog();
    },
    onError: (e: any) => friendlyToastError(e),
  });

  const releaseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("legal_holds").update({
        status: "released",
        released_at: new Date().toISOString(),
        released_by: user?.id,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["legal_holds"] });
      toast({ title: "Legal hold released" });
    },
    onError: (e: any) => friendlyToastError(e),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("legal_holds").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["legal_holds"] });
      toast({ title: "Legal hold deleted" });
    },
    onError: (e: any) => friendlyToastError(e),
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setFormData({ ...emptyForm });
  };

  const handleEdit = (hold: any) => {
    setEditingId(hold.id);
    setFormData({
      hold_name: hold.hold_name || "",
      case_number: hold.case_number || "",
      hold_type: hold.hold_type || "litigation",
      description: hold.description || "",
      notes: hold.notes || "",
      data_types: hold.data_types || [],
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.hold_name.trim() || !formData.description.trim()) return;
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleRelease = (id: string) => {
    if (confirm("Release this legal hold? Data will no longer be protected from deletion.")) {
      releaseMutation.mutate(id);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Permanently delete this legal hold record?")) deleteMutation.mutate(id);
  };

  const toggleDataType = (dt: string) => {
    setFormData(prev => ({
      ...prev,
      data_types: prev.data_types.includes(dt)
        ? prev.data_types.filter(d => d !== dt)
        : [...prev.data_types, dt],
    }));
  };

  const { currentPage, setCurrentPage, startIndex, endIndex } = usePagination(legalHolds?.length || 0, ITEMS_PER_PAGE);
  const paginatedHolds = useMemo(() => legalHolds?.slice(startIndex, endIndex) || [], [legalHolds, startIndex, endIndex]);

  if (isLoading) return <div role="status" aria-live="polite">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Legal Holds ({legalHolds?.length || 0})</h3>
          <p className="text-sm text-muted-foreground">Prevent data deletion for legal compliance and litigation</p>
        </div>
        <Button onClick={() => { setFormData({ ...emptyForm }); setEditingId(null); setIsDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Create Legal Hold
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Hold Name</TableHead>
            <TableHead>Case Number</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Data Scope</TableHead>
            <TableHead>Issued Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedHolds.map((hold: any) => (
            <TableRow key={hold.id}>
              <TableCell className="font-medium">{hold.hold_name}</TableCell>
              <TableCell>{hold.case_number || "-"}</TableCell>
              <TableCell className="capitalize">{hold.hold_type}</TableCell>
              <TableCell>
                {hold.data_types?.length > 0
                  ? hold.data_types.map((dt: string) => (
                      <Badge key={dt} variant="outline" className="mr-1 text-xs">{dt}</Badge>
                    ))
                  : <span className="text-muted-foreground">All data</span>
                }
              </TableCell>
              <TableCell>{format(new Date(hold.issued_at), "MMM dd, yyyy")}</TableCell>
              <TableCell>
                {hold.status === "active" ? (
                  <Badge variant="destructive">Active</Badge>
                ) : (
                  <Badge variant="outline">Released</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setViewingHold(hold)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  {hold.status === "active" && (
                    <>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(hold)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleRelease(hold.id)}>
                        <ShieldOff className="h-4 w-4 text-warning" />
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(hold.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {legalHolds && legalHolds.length > ITEMS_PER_PAGE && (
        <TablePagination currentPage={currentPage} totalItems={legalHolds.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
      )}

      {legalHolds?.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No legal holds in place</p>
          <p className="text-sm mt-2">Create holds to preserve data for legal purposes</p>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit" : "Create"} Legal Hold</DialogTitle>
            <DialogDescription>Preserve data from deletion for legal or regulatory compliance</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hold Name *</Label>
                <Input value={formData.hold_name} onChange={(e) => setFormData({ ...formData, hold_name: e.target.value })} placeholder="e.g. Incident Investigation #42" />
              </div>
              <div className="space-y-2">
                <Label>Case Number</Label>
                <Input value={formData.case_number} onChange={(e) => setFormData({ ...formData, case_number: e.target.value })} placeholder="e.g. CASE-2026-001" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Hold Type</Label>
              <Select value={formData.hold_type} onValueChange={(v) => setFormData({ ...formData, hold_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {holdTypes.map(ht => <SelectItem key={ht.value} value={ht.value}>{ht.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Describe the reason for this hold..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Protected Data Types</Label>
              <div className="flex flex-wrap gap-2">
                {dataTypeOptions.map(dt => (
                  <Badge
                    key={dt}
                    variant={formData.data_types.includes(dt) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleDataType(dt)}
                  >
                    {dt}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Leave empty to protect all data types</p>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Additional notes..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingId ? "Update" : "Create"} Hold
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={!!viewingHold} onOpenChange={() => setViewingHold(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Legal Hold Details</DialogTitle>
          </DialogHeader>
          {viewingHold && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div><Label className="text-xs text-muted-foreground">Hold Name</Label><div className="font-medium">{viewingHold.hold_name}</div></div>
                <div><Label className="text-xs text-muted-foreground">Case Number</Label><div className="font-medium">{viewingHold.case_number || "-"}</div></div>
                <div><Label className="text-xs text-muted-foreground">Type</Label><div className="font-medium capitalize">{viewingHold.hold_type}</div></div>
                <div><Label className="text-xs text-muted-foreground">Status</Label><div>{viewingHold.status === "active" ? <Badge variant="destructive">Active</Badge> : <Badge variant="outline">Released</Badge>}</div></div>
                <div><Label className="text-xs text-muted-foreground">Issued</Label><div className="font-medium">{format(new Date(viewingHold.issued_at), "MMM dd, yyyy HH:mm")}</div></div>
                {viewingHold.released_at && <div><Label className="text-xs text-muted-foreground">Released</Label><div className="font-medium">{format(new Date(viewingHold.released_at), "MMM dd, yyyy HH:mm")}</div></div>}
              </div>
              <div><Label className="text-xs text-muted-foreground">Description</Label><p className="text-sm mt-1">{viewingHold.description}</p></div>
              {viewingHold.data_types?.length > 0 && (
                <div><Label className="text-xs text-muted-foreground">Protected Data</Label><div className="flex gap-1 mt-1">{viewingHold.data_types.map((dt: string) => <Badge key={dt} variant="outline">{dt}</Badge>)}</div></div>
              )}
              {viewingHold.notes && <div><Label className="text-xs text-muted-foreground">Notes</Label><p className="text-sm mt-1">{viewingHold.notes}</p></div>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingHold(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LegalHoldsTab;
