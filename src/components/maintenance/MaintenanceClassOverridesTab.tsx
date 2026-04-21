/**
 * MaintenanceClassOverridesTab
 *
 * Lets fleet ops tune the maintenance auto-scheduler per vehicle class
 * (vehicles.vehicle_type) without editing every maintenance_schedule row.
 *
 * Each row in `maintenance_class_overrides` can override:
 *   - mtbf_days              (threshold for interval_type='mtbf' schedules)
 *   - reminder_days_before   (date-based schedules)
 *   - reminder_km_before     (odometer-based schedules)
 *   - reminder_hours_before  (engine-hour schedules)
 *   - priority               (priority on the auto-generated WO)
 *
 * Specific service_type rows win over wildcard (service_type IS NULL).
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Pencil, Trash2, Sliders } from "lucide-react";
import { toast } from "sonner";

interface OverrideRow {
  id: string;
  organization_id: string;
  vehicle_type: string;
  service_type: string | null;
  mtbf_days: number | null;
  reminder_days_before: number | null;
  reminder_km_before: number | null;
  reminder_hours_before: number | null;
  priority: string | null;
  notes: string | null;
  is_active: boolean;
  updated_at: string;
}

const PRIORITIES = ["low", "medium", "high", "critical"];

const emptyForm = {
  vehicle_type: "",
  service_type: "",
  mtbf_days: "",
  reminder_days_before: "",
  reminder_km_before: "",
  reminder_hours_before: "",
  priority: "",
  notes: "",
  is_active: true,
};

export default function MaintenanceClassOverridesTab() {
  const { organizationId } = useOrganization();
  const [rows, setRows] = useState<OverrideRow[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OverrideRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    if (!organizationId) return;
    setLoading(true);
    const [{ data }, { data: vts }, { data: sts }] = await Promise.all([
      (supabase as any)
        .from("maintenance_class_overrides")
        .select("*")
        .eq("organization_id", organizationId)
        .order("vehicle_type", { ascending: true }),
      supabase
        .from("vehicles")
        .select("vehicle_type")
        .eq("organization_id", organizationId)
        .not("vehicle_type", "is", null),
      supabase
        .from("maintenance_schedules")
        .select("service_type")
        .eq("organization_id", organizationId),
    ]);
    setRows((data as OverrideRow[]) || []);
    setVehicleTypes(
      Array.from(new Set((vts ?? []).map((v: any) => v.vehicle_type).filter(Boolean))).sort(),
    );
    setServiceTypes(
      Array.from(new Set((sts ?? []).map((s: any) => s.service_type).filter(Boolean))).sort(),
    );
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const startCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const startEdit = (r: OverrideRow) => {
    setEditing(r);
    setForm({
      vehicle_type: r.vehicle_type,
      service_type: r.service_type ?? "",
      mtbf_days: r.mtbf_days?.toString() ?? "",
      reminder_days_before: r.reminder_days_before?.toString() ?? "",
      reminder_km_before: r.reminder_km_before?.toString() ?? "",
      reminder_hours_before: r.reminder_hours_before?.toString() ?? "",
      priority: r.priority ?? "",
      notes: r.notes ?? "",
      is_active: r.is_active,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!organizationId) return;
    if (!form.vehicle_type) {
      toast.error("Vehicle class is required");
      return;
    }
    const intOrNull = (s: string) => (s.trim() === "" ? null : Math.max(0, Math.floor(Number(s))));
    const payload = {
      organization_id: organizationId,
      vehicle_type: form.vehicle_type,
      service_type: form.service_type.trim() === "" ? null : form.service_type,
      mtbf_days: intOrNull(form.mtbf_days),
      reminder_days_before: intOrNull(form.reminder_days_before),
      reminder_km_before: intOrNull(form.reminder_km_before),
      reminder_hours_before: intOrNull(form.reminder_hours_before),
      priority: form.priority.trim() === "" ? null : form.priority,
      notes: form.notes.trim() === "" ? null : form.notes,
      is_active: form.is_active,
    };
    setSaving(true);
    const res = editing
      ? await (supabase as any)
          .from("maintenance_class_overrides")
          .update(payload)
          .eq("id", editing.id)
      : await (supabase as any).from("maintenance_class_overrides").insert(payload);
    setSaving(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success(editing ? "Override updated" : "Override created");
    setOpen(false);
    refresh();
  };

  const remove = async (r: OverrideRow) => {
    if (!confirm(`Delete override for ${r.vehicle_type}${r.service_type ? ` / ${r.service_type}` : ""}?`)) return;
    const { error } = await (supabase as any)
      .from("maintenance_class_overrides")
      .delete()
      .eq("id", r.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Override deleted");
    refresh();
  };

  const summary = (r: OverrideRow) =>
    [
      r.mtbf_days != null && `MTBF ≤ ${r.mtbf_days}d`,
      r.reminder_days_before != null && `${r.reminder_days_before}d early`,
      r.reminder_km_before != null && `${r.reminder_km_before}km early`,
      r.reminder_hours_before != null && `${r.reminder_hours_before}h early`,
      r.priority && `priority: ${r.priority}`,
    ]
      .filter(Boolean)
      .join(" · ") || "—";

  const grouped = useMemo(() => {
    const map = new Map<string, OverrideRow[]>();
    for (const r of rows) {
      const arr = map.get(r.vehicle_type) ?? [];
      arr.push(r);
      map.set(r.vehicle_type, arr);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);

  return (
    <Card className="glass-strong">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sliders className="w-5 h-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <CardTitle>Class-based MTBF & Reminder Overrides</CardTitle>
            <CardDescription>
              Tune the auto-scheduler per vehicle class. Specific service-type rows win over wildcard rows.
            </CardDescription>
          </div>
        </div>
        <Button onClick={startCreate} className="gap-2">
          <Plus className="w-4 h-4" aria-hidden="true" />
          New Override
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" aria-hidden="true" />
            Loading overrides…
          </div>
        ) : grouped.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No class overrides yet. Create one to tune the auto-scheduler for a specific vehicle class.
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([vt, items]) => (
              <div key={vt}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="font-mono">
                    {vt}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{items.length} rule(s)</span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service Type</TableHead>
                      <TableHead>Effective Tuning</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">
                          {r.service_type ?? <span className="italic text-muted-foreground">All service types</span>}
                        </TableCell>
                        <TableCell className="text-sm">{summary(r)}</TableCell>
                        <TableCell>
                          <Badge variant={r.is_active ? "default" : "secondary"}>
                            {r.is_active ? "Active" : "Disabled"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button size="sm" variant="ghost" onClick={() => startEdit(r)}>
                            <Pencil className="w-4 h-4" aria-hidden="true" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => remove(r)}>
                            <Trash2 className="w-4 h-4 text-destructive" aria-hidden="true" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit override" : "New class override"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="ovr-vt">Vehicle class *</Label>
                <Select
                  value={form.vehicle_type}
                  onValueChange={(v) => setForm({ ...form, vehicle_type: v })}
                >
                  <SelectTrigger id="ovr-vt">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleTypes.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="ovr-st">Service type</Label>
                <Select
                  value={form.service_type || "__all__"}
                  onValueChange={(v) => setForm({ ...form, service_type: v === "__all__" ? "" : v })}
                >
                  <SelectTrigger id="ovr-st">
                    <SelectValue placeholder="All service types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All service types</SelectItem>
                    {serviceTypes.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="ovr-mtbf">MTBF threshold (days)</Label>
                <Input
                  id="ovr-mtbf"
                  type="number"
                  min={0}
                  value={form.mtbf_days}
                  onChange={(e) => setForm({ ...form, mtbf_days: e.target.value })}
                  placeholder="e.g. 60"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ovr-prio">Priority on auto-WO</Label>
                <Select
                  value={form.priority || "__none__"}
                  onValueChange={(v) => setForm({ ...form, priority: v === "__none__" ? "" : v })}
                >
                  <SelectTrigger id="ovr-prio">
                    <SelectValue placeholder="Inherit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Inherit from schedule</SelectItem>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="ovr-rd">Reminder (days)</Label>
                <Input
                  id="ovr-rd"
                  type="number"
                  min={0}
                  value={form.reminder_days_before}
                  onChange={(e) => setForm({ ...form, reminder_days_before: e.target.value })}
                  placeholder="7"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ovr-rk">Reminder (km)</Label>
                <Input
                  id="ovr-rk"
                  type="number"
                  min={0}
                  value={form.reminder_km_before}
                  onChange={(e) => setForm({ ...form, reminder_km_before: e.target.value })}
                  placeholder="500"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ovr-rh">Reminder (hrs)</Label>
                <Input
                  id="ovr-rh"
                  type="number"
                  min={0}
                  value={form.reminder_hours_before}
                  onChange={(e) => setForm({ ...form, reminder_hours_before: e.target.value })}
                  placeholder="25"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="ovr-notes">Notes</Label>
              <Input
                id="ovr-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="e.g. Mining-route trucks: tighter MTBF for axle service"
              />
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="ovr-active">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Disabled overrides are ignored by the auto-scheduler.
                </p>
              </div>
              <Switch
                id="ovr-active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}
              Save override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
