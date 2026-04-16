import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Cpu, Loader2, Search, Edit2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

const SENSOR_TYPES = [
  { value: "temperature", label: "Temperature" },
  { value: "door", label: "Door Sensor" },
  { value: "panic_button", label: "Panic Button" },
  { value: "tpms", label: "TPMS" },
  { value: "driver_id", label: "Driver ID" },
  { value: "fuel", label: "Fuel Sensor" },
  { value: "humidity", label: "Humidity" },
  { value: "load", label: "Load/Weight" },
  { value: "obd2", label: "OBD-II" },
];

const PROTOCOLS = [
  { value: "1-wire", label: "1-Wire" },
  { value: "ble", label: "BLE" },
  { value: "wired", label: "Wired" },
  { value: "rs485", label: "RS-485" },
  { value: "canbus", label: "CAN Bus" },
  { value: "analog", label: "Analog" },
];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  inactive: "bg-muted text-muted-foreground border-border",
  faulty: "bg-destructive/10 text-destructive border-destructive/20",
  maintenance: "bg-warning/10 text-warning border-warning/20",
  decommissioned: "bg-muted text-muted-foreground border-border",
};

const emptyForm = {
  sensor_type: "temperature",
  sensor_model: "",
  sensor_serial: "",
  manufacturer: "",
  protocol: "ble",
  firmware_version: "",
  installation_date: "",
  position_label: "",
  vehicle_id: "",
  notes: "",
  status: "active",
};

interface SensorInventoryTabProps {
  organizationId: string;
}

const SensorInventoryTab = ({ organizationId }: SensorInventoryTabProps) => {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [form, setForm] = useState(emptyForm);

  const { data: sensors = [], isLoading } = useQuery({
    queryKey: ["iot-sensors", organizationId, typeFilter],
    queryFn: async () => {
      let query = (supabase as any)
        .from("iot_sensors")
        .select("*, vehicles(plate_number, make, model)")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (typeFilter !== "all") query = query.eq("sensor_type", typeFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles-iot", organizationId],
    queryFn: async () => {
      const { data } = await supabase.from("vehicles").select("id, plate_number").eq("organization_id", organizationId).order("plate_number");
      return data || [];
    },
    enabled: !!organizationId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        organization_id: organizationId,
        sensor_type: form.sensor_type,
        sensor_model: form.sensor_model,
        sensor_serial: form.sensor_serial || null,
        manufacturer: form.manufacturer || null,
        protocol: form.protocol,
        firmware_version: form.firmware_version || null,
        installation_date: form.installation_date || null,
        position_label: form.position_label || null,
        vehicle_id: form.vehicle_id || null,
        notes: form.notes || null,
        status: form.status,
      };
      if (editingId) {
        const { error } = await (supabase as any).from("iot_sensors").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("iot_sensors").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iot-sensors"] });
      closeDialog();
      toast.success(editingId ? "Sensor updated" : "Sensor registered successfully");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("iot_sensors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iot-sensors"] });
      toast.success("Sensor deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const closeDialog = () => {
    setShowDialog(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const openEdit = (s: any) => {
    setEditingId(s.id);
    setForm({
      sensor_type: s.sensor_type,
      sensor_model: s.sensor_model || "",
      sensor_serial: s.sensor_serial || "",
      manufacturer: s.manufacturer || "",
      protocol: s.protocol || "ble",
      firmware_version: s.firmware_version || "",
      installation_date: s.installation_date ? s.installation_date.split("T")[0] : "",
      position_label: s.position_label || "",
      vehicle_id: s.vehicle_id || "",
      notes: s.notes || "",
      status: s.status || "active",
    });
    setShowDialog(true);
  };

  const filtered = sensors.filter((s: any) =>
    !search || s.sensor_model?.toLowerCase().includes(search.toLowerCase()) ||
    s.sensor_serial?.toLowerCase().includes(search.toLowerCase()) ||
    s.position_label?.toLowerCase().includes(search.toLowerCase()) ||
    s.vehicles?.plate_number?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: sensors.length,
    active: sensors.filter((s: any) => s.status === "active").length,
    faulty: sensors.filter((s: any) => s.status === "faulty").length,
    maintenance: sensors.filter((s: any) => s.status === "maintenance").length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-3"><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total Sensors</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><p className="text-2xl font-bold text-success">{stats.active}</p><p className="text-xs text-muted-foreground">Active</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><p className="text-2xl font-bold text-destructive">{stats.faulty}</p><p className="text-xs text-muted-foreground">Faulty</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3"><p className="text-2xl font-bold text-warning">{stats.maintenance}</p><p className="text-xs text-muted-foreground">In Maintenance</p></CardContent></Card>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search sensors..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {SENSOR_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => { setEditingId(null); setForm(emptyForm); setShowDialog(true); }}><Plus className="h-4 w-4 mr-2" /> Register Sensor</Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Serial</TableHead>
              <TableHead>Protocol</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Installed</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No sensors registered. Click "Register Sensor" to add one.</TableCell></TableRow>
            ) : filtered.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell><Badge variant="outline" className="uppercase text-xs">{s.sensor_type}</Badge></TableCell>
                <TableCell className="font-medium">{s.sensor_model}</TableCell>
                <TableCell className="font-mono text-xs">{s.sensor_serial || "—"}</TableCell>
                <TableCell className="text-xs">{s.protocol || "—"}</TableCell>
                <TableCell>{s.vehicles?.plate_number || "—"}</TableCell>
                <TableCell className="text-sm">{s.position_label || "—"}</TableCell>
                <TableCell><Badge className={STATUS_COLORS[s.status] || ""}>{s.status}</Badge></TableCell>
                <TableCell className="text-sm">{s.installation_date ? format(new Date(s.installation_date), "MMM dd, yyyy") : "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(s)}><Edit2 className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Delete this sensor?")) deleteMutation.mutate(s.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showDialog} onOpenChange={v => { if (!v) closeDialog(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Cpu className="h-5 w-5" /> {editingId ? "Edit Sensor" : "Register IoT Sensor"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Sensor Type</Label>
              <Select value={form.sensor_type} onValueChange={v => setForm(p => ({ ...p, sensor_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SENSOR_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Protocol</Label>
              <Select value={form.protocol} onValueChange={v => setForm(p => ({ ...p, protocol: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PROTOCOLS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Model *</Label>
              <Input value={form.sensor_model} onChange={e => setForm(p => ({ ...p, sensor_model: e.target.value }))} placeholder="e.g. DS18B20, Escort TD-BLE" />
            </div>
            <div>
              <Label>Serial Number</Label>
              <Input value={form.sensor_serial} onChange={e => setForm(p => ({ ...p, sensor_serial: e.target.value }))} placeholder="S/N" />
            </div>
            <div>
              <Label>Manufacturer</Label>
              <Input value={form.manufacturer} onChange={e => setForm(p => ({ ...p, manufacturer: e.target.value }))} placeholder="e.g. Escort, Queclink" />
            </div>
            <div>
              <Label>Vehicle</Label>
              <Select value={form.vehicle_id} onValueChange={v => setForm(p => ({ ...p, vehicle_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Assign to vehicle" /></SelectTrigger>
                <SelectContent>{vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Position Label</Label>
              <Input value={form.position_label} onChange={e => setForm(p => ({ ...p, position_label: e.target.value }))} placeholder="e.g. Rear Door, Front-Left" />
            </div>
            <div>
              <Label>Firmware Version</Label>
              <Input value={form.firmware_version} onChange={e => setForm(p => ({ ...p, firmware_version: e.target.value }))} placeholder="v1.0.0" />
            </div>
            <div>
              <Label>Installation Date</Label>
              <Input type="date" value={form.installation_date} onChange={e => setForm(p => ({ ...p, installation_date: e.target.value }))} />
            </div>
            {editingId && (
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="faulty">Faulty</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="decommissioned">Decommissioned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className={editingId ? "" : "col-span-2"}>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Installation notes..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.sensor_model || saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} {editingId ? "Update" : "Register"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SensorInventoryTab;
