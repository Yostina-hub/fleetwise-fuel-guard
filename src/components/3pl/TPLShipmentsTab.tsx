import { useState } from "react";
import { useTPLShipments, useTPLPartners, useTPLRateCards } from "@/hooks/use3PL";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Truck, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_COLORS: Record<string, string> = {
  pending: "outline", in_transit: "default", picked_up: "secondary",
  delivered: "default", cancelled: "destructive", returned: "destructive",
};

const emptyForm = {
  partner_id: "", origin_address: "", destination_address: "",
  weight_kg: "", cargo_description: "", customer_name: "", customer_phone: "",
  pickup_scheduled_at: "", delivery_scheduled_at: "", special_instructions: "", notes: "", status: "pending",
  estimated_cost: "", actual_cost: "", partner_tracking_number: "", partner_reference: "", rate_card_id: "",
};

export function TPLShipmentsTab() {
  const { shipments, isLoading, createShipment, updateShipment, deleteShipment } = useTPLShipments();
  const { partners } = useTPLPartners();
  const { rateCards } = useTPLRateCards();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const filtered = shipments.filter(s => {
    const matchSearch = s.shipment_number.toLowerCase().includes(search.toLowerCase()) ||
      (s.customer_name || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openCreate = () => { setForm(emptyForm); setEditId(null); setShowDialog(true); };
  const openEdit = (s: any) => {
    setForm({
      partner_id: s.partner_id, origin_address: s.origin_address || "",
      destination_address: s.destination_address || "",
      weight_kg: s.weight_kg?.toString() || "", cargo_description: s.cargo_description || "",
      customer_name: s.customer_name || "", customer_phone: s.customer_phone || "",
      pickup_scheduled_at: s.pickup_scheduled_at?.slice(0, 16) || "",
      delivery_scheduled_at: s.delivery_scheduled_at?.slice(0, 16) || "",
      special_instructions: s.special_instructions || "", notes: s.notes || "", status: s.status,
      estimated_cost: s.estimated_cost?.toString() || "", actual_cost: s.actual_cost?.toString() || "",
      partner_tracking_number: s.partner_tracking_number || "", partner_reference: s.partner_reference || "",
      rate_card_id: s.rate_card_id || "",
    });
    setEditId(s.id);
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!form.partner_id) return;
    const payload = {
      ...form,
      weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
      estimated_cost: form.estimated_cost ? parseFloat(form.estimated_cost) : null,
      actual_cost: form.actual_cost ? parseFloat(form.actual_cost) : null,
      pickup_scheduled_at: form.pickup_scheduled_at || null,
      delivery_scheduled_at: form.delivery_scheduled_at || null,
      partner_tracking_number: form.partner_tracking_number || null,
      partner_reference: form.partner_reference || null,
      rate_card_id: form.rate_card_id || null,
    };
    if (editId) {
      updateShipment.mutate({ id: editId, ...payload }, { onSuccess: () => setShowDialog(false) });
    } else {
      createShipment.mutate(payload, { onSuccess: () => setShowDialog(false) });
    }
  };

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search shipments..." className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="picked_up">Picked Up</SelectItem>
            <SelectItem value="in_transit">In Transit</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Create Shipment</Button>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No shipments found</p>
        </CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shipment #</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead>Origin → Destination</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-sm">{s.shipment_number}</TableCell>
                  <TableCell>{(s as any).tpl_partners?.name || "-"}</TableCell>
                  <TableCell>
                    <div className="text-sm">{s.origin_address || "N/A"}</div>
                    <div className="text-xs text-muted-foreground">→ {s.destination_address || "N/A"}</div>
                  </TableCell>
                  <TableCell>{s.customer_name || "-"}</TableCell>
                  <TableCell><Badge variant={(STATUS_COLORS[s.status] || "outline") as any}>{s.status}</Badge></TableCell>
                  <TableCell>{s.actual_cost ? `${s.actual_cost} ETB` : s.estimated_cost ? `~${s.estimated_cost} ETB` : "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteShipment.mutate(s.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Shipment" : "Create 3PL Shipment"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Partner *</Label>
                <Select value={form.partner_id} onValueChange={v => setForm({...form, partner_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select partner" /></SelectTrigger>
                  <SelectContent>
                    {partners.filter(p => p.status === "active").map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {editId && (
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="picked_up">Picked Up</SelectItem>
                      <SelectItem value="in_transit">In Transit</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="returned">Returned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div><Label>Origin Address</Label><Input value={form.origin_address} onChange={e => setForm({...form, origin_address: e.target.value})} /></div>
            <div><Label>Destination Address</Label><Input value={form.destination_address} onChange={e => setForm({...form, destination_address: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Customer Name</Label><Input value={form.customer_name} onChange={e => setForm({...form, customer_name: e.target.value})} /></div>
              <div><Label>Customer Phone</Label><Input value={form.customer_phone} onChange={e => setForm({...form, customer_phone: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Weight (kg)</Label><Input type="number" value={form.weight_kg} onChange={e => setForm({...form, weight_kg: e.target.value})} /></div>
              <div><Label>Cargo</Label><Input value={form.cargo_description} onChange={e => setForm({...form, cargo_description: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Pickup Scheduled</Label><Input type="datetime-local" value={form.pickup_scheduled_at} onChange={e => setForm({...form, pickup_scheduled_at: e.target.value})} /></div>
              <div><Label>Delivery Scheduled</Label><Input type="datetime-local" value={form.delivery_scheduled_at} onChange={e => setForm({...form, delivery_scheduled_at: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Estimated Cost (ETB)</Label><Input type="number" value={form.estimated_cost} onChange={e => setForm({...form, estimated_cost: e.target.value})} /></div>
              <div><Label>Actual Cost (ETB)</Label><Input type="number" value={form.actual_cost} onChange={e => setForm({...form, actual_cost: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Partner Tracking #</Label><Input value={form.partner_tracking_number} onChange={e => setForm({...form, partner_tracking_number: e.target.value})} placeholder="External tracking" /></div>
              <div><Label>Partner Reference</Label><Input value={form.partner_reference} onChange={e => setForm({...form, partner_reference: e.target.value})} /></div>
            </div>
            {rateCards.filter(rc => rc.partner_id === form.partner_id).length > 0 && (
              <div><Label>Rate Card</Label>
                <Select value={form.rate_card_id} onValueChange={v => {
                  const rc = rateCards.find(r => r.id === v);
                  const est = rc?.flat_rate ? rc.flat_rate.toString() : form.estimated_cost;
                  setForm({...form, rate_card_id: v, estimated_cost: est});
                }}>
                  <SelectTrigger><SelectValue placeholder="Select rate card" /></SelectTrigger>
                  <SelectContent>
                    {rateCards.filter(rc => rc.partner_id === form.partner_id && rc.is_active).map(rc => (
                      <SelectItem key={rc.id} value={rc.id}>{rc.name} {rc.flat_rate ? `(${rc.flat_rate} ETB)` : rc.rate_per_kg ? `(${rc.rate_per_kg}/kg)` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div><Label>Special Instructions</Label><Textarea value={form.special_instructions} onChange={e => setForm({...form, special_instructions: e.target.value})} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createShipment.isPending || updateShipment.isPending}>
              {editId ? "Save" : "Create Shipment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
