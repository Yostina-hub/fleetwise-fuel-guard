import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Battery, BatteryCharging, BatteryWarning, Zap, Car, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useVehicles } from "@/hooks/useVehicles";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export const EVFleetOverview = () => {
  const { organizationId } = useOrganization();
  const { vehicles } = useVehicles();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ vehicle_id: "", battery_capacity_kwh: "", battery_type: "Li-ion", charging_connector_type: "Type 2", current_soc_percent: "100", battery_health_percent: "100" });

  const { data: evVehicles, isLoading } = useQuery({
    queryKey: ["ev-vehicles", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ev_vehicle_data")
        .select("*, vehicles(plate_number, make, model, status)")
        .eq("organization_id", organizationId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: recentSessions } = useQuery({
    queryKey: ["ev-recent-sessions", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ev_charging_sessions")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("start_time", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("ev_vehicle_data").insert({
        organization_id: organizationId!,
        vehicle_id: form.vehicle_id,
        battery_capacity_kwh: form.battery_capacity_kwh ? parseFloat(form.battery_capacity_kwh) : null,
        battery_type: form.battery_type,
        charging_connector_type: form.charging_connector_type,
        current_soc_percent: form.current_soc_percent ? parseFloat(form.current_soc_percent) : null,
        battery_health_percent: form.battery_health_percent ? parseFloat(form.battery_health_percent) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("EV vehicle data added");
      queryClient.invalidateQueries({ queryKey: ["ev-vehicles"] });
      setShowAdd(false);
      setForm({ vehicle_id: "", battery_capacity_kwh: "", battery_type: "Li-ion", charging_connector_type: "Type 2", current_soc_percent: "100", battery_health_percent: "100" });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const totalEV = evVehicles?.length || 0;
  const charging = evVehicles?.filter((v: any) => v.current_soc_percent !== null && v.current_soc_percent < 20).length || 0;
  const healthy = evVehicles?.filter((v: any) => v.battery_health_percent && v.battery_health_percent > 80).length || 0;
  const avgSoC = totalEV > 0
    ? Math.round(evVehicles.reduce((s: number, v: any) => s + (v.current_soc_percent || 0), 0) / totalEV)
    : 0;

  const stats = [
    { label: "Total EV Fleet", value: totalEV, icon: Car, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Average SoC", value: `${avgSoC}%`, icon: Battery, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Low Battery", value: charging, icon: BatteryWarning, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Healthy Battery", value: healthy, icon: Zap, color: "text-green-500", bg: "bg-green-500/10" },
  ];

  if (isLoading) {
    return <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => <Card key={i} className="animate-pulse h-28" />)}
    </div>;
  }

  // Filter vehicles not already EV
  const evVehicleIds = new Set(evVehicles?.map((e: any) => e.vehicle_id) || []);
  const availableVehicles = vehicles.filter((v: any) => !evVehicleIds.has(v.id));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}>
          <Plus className="w-3.5 h-3.5" /> Register EV Vehicle
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Battery className="w-4 h-4" /> EV Vehicle Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalEV === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Battery className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No EV vehicles registered yet.</p>
                <p className="text-xs mt-1">Add EV data to vehicles to see them here.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {evVehicles.map((ev: any) => (
                  <div key={ev.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div>
                      <p className="font-medium text-sm">{ev.vehicles?.plate_number || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{ev.vehicles?.make} {ev.vehicles?.model}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-bold">{ev.current_soc_percent ?? "--"}%</p>
                        <p className="text-[10px] text-muted-foreground">{ev.estimated_range_km ?? "--"} km range</p>
                      </div>
                      <Progress value={ev.current_soc_percent || 0} className="w-16 h-2" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BatteryCharging className="w-4 h-4" /> Recent Charging Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(!recentSessions || recentSessions.length === 0) ? (
              <div className="text-center py-8 text-muted-foreground">
                <Zap className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No charging sessions recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {recentSessions.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">{s.station_name || "Unknown Station"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(s.start_time).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{s.energy_consumed_kwh ?? "--"} kWh</p>
                      <Badge variant={s.status === "completed" ? "default" : "secondary"} className="text-[10px]">
                        {s.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add EV Vehicle Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register EV Vehicle</DialogTitle>
            <DialogDescription>Add electric vehicle data to an existing fleet vehicle.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Vehicle *</Label>
              <Select value={form.vehicle_id} onValueChange={v => setForm(f => ({ ...f, vehicle_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select a vehicle" /></SelectTrigger>
                <SelectContent>
                  {availableVehicles.slice(0, 50).map((v: any) => (
                    <SelectItem key={v.id} value={v.id}>{v.plate_number} — {v.make} {v.model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Battery Capacity (kWh)</Label><Input type="number" value={form.battery_capacity_kwh} onChange={e => setForm(f => ({ ...f, battery_capacity_kwh: e.target.value }))} placeholder="60" /></div>
              <div><Label>Battery Type</Label>
                <Select value={form.battery_type} onValueChange={v => setForm(f => ({ ...f, battery_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Li-ion">Li-ion</SelectItem>
                    <SelectItem value="LFP">LFP</SelectItem>
                    <SelectItem value="NMC">NMC</SelectItem>
                    <SelectItem value="Solid State">Solid State</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Connector Type</Label>
                <Select value={form.charging_connector_type} onValueChange={v => setForm(f => ({ ...f, charging_connector_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Type 1">Type 1</SelectItem>
                    <SelectItem value="Type 2">Type 2</SelectItem>
                    <SelectItem value="CCS1">CCS1</SelectItem>
                    <SelectItem value="CCS2">CCS2</SelectItem>
                    <SelectItem value="CHAdeMO">CHAdeMO</SelectItem>
                    <SelectItem value="GB/T">GB/T</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Current SoC (%)</Label><Input type="number" value={form.current_soc_percent} onChange={e => setForm(f => ({ ...f, current_soc_percent: e.target.value }))} /></div>
            </div>
            <div><Label>Battery Health (%)</Label><Input type="number" value={form.battery_health_percent} onChange={e => setForm(f => ({ ...f, battery_health_percent: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={() => addMutation.mutate()} disabled={!form.vehicle_id || addMutation.isPending}>
              {addMutation.isPending ? "Adding..." : "Register EV"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
