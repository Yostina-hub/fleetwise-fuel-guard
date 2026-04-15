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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Search, FileSignature, AlertTriangle, Calendar } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";

const MaintenanceContractsTab = () => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    vendor_name: "", contract_type: "annual", description: "",
    start_date: "", end_date: "", total_value: "", auto_renew: false,
    sla_response_hours: "4", sla_resolution_hours: "24", warranty_terms: "", payment_terms: "net_30",
  });

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["maintenance-contracts", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("maintenance_contracts")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("No org");
      const contractNumber = `MC-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase.from("maintenance_contracts").insert({
        organization_id: organizationId,
        contract_number: contractNumber,
        vendor_name: form.vendor_name,
        contract_type: form.contract_type,
        description: form.description,
        start_date: form.start_date,
        end_date: form.end_date || null,
        total_value: form.total_value ? parseFloat(form.total_value) : null,
        auto_renew: form.auto_renew,
        sla_terms: {
          response_hours: parseInt(form.sla_response_hours),
          resolution_hours: parseInt(form.sla_resolution_hours),
        },
        warranty_terms: form.warranty_terms,
        payment_terms: form.payment_terms,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-contracts"] });
      setCreateOpen(false);
      toast.success("Contract created");
    },
    onError: () => toast.error("Failed to create contract"),
  });

  const activeCount = contracts.filter((c: any) => c.status === "active").length;
  const expiringCount = contracts.filter((c: any) => {
    if (!c.end_date) return false;
    const days = differenceInDays(parseISO(c.end_date), new Date());
    return days >= 0 && days <= 30;
  }).length;
  const totalValue = contracts.reduce((s: number, c: any) => s + (c.total_value || 0), 0);

  const filtered = contracts.filter((c: any) =>
    !searchQuery || c.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.contract_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-strong"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{contracts.length}</p>
          <p className="text-xs text-muted-foreground">Total Contracts</p>
        </CardContent></Card>
        <Card className="glass-strong"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{activeCount}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </CardContent></Card>
        <Card className="glass-strong"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">{expiringCount}</p>
          <p className="text-xs text-muted-foreground">Expiring (30d)</p>
        </CardContent></Card>
        <Card className="glass-strong"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{(totalValue / 1000).toFixed(0)}K</p>
          <p className="text-xs text-muted-foreground">Total Value (ETB)</p>
        </CardContent></Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search contracts..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" /> New Contract</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Service Contract</DialogTitle></DialogHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div><Label>Vendor Name</Label><Input value={form.vendor_name} onChange={e => setForm(f => ({ ...f, vendor_name: e.target.value }))} /></div>
              <div><Label>Contract Type</Label>
                <Select value={form.contract_type} onValueChange={v => setForm(f => ({ ...f, contract_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["annual","per_service","warranty","fleet_wide"].map(t => <SelectItem key={t} value={t}>{t.replace("_"," ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Total Value (ETB)</Label><Input type="number" value={form.total_value} onChange={e => setForm(f => ({ ...f, total_value: e.target.value }))} /></div>
                <div><Label>Payment Terms</Label>
                  <Select value={form.payment_terms} onValueChange={v => setForm(f => ({ ...f, payment_terms: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["net_15","net_30","net_45","net_60","upon_completion"].map(t => <SelectItem key={t} value={t}>{t.replace("_"," ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>SLA Response (hrs)</Label><Input type="number" value={form.sla_response_hours} onChange={e => setForm(f => ({ ...f, sla_response_hours: e.target.value }))} /></div>
                <div><Label>SLA Resolution (hrs)</Label><Input type="number" value={form.sla_resolution_hours} onChange={e => setForm(f => ({ ...f, sla_resolution_hours: e.target.value }))} /></div>
              </div>
              <div><Label>Warranty Terms</Label><Textarea value={form.warranty_terms} onChange={e => setForm(f => ({ ...f, warranty_terms: e.target.value }))} /></div>
              <Button onClick={() => createMutation.mutate()} disabled={!form.vendor_name || !form.start_date || createMutation.isPending} className="w-full">
                {createMutation.isPending ? "Creating..." : "Create Contract"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* List */}
      {isLoading ? <div className="text-center py-12 text-muted-foreground">Loading...</div> : (
        <div className="space-y-3">
          {filtered.map((contract: any) => {
            const daysToExpiry = contract.end_date ? differenceInDays(parseISO(contract.end_date), new Date()) : null;
            const sla = contract.sla_terms as Record<string, unknown> || {};
            return (
              <Card key={contract.id} className="glass-strong">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <FileSignature className="w-5 h-5 text-primary shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">{contract.contract_number}</span>
                          <Badge variant="outline" className="text-[10px]">{contract.contract_type?.replace("_"," ")}</Badge>
                        </div>
                        <p className="font-medium">{contract.vendor_name}</p>
                        {contract.description && <p className="text-xs text-muted-foreground truncate">{contract.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {sla && (sla as any).response_hours && (
                        <span className="text-[10px] text-muted-foreground">SLA: {(sla as any).response_hours}h / {(sla as any).resolution_hours}h</span>
                      )}
                      {contract.total_value && <span className="text-sm font-medium">{contract.total_value.toLocaleString()} ETB</span>}
                      <Badge variant={contract.status === "active" ? "default" : "secondary"}>{contract.status}</Badge>
                      {daysToExpiry !== null && daysToExpiry <= 30 && daysToExpiry >= 0 && (
                        <Badge variant="outline" className="text-yellow-400 border-yellow-500/30 gap-1">
                          <AlertTriangle className="w-3 h-3" /> {daysToExpiry}d
                        </Badge>
                      )}
                      {contract.auto_renew && <Badge variant="outline" className="text-[10px]">Auto-renew</Badge>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No contracts found</p>}
        </div>
      )}
    </div>
  );
};

export default MaintenanceContractsTab;
