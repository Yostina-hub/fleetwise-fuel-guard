import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useDrivers } from "@/hooks/useDrivers";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  ClipboardCheck, Plus, CheckCircle2, XCircle, AlertTriangle, Wrench, Filter,
} from "lucide-react";

const INSPECTION_ITEMS = [
  { category: "Exterior", items: ["Tires & Wheels", "Lights & Reflectors", "Mirrors", "Windshield & Wipers", "Body Damage", "Fluid Leaks"] },
  { category: "Interior", items: ["Seat & Seatbelt", "Dashboard Gauges", "Horn", "Steering", "Brakes", "Emergency Equipment"] },
  { category: "Engine", items: ["Oil Level", "Coolant Level", "Battery", "Belts & Hoses", "Air Filter", "Exhaust System"] },
  { category: "Safety", items: ["Fire Extinguisher", "First Aid Kit", "Warning Triangles", "Spare Tire & Jack", "Emergency Contacts Visible"] },
];

interface DVIRReport {
  id: string;
  driver_id: string;
  vehicle_id: string;
  inspection_type: string;
  inspection_date: string;
  odometer_reading: number | null;
  defect_count: number;
  overall_status: string;
  certified_safe: boolean;
  mechanic_review_status: string;
  notes: string | null;
}

export const DriverDVIRPanel = () => {
  const { organizationId } = useOrganization();
  const { drivers } = useDrivers();
  const { user } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<DVIRReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [vehicles, setVehicles] = useState<{ id: string; plate_number: string; make: string; model: string }[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");

  // Form state
  const [form, setForm] = useState({
    driver_id: "", vehicle_id: "", inspection_type: "pre_trip", odometer_reading: "",
    notes: "", certified_safe: true,
  });
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [defects, setDefects] = useState<string[]>([]);

  const fetchData = async () => {
    if (!organizationId) return;
    setLoading(true);
    const [reportsRes, vehiclesRes] = await Promise.all([
      supabase.from("driver_dvir_reports").select("*").eq("organization_id", organizationId).order("inspection_date", { ascending: false }).limit(200),
      supabase.from("vehicles").select("id, plate_number, make, model").eq("organization_id", organizationId).eq("status", "active"),
    ]);
    setReports((reportsRes.data as any) || []);
    setVehicles((vehiclesRes.data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [organizationId]);

  const initChecklist = () => {
    const items: Record<string, boolean> = {};
    INSPECTION_ITEMS.forEach(cat => cat.items.forEach(item => { items[`${cat.category}:${item}`] = true; }));
    setCheckedItems(items);
    setDefects([]);
  };

  useEffect(() => { initChecklist(); }, []);

  const toggleItem = (key: string) => {
    const newVal = !checkedItems[key];
    setCheckedItems(prev => ({ ...prev, [key]: newVal }));
    if (!newVal) setDefects(prev => [...prev, key]);
    else setDefects(prev => prev.filter(d => d !== key));
  };

  const createDVIR = async () => {
    if (!organizationId || !form.driver_id || !form.vehicle_id) {
      toast({ title: "Driver and vehicle are required", variant: "destructive" }); return;
    }
    const allItems = Object.entries(checkedItems).map(([key, passed]) => ({ item: key, passed }));
    const defectsFound = allItems.filter(i => !i.passed).map(i => ({ item: i.item, severity: "minor" }));
    const overallStatus = defectsFound.length === 0 ? "pass" : defectsFound.length <= 2 ? "conditional" : "fail";

    await supabase.from("driver_dvir_reports").insert({
      organization_id: organizationId,
      driver_id: form.driver_id,
      vehicle_id: form.vehicle_id,
      inspection_type: form.inspection_type,
      odometer_reading: form.odometer_reading ? parseFloat(form.odometer_reading) : null,
      items_inspected: allItems,
      defects_found: defectsFound,
      defect_count: defectsFound.length,
      overall_status: overallStatus,
      certified_safe: form.certified_safe && defectsFound.length === 0,
      notes: form.notes || null,
      mechanic_review_status: defectsFound.length > 0 ? "pending" : "not_required",
    });

    toast({ title: "DVIR report submitted" });
    setShowCreate(false);
    setForm({ driver_id: "", vehicle_id: "", inspection_type: "pre_trip", odometer_reading: "", notes: "", certified_safe: true });
    initChecklist();
    fetchData();
  };

  const getDriver = (id: string) => drivers.find(d => d.id === id);
  const getVehicle = (id: string) => vehicles.find(v => v.id === id);

  const filtered = filterStatus === "all" ? reports : reports.filter(r => r.overall_status === filterStatus);

  const stats = {
    total: reports.length,
    pass: reports.filter(r => r.overall_status === "pass").length,
    fail: reports.filter(r => r.overall_status === "fail").length,
    pendingReview: reports.filter(r => r.mechanic_review_status === "pending").length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Inspections", value: stats.total, icon: ClipboardCheck, color: "text-primary" },
          { label: "Passed", value: stats.pass, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Failed", value: stats.fail, icon: XCircle, color: "text-destructive" },
          { label: "Pending Review", value: stats.pendingReview, icon: Wrench, color: "text-amber-400" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3 text-center">
              <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]"><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pass">Passed</SelectItem>
            <SelectItem value="conditional">Conditional</SelectItem>
            <SelectItem value="fail">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="gap-2 ml-auto"><Plus className="w-4 h-4" /> New Inspection</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Digital Vehicle Inspection Report (DVIR)</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Driver *</Label>
                  <Select value={form.driver_id} onValueChange={v => setForm(p => ({ ...p, driver_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
                    <SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Vehicle *</Label>
                  <Select value={form.vehicle_id} onValueChange={v => setForm(p => ({ ...p, vehicle_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                    <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.plate_number} — {v.make} {v.model}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Inspection Type</Label>
                  <Select value={form.inspection_type} onValueChange={v => setForm(p => ({ ...p, inspection_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["pre_trip", "post_trip", "en_route", "periodic"].map(t => (
                        <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Odometer Reading</Label>
                  <Input type="number" value={form.odometer_reading} onChange={e => setForm(p => ({ ...p, odometer_reading: e.target.value }))} placeholder="km" />
                </div>
              </div>

              {/* Inspection Checklist */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Inspection Checklist</Label>
                {INSPECTION_ITEMS.map(cat => (
                  <div key={cat.category} className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">{cat.category}</p>
                    <div className="grid grid-cols-2 gap-1">
                      {cat.items.map(item => {
                        const key = `${cat.category}:${item}`;
                        return (
                          <div key={key} className={`flex items-center gap-2 p-2 rounded border text-sm cursor-pointer transition-colors ${checkedItems[key] ? "bg-emerald-500/5 border-emerald-500/20" : "bg-destructive/5 border-destructive/20"}`} onClick={() => toggleItem(key)}>
                            <Checkbox checked={checkedItems[key]} onCheckedChange={() => toggleItem(key)} />
                            <span className={checkedItems[key] ? "" : "text-destructive"}>{item}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {defects.length > 0 && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm font-medium text-destructive">{defects.length} defect(s) found</p>
                  <ul className="text-xs text-destructive/80 mt-1">
                    {defects.map(d => <li key={d}>• {d.split(":")[1]}</li>)}
                  </ul>
                </div>
              )}

              <div>
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={createDVIR}>Submit DVIR</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Reports List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            DVIR Reports
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {filtered.map(r => {
            const driver = getDriver(r.driver_id);
            const vehicle = getVehicle(r.vehicle_id);
            return (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                {r.overall_status === "pass" ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> :
                 r.overall_status === "fail" ? <XCircle className="w-5 h-5 text-destructive shrink-0" /> :
                 <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{driver ? `${driver.first_name} ${driver.last_name}` : "Unknown"}</span>
                    <span className="text-xs text-muted-foreground">→</span>
                    <span className="text-sm">{vehicle ? `${vehicle.plate_number}` : "Unknown"}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">{r.inspection_type.replace(/_/g, " ")}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                    <span>{format(new Date(r.inspection_date), "MMM d, yyyy HH:mm")}</span>
                    {r.defect_count > 0 && <Badge variant="destructive" className="text-[10px]">{r.defect_count} defect(s)</Badge>}
                    {r.odometer_reading && <span>{r.odometer_reading.toLocaleString()} km</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <Badge variant={r.overall_status === "pass" ? "default" : r.overall_status === "fail" ? "destructive" : "secondary"} className="text-[10px] capitalize">{r.overall_status}</Badge>
                  {r.mechanic_review_status !== "not_required" && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{r.mechanic_review_status.replace(/_/g, " ")}</p>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              <ClipboardCheck className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No inspection reports found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
