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
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Plus, Search, Star, Building2, Phone, Mail } from "lucide-react";

const SupplierProfilesTab = () => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    company_name: "", contact_name: "", contact_email: "", contact_phone: "",
    address: "", city: "", service_categories: "", payment_terms: "net_30",
  });

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["supplier-profiles", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("supplier_profiles")
        .select("*")
        .eq("organization_id", organizationId)
        .order("company_name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("No org");
      const code = `SUP-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase.from("supplier_profiles").insert({
        organization_id: organizationId,
        supplier_code: code,
        company_name: form.company_name,
        contact_name: form.contact_name,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone,
        address: form.address,
        city: form.city,
        service_categories: form.service_categories ? form.service_categories.split(",").map(s => s.trim()) : [],
        payment_terms: form.payment_terms,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-profiles"] });
      setCreateOpen(false);
      setForm({ company_name: "", contact_name: "", contact_email: "", contact_phone: "", address: "", city: "", service_categories: "", payment_terms: "net_30" });
      toast.success("Supplier added");
    },
    onError: () => toast.error("Failed to add supplier"),
  });

  const approvedCount = suppliers.filter((s: any) => s.is_approved).length;
  const avgRating = suppliers.length > 0 ? suppliers.reduce((s: number, sup: any) => s + (sup.quality_rating || 0), 0) / suppliers.length : 0;
  const totalSpend = suppliers.reduce((s: number, sup: any) => s + (sup.total_spend || 0), 0);

  const filtered = suppliers.filter((s: any) =>
    !searchQuery || s.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.supplier_code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-strong"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{suppliers.length}</p>
          <p className="text-xs text-muted-foreground">Total Suppliers</p>
        </CardContent></Card>
        <Card className="glass-strong"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{approvedCount}</p>
          <p className="text-xs text-muted-foreground">Approved</p>
        </CardContent></Card>
        <Card className="glass-strong"><CardContent className="p-4 text-center">
          <div className="flex items-center justify-center gap-1">
            <Star className="w-4 h-4 text-yellow-400" />
            <p className="text-2xl font-bold text-yellow-400">{avgRating.toFixed(1)}</p>
          </div>
          <p className="text-xs text-muted-foreground">Avg Rating</p>
        </CardContent></Card>
        <Card className="glass-strong"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{(totalSpend / 1000).toFixed(0)}K</p>
          <p className="text-xs text-muted-foreground">Total Spend (ETB)</p>
        </CardContent></Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search suppliers..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" /> Add Supplier</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add Supplier</DialogTitle></DialogHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div><Label>Company Name</Label><Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Contact Name</Label><Input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} /></div>
                <div><Label>Phone</Label><Input value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} /></div>
              </div>
              <div><Label>Email</Label><Input value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Address</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
                <div><Label>City</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
              </div>
              <div><Label>Service Categories (comma-separated)</Label><Input value={form.service_categories} onChange={e => setForm(f => ({ ...f, service_categories: e.target.value }))} placeholder="engine, brakes, electrical" /></div>
              <div><Label>Payment Terms</Label>
                <Select value={form.payment_terms} onValueChange={v => setForm(f => ({ ...f, payment_terms: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["net_15","net_30","net_45","net_60","upon_completion"].map(t => <SelectItem key={t} value={t}>{t.replace("_"," ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => createMutation.mutate()} disabled={!form.company_name || createMutation.isPending} className="w-full">
                {createMutation.isPending ? "Saving..." : "Add Supplier"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Supplier Cards */}
      {isLoading ? <div className="text-center py-12 text-muted-foreground">Loading...</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((supplier: any) => (
            <Card key={supplier.id} className="glass-strong hover:border-primary/30 transition-colors">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <p className="font-medium">{supplier.company_name}</p>
                      <span className="text-xs font-mono text-muted-foreground">{supplier.supplier_code}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {supplier.is_approved ? <Badge variant="default" className="text-[10px]">Approved</Badge> : <Badge variant="secondary" className="text-[10px]">Pending</Badge>}
                  </div>
                </div>
                {supplier.contact_name && (
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>{supplier.contact_name}</p>
                    {supplier.contact_email && <p className="flex items-center gap-1"><Mail className="w-3 h-3" /> {supplier.contact_email}</p>}
                    {supplier.contact_phone && <p className="flex items-center gap-1"><Phone className="w-3 h-3" /> {supplier.contact_phone}</p>}
                  </div>
                )}
                {/* Performance */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">On-Time Delivery</span>
                    <span>{supplier.on_time_percentage || 0}%</span>
                  </div>
                  <Progress value={supplier.on_time_percentage || 0} className="h-1.5" />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Quality</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-400" />
                      <span>{supplier.quality_rating || 0}/5</span>
                    </div>
                  </div>
                </div>
                {supplier.service_categories?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {supplier.service_categories.map((cat: string) => (
                      <Badge key={cat} variant="outline" className="text-[10px]">{cat}</Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
                  <span>{supplier.total_orders || 0} orders</span>
                  <span>{(supplier.total_spend || 0).toLocaleString()} ETB</span>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">No suppliers found</p>}
        </div>
      )}
    </div>
  );
};

export default SupplierProfilesTab;
