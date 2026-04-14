import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { MapPin, Plus, Plug, Zap } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

export const EVChargingStations = () => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", max_power_kw: "", num_ports: "1", cost_per_kwh: "", operator_name: "" });

  const { data: stations, isLoading } = useQuery({
    queryKey: ["ev-charging-stations", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ev_charging_stations")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("ev_charging_stations").insert({
        organization_id: organizationId!,
        name: form.name,
        address: form.address || null,
        max_power_kw: form.max_power_kw ? parseFloat(form.max_power_kw) : null,
        num_ports: form.num_ports ? parseInt(form.num_ports) : 1,
        cost_per_kwh: form.cost_per_kwh ? parseFloat(form.cost_per_kwh) : null,
        operator_name: form.operator_name || null,
        is_available: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Charging station added");
      queryClient.invalidateQueries({ queryKey: ["ev-charging-stations"] });
      setShowAdd(false);
      setForm({ name: "", address: "", max_power_kw: "", num_ports: "1", cost_per_kwh: "", operator_name: "" });
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) return <Card className="animate-pulse h-48" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold">Charging Stations</h3>
          <p className="text-xs text-muted-foreground">{stations?.length || 0} stations registered</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}>
          <Plus className="w-3.5 h-3.5" /> Add Station
        </Button>
      </div>

      {(!stations || stations.length === 0) ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No charging stations added</p>
            <p className="text-xs mt-1">Add your organization's EV charging stations to track usage and availability.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stations.map((station: any) => (
            <Card key={station.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${station.is_available ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      <Plug className={`w-4 h-4 ${station.is_available ? 'text-green-500' : 'text-red-500'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{station.name}</p>
                      <p className="text-[10px] text-muted-foreground">{station.operator_name || "Self-operated"}</p>
                    </div>
                  </div>
                  <Badge variant={station.is_available ? "default" : "destructive"} className="text-[10px]">
                    {station.is_available ? "Available" : "Offline"}
                  </Badge>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  {station.address && (
                    <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {station.address}</div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3 h-3" /> {station.max_power_kw || "—"} kW · {station.num_ports} port(s)
                  </div>
                  {station.cost_per_kwh && <p className="text-xs">{station.cost_per_kwh} ETB/kWh</p>}
                </div>
                {station.connector_types?.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {station.connector_types.map((ct: string) => (
                      <Badge key={ct} variant="outline" className="text-[10px]">{ct}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Charging Station</DialogTitle>
            <DialogDescription>Register a new EV charging station.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Station Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Station A" /></div>
              <div><Label>Operator</Label><Input value={form.operator_name} onChange={e => setForm(f => ({ ...f, operator_name: e.target.value }))} placeholder="Self-operated" /></div>
            </div>
            <div><Label>Address</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Location address" /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Max Power (kW)</Label><Input type="number" value={form.max_power_kw} onChange={e => setForm(f => ({ ...f, max_power_kw: e.target.value }))} placeholder="50" /></div>
              <div><Label>Ports</Label><Input type="number" value={form.num_ports} onChange={e => setForm(f => ({ ...f, num_ports: e.target.value }))} /></div>
              <div><Label>Cost/kWh (ETB)</Label><Input type="number" value={form.cost_per_kwh} onChange={e => setForm(f => ({ ...f, cost_per_kwh: e.target.value }))} placeholder="3.50" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={() => addMutation.mutate()} disabled={!form.name || addMutation.isPending}>
              {addMutation.isPending ? "Adding..." : "Add Station"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
