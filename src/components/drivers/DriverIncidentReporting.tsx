import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useDrivers } from "@/hooks/useDrivers";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  AlertTriangle, Plus, Car, MapPin, FileText,
  ShieldAlert, Search, Filter,
} from "lucide-react";

const SEVERITY_CONFIG: Record<string, { color: string }> = {
  minor: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  moderate: { color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  major: { color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  critical: { color: "bg-destructive/20 text-destructive border-destructive/30" },
};

const STATUS_CONFIG: Record<string, { color: string }> = {
  reported: { color: "bg-blue-500/20 text-blue-400" },
  under_investigation: { color: "bg-amber-500/20 text-amber-400" },
  resolved: { color: "bg-emerald-500/20 text-emerald-400" },
  closed: { color: "bg-muted text-muted-foreground" },
  appealed: { color: "bg-purple-500/20 text-purple-400" },
};

interface Incident {
  id: string;
  driver_id: string;
  vehicle_id: string | null;
  incident_type: string;
  incident_date: string;
  location_name: string | null;
  severity: string;
  description: string;
  injuries: boolean;
  property_damage: boolean;
  damage_estimate_cost: number | null;
  police_report_number: string | null;
  insurance_claim_number: string | null;
  status: string;
  fault_determination: string | null;
  created_at: string;
}

export const DriverIncidentReporting = () => {
  const { organizationId } = useOrganization();
  const { drivers } = useDrivers();
  const { user } = useAuth();
  const { toast } = useToast();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [form, setForm] = useState({
    driver_id: "", vehicle_id: "", incident_type: "accident", severity: "minor",
    description: "", location_name: "", injuries: false, property_damage: false,
    damage_estimate_cost: "", police_report_number: "", insurance_claim_number: "",
  });

  const fetchIncidents = async () => {
    if (!organizationId) return;
    setLoading(true);
    const { data } = await supabase
      .from("driver_incidents")
      .select("*")
      .eq("organization_id", organizationId)
      .order("incident_date", { ascending: false })
      .limit(200);
    setIncidents((data as Incident[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchIncidents(); }, [organizationId]);

  const createIncident = async () => {
    if (!organizationId || !form.driver_id || !form.description.trim()) {
      toast({ title: "Driver and description are required", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("driver_incidents").insert({
      organization_id: organizationId,
      driver_id: form.driver_id,
      vehicle_id: form.vehicle_id || null,
      incident_type: form.incident_type,
      severity: form.severity,
      description: form.description,
      location_name: form.location_name || null,
      injuries: form.injuries,
      property_damage: form.property_damage,
      damage_estimate_cost: form.damage_estimate_cost ? parseFloat(form.damage_estimate_cost) : null,
      police_report_number: form.police_report_number || null,
      insurance_claim_number: form.insurance_claim_number || null,
      reported_by: user?.id,
    });
    if (error) { toast({ title: "Error creating incident", variant: "destructive" }); return; }
    toast({ title: "Incident reported" });
    setShowCreate(false);
    setForm({ driver_id: "", vehicle_id: "", incident_type: "accident", severity: "minor", description: "", location_name: "", injuries: false, property_damage: false, damage_estimate_cost: "", police_report_number: "", insurance_claim_number: "" });
    fetchIncidents();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("driver_incidents").update({
      status,
      ...(status === "resolved" || status === "closed" ? { resolved_by: user?.id, resolved_at: new Date().toISOString() } : {}),
    }).eq("id", id);
    fetchIncidents();
  };

  const getDriver = (id: string) => drivers.find(d => d.id === id);

  const filtered = incidents
    .filter(i => filterSeverity === "all" || i.severity === filterSeverity)
    .filter(i => {
      if (!searchTerm) return true;
      const d = getDriver(i.driver_id);
      const name = d ? `${d.first_name} ${d.last_name}` : "";
      return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.incident_type.toLowerCase().includes(searchTerm.toLowerCase());
    });

  const stats = {
    total: incidents.length,
    open: incidents.filter(i => i.status === "reported" || i.status === "under_investigation").length,
    critical: incidents.filter(i => i.severity === "critical" || i.severity === "major").length,
    withInjuries: incidents.filter(i => i.injuries).length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Incidents", value: stats.total, icon: FileText, color: "text-primary" },
          { label: "Open Cases", value: stats.open, icon: AlertTriangle, color: "text-amber-400" },
          { label: "Critical/Major", value: stats.critical, icon: ShieldAlert, color: "text-destructive" },
          { label: "With Injuries", value: stats.withInjuries, icon: AlertTriangle, color: "text-destructive" },
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
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search incidents..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-[140px]"><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            {Object.keys(SEVERITY_CONFIG).map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Report Incident</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Report New Incident</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Driver *</Label>
                  <Select value={form.driver_id || undefined} onValueChange={v => setForm(p => ({ ...p, driver_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
                    <SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Incident Type</Label>
                  <Select value={form.incident_type} onValueChange={v => setForm(p => ({ ...p, incident_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["accident", "near_miss", "traffic_violation", "cargo_damage", "road_hazard", "mechanical_failure", "other"].map(t => (
                        <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Severity</Label>
                  <Select value={form.severity} onValueChange={v => setForm(p => ({ ...p, severity: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["minor", "moderate", "major", "critical"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Location</Label>
                  <Input value={form.location_name} onChange={e => setForm(p => ({ ...p, location_name: e.target.value }))} placeholder="e.g. Bole Road" />
                </div>
              </div>
              <div>
                <Label>Description *</Label>
                <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Describe what happened..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Switch checked={form.injuries} onCheckedChange={v => setForm(p => ({ ...p, injuries: v }))} />
                  <Label>Injuries Involved</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.property_damage} onCheckedChange={v => setForm(p => ({ ...p, property_damage: v }))} />
                  <Label>Property Damage</Label>
                </div>
              </div>
              {form.property_damage && (
                <div>
                  <Label>Estimated Damage Cost (ETB)</Label>
                  <Input type="number" value={form.damage_estimate_cost} onChange={e => setForm(p => ({ ...p, damage_estimate_cost: e.target.value }))} placeholder="0.00" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Police Report #</Label>
                  <Input value={form.police_report_number} onChange={e => setForm(p => ({ ...p, police_report_number: e.target.value }))} />
                </div>
                <div>
                  <Label>Insurance Claim #</Label>
                  <Input value={form.insurance_claim_number} onChange={e => setForm(p => ({ ...p, insurance_claim_number: e.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={createIncident}>Submit Report</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Incidents List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-primary" />
            Incident Reports
          </CardTitle>
          <CardDescription>{filtered.length} incidents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {filtered.map(inc => {
            const driver = getDriver(inc.driver_id);
            return (
              <div key={inc.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                <Avatar className="h-9 w-9 mt-0.5">
                  <AvatarImage src={driver?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {driver ? `${driver.first_name[0]}${driver.last_name[0]}` : "??"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{driver ? `${driver.first_name} ${driver.last_name}` : "Unknown"}</span>
                    <Badge variant="outline" className={`text-[10px] ${SEVERITY_CONFIG[inc.severity]?.color || ""}`}>{inc.severity}</Badge>
                    <Badge variant="outline" className={`text-[10px] ${STATUS_CONFIG[inc.status]?.color || ""}`}>{inc.status.replace(/_/g, " ")}</Badge>
                    <span className="text-[10px] capitalize text-muted-foreground">{inc.incident_type.replace(/_/g, " ")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{inc.description}</p>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                    <span>{format(new Date(inc.incident_date), "MMM d, yyyy HH:mm")}</span>
                    {inc.location_name && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{inc.location_name}</span>}
                    {inc.injuries && <Badge variant="destructive" className="text-[10px]">Injuries</Badge>}
                    {inc.property_damage && <span>💰 {inc.damage_estimate_cost ? `${inc.damage_estimate_cost.toLocaleString()} ETB` : "Damage"}</span>}
                  </div>
                </div>
                <Select value={inc.status} onValueChange={v => updateStatus(inc.id, v)}>
                  <SelectTrigger className="w-[130px] h-8 text-[10px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["reported", "under_investigation", "resolved", "closed", "appealed"].map(s => (
                      <SelectItem key={s} value={s} className="text-xs capitalize">{s.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No incidents found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
