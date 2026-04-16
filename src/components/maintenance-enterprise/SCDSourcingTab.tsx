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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ShoppingCart, FileSignature } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const SCDSourcingTab = () => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [poId, setPoId] = useState("");
  const [geofenceId, setGeofenceId] = useState<string>("none");
  const [notes, setNotes] = useState("");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["scd-sourcing", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase
        .from("maintenance_requests")
        .select("*, vehicle:vehicles(plate_number, make, model)")
        .eq("organization_id", organizationId)
        .eq("workflow_stage", "approved")
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers-for-po", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase
        .from("supplier_profiles")
        .select("id, name")
        .eq("organization_id", organizationId)
        .eq("is_active", true);
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: geofences = [] } = useQuery({
    queryKey: ["supplier-geofences", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase
        .from("geofences")
        .select("id, name")
        .eq("organization_id", organizationId);
      return data || [];
    },
    enabled: !!organizationId,
  });

  const issuePoMut = useMutation({
    mutationFn: async () => {
      if (!activeId) return;
      const generatedPoId = poId.trim() || crypto.randomUUID();
      const { error } = await supabase.rpc("scd_create_po", {
        p_request_id: activeId,
        p_po_id: generatedPoId,
        p_supplier_id: supplierId || crypto.randomUUID(),
        p_supplier_name: supplierName,
        p_supplier_geofence_id: geofenceId === "none" ? null : geofenceId,
        p_notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scd-sourcing"] });
      toast.success("PO issued — vehicle delivery requested from driver");
      setActiveId(null); setSupplierId(""); setSupplierName(""); setPoId(""); setGeofenceId("none"); setNotes("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <Card className="glass-strong">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" /> SCD Sourcing — PO Issuance
            <Badge variant="outline" className="ml-2">{requests.length} pending PO</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Step 6c: Issue purchase orders to selected suppliers. Linking a supplier geofence enables GPS-verified delivery.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request #</TableHead>
                  <TableHead>PDR #</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No requests awaiting PO issuance.
                  </TableCell></TableRow>
                ) : requests.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.request_number}</TableCell>
                    <TableCell className="font-mono text-sm">{r.pdr_number || "—"}</TableCell>
                    <TableCell>{r.vehicle?.plate_number || "—"}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm">{r.description || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(r.updated_at), "MMM dd")}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" className="gap-1" onClick={() => setActiveId(r.id)}>
                        <FileSignature className="w-3 h-3" /> Issue PO
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!activeId} onOpenChange={() => setActiveId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Purchase Order</DialogTitle>
            <DialogDescription>Assign a supplier and PO number. Linking a geofence enables GPS-verified vehicle delivery.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Supplier *</Label>
              <Select value={supplierId} onValueChange={(v) => {
                setSupplierId(v);
                const s = suppliers.find((x: any) => x.id === v);
                setSupplierName(s?.name || "");
              }}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Supplier Name *</Label>
              <Input value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="Supplier name" />
            </div>
            <div>
              <Label>PO Number / ID</Label>
              <Input value={poId} onChange={e => setPoId(e.target.value)} placeholder="Auto-generated if blank" />
            </div>
            <div>
              <Label>Supplier Geofence (for GPS delivery verification)</Label>
              <Select value={geofenceId} onValueChange={setGeofenceId}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (no geofence check)</SelectItem>
                  {geofences.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveId(null)}>Cancel</Button>
            <Button
              disabled={issuePoMut.isPending || !supplierName.trim()}
              onClick={() => issuePoMut.mutate()}
            >
              {issuePoMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Issue PO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SCDSourcingTab;
