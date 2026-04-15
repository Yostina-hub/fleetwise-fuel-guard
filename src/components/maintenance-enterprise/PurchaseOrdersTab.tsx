import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Search, ShoppingCart, ArrowRight } from "lucide-react";
import { format } from "date-fns";

const PO_STATUSES = ["draft", "submitted", "approved", "sent", "acknowledged", "fulfilled", "invoiced", "paid"];

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-500/20 text-blue-400",
  approved: "bg-green-500/20 text-green-400",
  sent: "bg-purple-500/20 text-purple-400",
  acknowledged: "bg-yellow-500/20 text-yellow-400",
  fulfilled: "bg-cyan-500/20 text-cyan-400",
  invoiced: "bg-orange-500/20 text-orange-400",
  paid: "bg-green-600/20 text-green-300",
};

const PurchaseOrdersTab = () => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    supplier_name: "", priority: "normal", delivery_address: "",
    expected_delivery_date: "", payment_terms: "net_30", notes: "",
    items: [{ description: "", quantity: "1", unit_price: "" }],
  });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["purchase-orders", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("*, supplier:supplier_profiles(company_name)")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["supplier-profiles-list", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("supplier_profiles")
        .select("id, company_name")
        .eq("organization_id", organizationId)
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("No org");
      const poNumber = `PO-${Date.now().toString(36).toUpperCase()}`;
      const lineItems = form.items.map(item => ({
        description: item.description,
        quantity: parseInt(item.quantity) || 1,
        unit_price: parseFloat(item.unit_price) || 0,
        total: (parseInt(item.quantity) || 1) * (parseFloat(item.unit_price) || 0),
      }));
      const subtotal = lineItems.reduce((s, i) => s + i.total, 0);
      const { error } = await supabase.from("purchase_orders").insert({
        organization_id: organizationId,
        po_number: poNumber,
        supplier_id: form.supplier_name || null,
        priority: form.priority,
        line_items: lineItems,
        subtotal,
        total_amount: subtotal,
        delivery_address: form.delivery_address,
        expected_delivery_date: form.expected_delivery_date || null,
        payment_terms: form.payment_terms,
        notes: form.notes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      setCreateOpen(false);
      toast.success("Purchase order created");
    },
    onError: () => toast.error("Failed to create PO"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === "sent") updates.sent_at = new Date().toISOString();
      if (status === "acknowledged") updates.acknowledged_at = new Date().toISOString();
      if (status === "fulfilled") updates.fulfilled_at = new Date().toISOString();
      if (status === "invoiced") updates.invoiced_at = new Date().toISOString();
      if (status === "paid") updates.paid_at = new Date().toISOString();
      if (status === "approved") { updates.approved_at = new Date().toISOString(); }
      const { error } = await supabase.from("purchase_orders").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success("PO status updated");
    },
  });

  const totalValue = orders.reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
  const pendingCount = orders.filter((o: any) => ["draft", "submitted"].includes(o.status)).length;

  const filtered = orders.filter((o: any) =>
    !searchQuery || o.po_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-strong"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{orders.length}</p>
          <p className="text-xs text-muted-foreground">Total POs</p>
        </CardContent></Card>
        <Card className="glass-strong"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">{pendingCount}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </CardContent></Card>
        <Card className="glass-strong"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{(totalValue / 1000).toFixed(1)}K</p>
          <p className="text-xs text-muted-foreground">Total Value (ETB)</p>
        </CardContent></Card>
        <Card className="glass-strong"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{orders.filter((o: any) => o.status === "paid").length}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </CardContent></Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search POs..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" /> New PO</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Purchase Order</DialogTitle></DialogHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div><Label>Supplier</Label>
                <Select value={form.supplier_name} onValueChange={v => setForm(f => ({ ...f, supplier_name: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.company_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {/* Line items */}
              <div className="space-y-2">
                <Label>Line Items</Label>
                {form.items.map((item, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2">
                    <Input placeholder="Description" value={item.description} onChange={e => {
                      const items = [...form.items]; items[i] = { ...items[i], description: e.target.value }; setForm(f => ({ ...f, items }));
                    }} />
                    <Input type="number" placeholder="Qty" value={item.quantity} onChange={e => {
                      const items = [...form.items]; items[i] = { ...items[i], quantity: e.target.value }; setForm(f => ({ ...f, items }));
                    }} />
                    <Input type="number" placeholder="Unit Price" value={item.unit_price} onChange={e => {
                      const items = [...form.items]; items[i] = { ...items[i], unit_price: e.target.value }; setForm(f => ({ ...f, items }));
                    }} />
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setForm(f => ({ ...f, items: [...f.items, { description: "", quantity: "1", unit_price: "" }] }))}>+ Add Item</Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Delivery Date</Label><Input type="date" value={form.expected_delivery_date} onChange={e => setForm(f => ({ ...f, expected_delivery_date: e.target.value }))} /></div>
                <div><Label>Priority</Label>
                  <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["urgent","high","normal","low"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? "Creating..." : "Create PO"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* List */}
      {isLoading ? <div className="text-center py-12 text-muted-foreground">Loading...</div> : (
        <div className="space-y-2">
          {filtered.map((order: any) => {
            const currentIdx = PO_STATUSES.indexOf(order.status);
            const nextStatus = currentIdx < PO_STATUSES.length - 1 ? PO_STATUSES[currentIdx + 1] : null;
            return (
              <Card key={order.id} className="glass-strong">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <ShoppingCart className="w-4 h-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">{order.po_number}</span>
                          <Badge variant="outline" className={statusColors[order.status]}>{order.status}</Badge>
                        </div>
                        <p className="text-sm">{(order.supplier as any)?.company_name || "No supplier"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-medium">{order.total_amount?.toLocaleString()} ETB</span>
                      {nextStatus && (
                        <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => updateStatusMutation.mutate({ id: order.id, status: nextStatus })}>
                          <ArrowRight className="w-3 h-3" /> {nextStatus}
                        </Button>
                      )}
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="flex gap-1 mt-3">
                    {PO_STATUSES.map((s, i) => (
                      <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= currentIdx ? "bg-primary" : "bg-muted"}`} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No purchase orders found</p>}
        </div>
      )}
    </div>
  );
};

export default PurchaseOrdersTab;
