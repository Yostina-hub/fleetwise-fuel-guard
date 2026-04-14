import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Bus, Plus, Search, MapPin, Clock, UserCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { useTranslation } from 'react-i18next';
const PassengerTracking = () => {
  const { t } = useTranslation();
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"manifests" | "boardings" | "analytics">("manifests");
  const [search, setSearch] = useState("");
  const [showCreateManifest, setShowCreateManifest] = useState(false);
  const [newManifest, setNewManifest] = useState({ vehicle_id: "", route_name: "", max_capacity: 50, driver_id: "" });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase.from("vehicles").select("id, plate_number, make, model").eq("organization_id", organizationId);
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase.from("drivers").select("id, first_name, last_name").eq("organization_id", organizationId);
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: manifests = [], isLoading } = useQuery({
    queryKey: ["passenger-manifests", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("passenger_manifests")
        .select("*")
        .eq("organization_id", organizationId)
        .order("departure_time", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const createManifestMutation = useMutation({
    mutationFn: async (manifest: typeof newManifest) => {
      if (!organizationId) throw new Error("No org");
      const { error } = await supabase.from("passenger_manifests").insert({
        organization_id: organizationId,
        vehicle_id: manifest.vehicle_id,
        route_name: manifest.route_name,
        max_capacity: manifest.max_capacity,
        driver_id: manifest.driver_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["passenger-manifests"] });
      setShowCreateManifest(false);
      toast.success("Manifest created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filteredManifests = useMemo(() => {
    if (!search) return manifests;
    const s = search.toLowerCase();
    return manifests.filter(m =>
      m.route_name?.toLowerCase().includes(s) || m.status?.toLowerCase().includes(s)
    );
  }, [manifests, search]);

  const getVehiclePlate = (id: string) => vehicles.find(v => v.id === id)?.plate_number || "N/A";
  const getDriverName = (id?: string | null) => {
    if (!id) return "—";
    const d = drivers.find(dr => dr.id === id);
    return d ? `${d.first_name} ${d.last_name}` : "—";
  };

  const activeManifests = manifests.filter(m => m.status === "active").length;
  const totalPassengers = manifests.reduce((s, m) => s + (m.total_passengers || 0), 0);

  const tabs = [
    { key: "manifests", label: "Manifests", icon: Bus },
    { key: "boardings", label: "Boarding Log", icon: UserCheck },
    { key: "analytics", label: "Analytics", icon: Users },
  ] as const;

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('pages.passenger_tracking.title', 'Passenger Tracking')}</h1>
            <p className="text-muted-foreground text-sm">{t('pages.passenger_tracking.description', 'Manage bus/shuttle passengers, manifests, and boarding logs')}</p>
          </div>
          <Button className="gap-2" onClick={() => setShowCreateManifest(true)}>
            <Plus className="w-4 h-4" /> New Manifest
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Bus className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Active Trips</p>
                <p className="text-2xl font-bold">{activeManifests}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10"><Users className="w-5 h-5 text-success" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Total Passengers</p>
                <p className="text-2xl font-bold">{totalPassengers}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10"><MapPin className="w-5 h-5 text-warning" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Total Manifests</p>
                <p className="text-2xl font-bold">{manifests.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Nav */}
        <div className="flex gap-1 bg-muted/50 p-1 rounded-lg w-fit">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === t.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search manifests..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : activeTab === "manifests" ? (
          <Card>
            <CardHeader><CardTitle>Passenger Manifests</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Route</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Passengers</TableHead>
                    <TableHead>Departure</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredManifests.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No manifests found</TableCell></TableRow>
                  ) : filteredManifests.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.route_name || "—"}</TableCell>
                      <TableCell>{getVehiclePlate(m.vehicle_id)}</TableCell>
                      <TableCell>{getDriverName(m.driver_id)}</TableCell>
                      <TableCell>
                        <span className="font-semibold">{m.total_passengers}</span>
                        {m.max_capacity && <span className="text-muted-foreground">/{m.max_capacity}</span>}
                      </TableCell>
                      <TableCell className="text-sm">{format(new Date(m.departure_time), "dd MMM, HH:mm")}</TableCell>
                      <TableCell>
                        <Badge variant={m.status === "active" ? "default" : "secondary"}>
                          {m.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : activeTab === "boardings" ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <UserCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a manifest to view boarding details</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Occupancy Rate</CardTitle></CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-primary">
                  {manifests.length > 0
                    ? Math.round((totalPassengers / manifests.reduce((s, m) => s + (m.max_capacity || 50), 0)) * 100)
                    : 0}%
                </div>
                <p className="text-sm text-muted-foreground mt-1">Average across all manifests</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Peak Hours</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <span className="text-muted-foreground">7:00 AM – 9:00 AM</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Highest boarding frequency</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Create Manifest Dialog */}
        <Dialog open={showCreateManifest} onOpenChange={setShowCreateManifest}>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Passenger Manifest</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Route Name</Label>
                <Input value={newManifest.route_name} onChange={e => setNewManifest(p => ({ ...p, route_name: e.target.value }))} placeholder="e.g., Bole → Megenagna" />
              </div>
              <div>
                <Label>Vehicle</Label>
                <Select value={newManifest.vehicle_id} onValueChange={v => setNewManifest(p => ({ ...p, vehicle_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                  <SelectContent>
                    {vehicles.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.plate_number} — {v.make} {v.model}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Driver</Label>
                <Select value={newManifest.driver_id} onValueChange={v => setNewManifest(p => ({ ...p, driver_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
                  <SelectContent>
                    {drivers.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Max Capacity</Label>
                <Input type="number" value={newManifest.max_capacity} onChange={e => setNewManifest(p => ({ ...p, max_capacity: parseInt(e.target.value) || 50 }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateManifest(false)}>Cancel</Button>
              <Button onClick={() => createManifestMutation.mutate(newManifest)} disabled={!newManifest.vehicle_id}>
                Create Manifest
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default PassengerTracking;
