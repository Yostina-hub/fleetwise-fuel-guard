import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, DollarSign, TrendingUp, TrendingDown, Search, Gauge } from "lucide-react";
import { format } from "date-fns";
import EnergyCostRatesManager from "@/components/energy/EnergyCostRatesManager";

const COST_TYPES = ["labor", "parts", "external_service", "transport", "disposal", "inspection", "other"];

const MaintenanceCostTab = () => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    cost_type: "labor", description: "", amount: "", budget_amount: "",
    invoice_number: "", invoice_date: "",
  });

  const { data: costs = [], isLoading } = useQuery({
    queryKey: ["maintenance-costs", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("maintenance_cost_tracking")
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
      const amount = parseFloat(form.amount);
      const budget = form.budget_amount ? parseFloat(form.budget_amount) : null;
      const { error } = await supabase.from("maintenance_cost_tracking").insert({
        organization_id: organizationId,
        cost_type: form.cost_type,
        description: form.description,
        amount,
        budget_amount: budget,
        variance: budget ? amount - budget : null,
        invoice_number: form.invoice_number || null,
        invoice_date: form.invoice_date || null,
        period_month: new Date().getMonth() + 1,
        period_year: new Date().getFullYear(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-costs"] });
      setCreateOpen(false);
      setForm({ cost_type: "labor", description: "", amount: "", budget_amount: "", invoice_number: "", invoice_date: "" });
      toast.success("Cost entry added");
    },
    onError: () => toast.error("Failed to add cost"),
  });

  const totalSpend = costs.reduce((s: number, c: any) => s + (c.amount || 0), 0);
  const totalBudget = costs.reduce((s: number, c: any) => s + (c.budget_amount || 0), 0);
  const totalVariance = totalBudget > 0 ? totalSpend - totalBudget : 0;
  const pendingInvoices = costs.filter((c: any) => c.invoice_status === "pending").length;

  // Group by cost type
  const byType = COST_TYPES.map(type => ({
    type,
    total: costs.filter((c: any) => c.cost_type === type).reduce((s: number, c: any) => s + (c.amount || 0), 0),
    count: costs.filter((c: any) => c.cost_type === type).length,
  })).filter(g => g.count > 0);

  const filtered = costs.filter((c: any) =>
    !searchQuery || c.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-strong"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{(totalSpend / 1000).toFixed(1)}K</p>
          <p className="text-xs text-muted-foreground">Total Spend (ETB)</p>
        </CardContent></Card>
        <Card className="glass-strong"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{(totalBudget / 1000).toFixed(1)}K</p>
          <p className="text-xs text-muted-foreground">Budget (ETB)</p>
        </CardContent></Card>
        <Card className="glass-strong"><CardContent className="p-4 text-center">
          <div className="flex items-center justify-center gap-1">
            {totalVariance > 0 ? <TrendingUp className="w-4 h-4 text-destructive" /> : <TrendingDown className="w-4 h-4 text-green-400" />}
            <p className={`text-2xl font-bold ${totalVariance > 0 ? "text-destructive" : "text-green-400"}`}>{Math.abs(totalVariance / 1000).toFixed(1)}K</p>
          </div>
          <p className="text-xs text-muted-foreground">Variance</p>
        </CardContent></Card>
        <Card className="glass-strong"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">{pendingInvoices}</p>
          <p className="text-xs text-muted-foreground">Pending Invoices</p>
        </CardContent></Card>
      </div>

      {/* Cost Breakdown by Type */}
      {byType.length > 0 && (
        <Card className="glass-strong">
          <CardHeader><CardTitle className="text-sm">Cost Breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {byType.map(g => (
                <Badge key={g.type} variant="outline" className="py-2 px-3 gap-2">
                  <span className="capitalize">{g.type.replace("_", " ")}</span>
                  <span className="font-bold">{(g.total / 1000).toFixed(1)}K</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search costs..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" /> Add Cost</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Cost Entry</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Cost Type</Label>
                <Select value={form.cost_type} onValueChange={v => setForm(f => ({ ...f, cost_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COST_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace("_"," ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Amount (ETB)</Label><Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
                <div><Label>Budget (ETB)</Label><Input type="number" value={form.budget_amount} onChange={e => setForm(f => ({ ...f, budget_amount: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Invoice #</Label><Input value={form.invoice_number} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} /></div>
                <div><Label>Invoice Date</Label><Input type="date" value={form.invoice_date} onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))} /></div>
              </div>
              <Button onClick={() => createMutation.mutate()} disabled={!form.amount || createMutation.isPending} className="w-full">
                {createMutation.isPending ? "Saving..." : "Add Cost Entry"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* List */}
      {isLoading ? <div className="text-center py-12 text-muted-foreground">Loading...</div> : (
        <div className="space-y-2">
          {filtered.map((cost: any) => (
            <Card key={cost.id} className="glass-strong">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <DollarSign className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] capitalize">{cost.cost_type?.replace("_"," ")}</Badge>
                      {cost.invoice_number && <span className="text-xs font-mono text-muted-foreground">INV: {cost.invoice_number}</span>}
                    </div>
                    <p className="text-sm truncate">{cost.description || "No description"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-medium">{cost.amount?.toLocaleString()} ETB</span>
                  {cost.variance !== null && cost.variance !== undefined && (
                    <Badge variant="outline" className={cost.variance > 0 ? "text-destructive border-destructive/30" : "text-green-400 border-green-500/30"}>
                      {cost.variance > 0 ? "+" : ""}{cost.variance.toLocaleString()}
                    </Badge>
                  )}
                  <Badge variant={cost.invoice_status === "paid" ? "default" : "secondary"} className="text-[10px]">{cost.invoice_status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No cost entries found</p>}
        </div>
      )}

      {/* Dynamic Cost Rates */}
      <Card className="glass-strong">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Gauge className="w-4 h-4" /> Dynamic Energy Cost Rates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EnergyCostRatesManager filterType="fuel" />
        </CardContent>
      </Card>
    </div>
  );
};

export default MaintenanceCostTab;
