import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, TrendingUp, TrendingDown, Fuel, Zap, Calendar, History, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface EnergyCostRatesManagerProps {
  filterType?: "fuel" | "ev_charging" | "all";
  compact?: boolean;
}

const ENERGY_TYPES = [
  { value: "fuel", label: "Fuel", icon: Fuel },
  { value: "ev_charging", label: "EV Charging", icon: Zap },
];

const FUEL_TYPES = [
  { value: "diesel", label: "Diesel" },
  { value: "petrol", label: "Petrol" },
  { value: "premium", label: "Premium" },
];

const SOURCES = ["market_update", "manual", "contract", "utility_bill"];

const EnergyCostRatesManager = ({ filterType = "all", compact = false }: EnergyCostRatesManagerProps) => {
  const { organizationId } = useOrganization();
  const { formatCurrency } = useOrganizationSettings();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    energy_type: filterType === "all" ? "fuel" : filterType,
    fuel_type: "diesel",
    rate_per_unit: "",
    unit: "liter",
    effective_from: new Date().toISOString().split("T")[0],
    effective_until: "",
    source: "manual",
    notes: "",
  });

  const { data: rates = [], isLoading } = useQuery({
    queryKey: ["energy-cost-rates", organizationId, filterType],
    queryFn: async () => {
      if (!organizationId) return [];
      let query = (supabase as any)
        .from("energy_cost_rates")
        .select("*")
        .eq("organization_id", organizationId)
        .order("effective_from", { ascending: false });
      
      if (filterType !== "all") {
        query = query.eq("energy_type", filterType);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("No org");
      const { error } = await (supabase as any).from("energy_cost_rates").insert({
        organization_id: organizationId,
        energy_type: form.energy_type,
        fuel_type: form.energy_type === "fuel" ? form.fuel_type : null,
        rate_per_unit: parseFloat(form.rate_per_unit),
        unit: form.energy_type === "ev_charging" ? "kWh" : form.unit,
        effective_from: form.effective_from,
        effective_until: form.effective_until || null,
        source: form.source,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["energy-cost-rates"] });
      setCreateOpen(false);
      setForm({
        energy_type: filterType === "all" ? "fuel" : filterType,
        fuel_type: "diesel",
        rate_per_unit: "",
        unit: "liter",
        effective_from: new Date().toISOString().split("T")[0],
        effective_until: "",
        source: "manual",
        notes: "",
      });
      toast.success("Cost rate added successfully");
    },
    onError: () => toast.error("Failed to add cost rate"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("energy_cost_rates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["energy-cost-rates"] });
      toast.success("Rate deleted");
    },
  });

  // Current active rates
  const today = new Date().toISOString().split("T")[0];
  const currentRates = rates.filter((r: any) =>
    r.effective_from <= today && (!r.effective_until || r.effective_until >= today)
  );

  // Calculate trend (compare last two rates per type)
  const getTrend = (type: string, fuelType?: string) => {
    const filtered = rates
      .filter((r: any) => r.energy_type === type && (!fuelType || r.fuel_type === fuelType))
      .sort((a: any, b: any) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime());
    if (filtered.length < 2) return null;
    const diff = filtered[0].rate_per_unit - filtered[1].rate_per_unit;
    const pct = ((diff / filtered[1].rate_per_unit) * 100).toFixed(1);
    return { diff, pct, direction: diff > 0 ? "up" : diff < 0 ? "down" : "flat" };
  };

  return (
    <div className="space-y-4">
      {/* Current Active Rates */}
      {!compact && currentRates.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {currentRates.map((rate: any) => {
            const trend = getTrend(rate.energy_type, rate.fuel_type);
            const isEV = rate.energy_type === "ev_charging";
            return (
              <Card key={rate.id} className="glass-strong">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {isEV ? <Zap className="w-4 h-4 text-emerald-400" /> : <Fuel className="w-4 h-4 text-amber-400" />}
                      <span className="text-xs font-medium capitalize">
                        {isEV ? "EV Charging" : rate.fuel_type}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">Active</Badge>
                  </div>
                  <p className="text-2xl font-bold">
                    {formatCurrency(rate.rate_per_unit)}
                    <span className="text-xs text-muted-foreground font-normal">/{rate.unit}</span>
                  </p>
                  {trend && (
                    <div className={`flex items-center gap-1 mt-1 text-xs ${trend.direction === "up" ? "text-destructive" : "text-green-400"}`}>
                      {trend.direction === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      <span>{trend.direction === "up" ? "+" : ""}{trend.pct}% vs previous</span>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Since {format(new Date(rate.effective_from), "MMM d, yyyy")}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Rate History ({rates.length})</span>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> New Rate</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Energy Cost Rate</DialogTitle></DialogHeader>
            <div className="space-y-4">
              {filterType === "all" && (
                <div>
                  <Label>Energy Type</Label>
                  <Select value={form.energy_type} onValueChange={v => setForm(f => ({ ...f, energy_type: v, unit: v === "ev_charging" ? "kWh" : "liter" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ENERGY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {form.energy_type === "fuel" && (
                <div>
                  <Label>Fuel Type</Label>
                  <Select value={form.fuel_type} onValueChange={v => setForm(f => ({ ...f, fuel_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FUEL_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Rate per {form.energy_type === "ev_charging" ? "kWh" : form.unit}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 65.50"
                    value={form.rate_per_unit}
                    onChange={e => setForm(f => ({ ...f, rate_per_unit: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Source</Label>
                  <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SOURCES.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Effective From</Label>
                  <Input type="date" value={form.effective_from} onChange={e => setForm(f => ({ ...f, effective_from: e.target.value }))} />
                </div>
                <div>
                  <Label>Effective Until (optional)</Label>
                  <Input type="date" value={form.effective_until} onChange={e => setForm(f => ({ ...f, effective_until: e.target.value }))} />
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Price adjustment reason..." />
              </div>

              <Button
                onClick={() => createMutation.mutate()}
                disabled={!form.rate_per_unit || !form.effective_from || createMutation.isPending}
                className="w-full"
              >
                {createMutation.isPending ? "Saving..." : "Add Rate"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Rate History Timeline */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading rates...</div>
      ) : rates.length === 0 ? (
        <Card className="glass-strong">
          <CardContent className="p-8 text-center text-muted-foreground">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No cost rates configured yet. Add your first rate to start tracking.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rates.map((rate: any, idx: number) => {
            const isActive = rate.effective_from <= today && (!rate.effective_until || rate.effective_until >= today);
            const isEV = rate.energy_type === "ev_charging";
            return (
              <Card key={rate.id} className={`glass-strong ${isActive ? "border-primary/30" : ""}`}>
                <CardContent className="p-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${isActive ? "bg-green-400" : "bg-muted-foreground/30"}`} />
                    {isEV ? <Zap className="w-4 h-4 text-emerald-400 shrink-0" /> : <Fuel className="w-4 h-4 text-amber-400 shrink-0" />}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">
                          {formatCurrency(rate.rate_per_unit)}/{rate.unit}
                        </span>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {isEV ? "EV" : rate.fuel_type}
                        </Badge>
                        {isActive && <Badge className="text-[10px] bg-green-500/20 text-green-400">Current</Badge>}
                        {rate.source && (
                          <Badge variant="secondary" className="text-[10px] capitalize">{rate.source.replace("_", " ")}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {format(new Date(rate.effective_from), "MMM d, yyyy")}
                        {rate.effective_until ? ` → ${format(new Date(rate.effective_until), "MMM d, yyyy")}` : " → Present"}
                        {rate.notes ? ` • ${rate.notes}` : ""}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteMutation.mutate(rate.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EnergyCostRatesManager;
