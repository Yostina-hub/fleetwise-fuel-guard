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
import { Plus, TrendingUp, TrendingDown, Fuel, Zap, Calendar, History, Trash2, Check, Edit2 } from "lucide-react";
import { format } from "date-fns";

interface EnergyCostRatesManagerProps {
  filterType?: "fuel" | "ev_charging" | "all";
  compact?: boolean;
}

const FUEL_TYPES = [
  { value: "diesel", label: "Diesel" },
  { value: "petrol", label: "Petrol" },
  { value: "premium", label: "Premium" },
];

const ENERGY_TYPES = [
  { value: "fuel", label: "Fuel", icon: Fuel },
  { value: "ev_charging", label: "EV Charging", icon: Zap },
];

const SOURCES = ["market_update", "manual", "contract", "utility_bill"];

const EnergyCostRatesManager = ({ filterType = "all", compact = false }: EnergyCostRatesManagerProps) => {
  const { organizationId } = useOrganization();
  const { formatCurrency, settings } = useOrganizationSettings();
  const queryClient = useQueryClient();

  // Quick-set state
  const [quickSetOpen, setQuickSetOpen] = useState<string | null>(null); // "diesel" | "petrol" | "ev" | null
  const [quickPrice, setQuickPrice] = useState("");

  // Full form state
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

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      if (!organizationId) throw new Error("No org");
      const { error } = await (supabase as any).from("energy_cost_rates").insert({
        organization_id: organizationId,
        ...payload,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["energy-cost-rates"] });
      queryClient.invalidateQueries({ queryKey: ["current-energy-rate"] });
      toast.success("Price updated successfully");
    },
    onError: () => toast.error("Failed to save price"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("energy_cost_rates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["energy-cost-rates"] });
      queryClient.invalidateQueries({ queryKey: ["current-energy-rate"] });
      toast.success("Rate removed");
    },
  });

  // Quick set handler
  const handleQuickSet = (energyType: string, fuelType: string | null) => {
    if (!quickPrice || isNaN(parseFloat(quickPrice))) return;
    const today = new Date().toISOString().split("T")[0];

    // Close any previous rate of same type
    const prevActive = rates.find(
      (r: any) =>
        r.energy_type === energyType &&
        (!fuelType || r.fuel_type === fuelType) &&
        r.effective_from <= today &&
        (!r.effective_until || r.effective_until >= today)
    );

    saveMutation.mutate({
      energy_type: energyType,
      fuel_type: fuelType,
      rate_per_unit: parseFloat(quickPrice),
      unit: energyType === "ev_charging" ? "kWh" : "liter",
      effective_from: today,
      source: "manual",
      notes: "Quick price update",
    });

    setQuickSetOpen(null);
    setQuickPrice("");
  };

  const handleFullCreate = () => {
    saveMutation.mutate({
      energy_type: form.energy_type,
      fuel_type: form.energy_type === "fuel" ? form.fuel_type : null,
      rate_per_unit: parseFloat(form.rate_per_unit),
      unit: form.energy_type === "ev_charging" ? "kWh" : form.unit,
      effective_from: form.effective_from,
      effective_until: form.effective_until || null,
      source: form.source,
      notes: form.notes || null,
    });
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
  };

  const today = new Date().toISOString().split("T")[0];

  // Get current rate for a specific type
  const getCurrentRate = (energyType: string, fuelType?: string) => {
    return rates.find(
      (r: any) =>
        r.energy_type === energyType &&
        (!fuelType || r.fuel_type === fuelType) &&
        r.effective_from <= today &&
        (!r.effective_until || r.effective_until >= today)
    );
  };

  const getTrend = (energyType: string, fuelType?: string) => {
    const filtered = rates
      .filter((r: any) => r.energy_type === energyType && (!fuelType || r.fuel_type === fuelType))
      .sort((a: any, b: any) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime());
    if (filtered.length < 2) return null;
    const diff = filtered[0].rate_per_unit - filtered[1].rate_per_unit;
    const pct = ((diff / filtered[1].rate_per_unit) * 100).toFixed(1);
    return { diff, pct, direction: diff > 0 ? "up" : diff < 0 ? "down" : "flat" };
  };

  // Build price cards based on filter
  const priceCards = [];
  if (filterType === "fuel" || filterType === "all") {
    priceCards.push(
      { key: "diesel", energyType: "fuel", fuelType: "diesel", label: "Diesel", icon: Fuel, iconClass: "text-amber-400", unit: "/L" },
      { key: "petrol", energyType: "fuel", fuelType: "petrol", label: "Petrol", icon: Fuel, iconClass: "text-orange-400", unit: "/L" },
    );
  }
  if (filterType === "ev_charging" || filterType === "all") {
    priceCards.push(
      { key: "ev", energyType: "ev_charging", fuelType: undefined, label: "EV Charging", icon: Zap, iconClass: "text-emerald-400", unit: "/kWh" },
    );
  }

  return (
    <div className="space-y-5">
      {/* Current Prices - Quick Set Panel */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground">
          Set Current Prices
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {priceCards.map((card) => {
            const current = getCurrentRate(card.energyType, card.fuelType);
            const fallback = card.energyType === "fuel" ? settings.fuel_price_per_liter : 0;
            const price = current?.rate_per_unit ?? fallback;
            const trend = getTrend(card.energyType, card.fuelType);
            const isEditing = quickSetOpen === card.key;

            return (
              <Card key={card.key} className="glass-strong border-primary/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <card.icon className={`w-4 h-4 ${card.iconClass}`} />
                      <span className="text-sm font-medium">{card.label}</span>
                    </div>
                    {current ? (
                      <Badge variant="outline" className="text-[10px] text-green-400 border-green-500/30">Active</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Default</Badge>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="New price"
                          value={quickPrice}
                          onChange={(e) => setQuickPrice(e.target.value)}
                          className="h-9"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          className="h-9 px-3"
                          disabled={!quickPrice || saveMutation.isPending}
                          onClick={() => handleQuickSet(card.energyType, card.fuelType || null)}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-7 text-xs"
                        onClick={() => { setQuickSetOpen(null); setQuickPrice(""); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold">{formatCurrency(price)}</span>
                        <span className="text-xs text-muted-foreground">{card.unit}</span>
                      </div>
                      {trend && (
                        <div className={`flex items-center gap-1 mt-1 text-xs ${trend.direction === "up" ? "text-destructive" : "text-green-400"}`}>
                          {trend.direction === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          <span>{trend.direction === "up" ? "+" : ""}{trend.pct}%</span>
                        </div>
                      )}
                      {current && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Since {format(new Date(current.effective_from), "MMM d, yyyy")}
                        </p>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2 h-8 text-xs gap-1.5"
                        onClick={() => { setQuickSetOpen(card.key); setQuickPrice(String(price)); }}
                      >
                        <Edit2 className="w-3 h-3" /> Update Price
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Rate History */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Price History ({rates.length})</span>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-2 text-xs">
              <Plus className="w-3.5 h-3.5" /> Schedule Future Rate
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Schedule Energy Cost Rate</DialogTitle></DialogHeader>
            <div className="space-y-4">
              {filterType === "all" && (
                <div>
                  <Label>Energy Type</Label>
                  <Select value={form.energy_type} onValueChange={v => setForm(f => ({ ...f, energy_type: v as "fuel" | "ev_charging", unit: v === "ev_charging" ? "kWh" : "liter" }))}>
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
                  <Label>Rate per {form.energy_type === "ev_charging" ? "kWh" : "liter"}</Label>
                  <Input type="number" step="0.01" placeholder="e.g. 65.50" value={form.rate_per_unit} onChange={e => setForm(f => ({ ...f, rate_per_unit: e.target.value }))} />
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
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Reason for price change..." />
              </div>
              <Button onClick={handleFullCreate} disabled={!form.rate_per_unit || !form.effective_from || saveMutation.isPending} className="w-full">
                {saveMutation.isPending ? "Saving..." : "Save Rate"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-6 text-muted-foreground text-sm">Loading...</div>
      ) : rates.length === 0 ? (
        <Card className="glass-strong">
          <CardContent className="p-6 text-center text-muted-foreground">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No price history yet. Set your current prices above.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {rates.map((rate: any) => {
            const isActive = rate.effective_from <= today && (!rate.effective_until || rate.effective_until >= today);
            const isEV = rate.energy_type === "ev_charging";
            return (
              <Card key={rate.id} className={`glass-strong ${isActive ? "border-primary/20" : ""}`}>
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-1.5 h-8 rounded-full shrink-0 ${isActive ? "bg-green-400" : "bg-muted-foreground/20"}`} />
                    {isEV ? <Zap className="w-4 h-4 text-emerald-400 shrink-0" /> : <Fuel className="w-4 h-4 text-amber-400 shrink-0" />}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{formatCurrency(rate.rate_per_unit)}/{rate.unit}</span>
                        <Badge variant="outline" className="text-[10px] capitalize">{isEV ? "EV" : rate.fuel_type}</Badge>
                        {isActive && <Badge className="text-[10px] bg-green-500/20 text-green-400 border-0">Current</Badge>}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {format(new Date(rate.effective_from), "MMM d, yyyy")}
                        {rate.effective_until ? ` → ${format(new Date(rate.effective_until), "MMM d, yyyy")}` : " → Present"}
                        {rate.source ? ` · ${rate.source.replace("_", " ")}` : ""}
                        {rate.notes ? ` · ${rate.notes}` : ""}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0 h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate(rate.id)}>
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
