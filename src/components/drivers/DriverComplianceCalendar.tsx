import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useDrivers } from "@/hooks/useDrivers";
import { Calendar, AlertTriangle, CheckCircle2, Clock, Bell, Plus } from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";
import { toast } from "sonner";

interface ComplianceEvent {
  id: string;
  driver_id: string;
  event_type: string;
  title: string;
  description: string | null;
  due_date: string;
  completed_date: string | null;
  status: string;
  priority: string;
}

const EVENT_TYPES = [
  { value: "license_renewal", label: "License Renewal" },
  { value: "medical_certificate", label: "Medical Certificate" },
  { value: "background_check", label: "Background Check" },
  { value: "drug_test", label: "Drug Test" },
  { value: "safety_training", label: "Safety Training" },
  { value: "vehicle_inspection", label: "Vehicle Inspection" },
  { value: "insurance_renewal", label: "Insurance Renewal" },
  { value: "other", label: "Other" },
];

export const DriverComplianceCalendar = () => {
  const { organizationId } = useOrganization();
  const { drivers } = useDrivers();
  const [events, setEvents] = useState<ComplianceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    driver_id: "", event_type: "license_renewal", title: "", description: "", due_date: "", priority: "medium",
  });

  const fetchEvents = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    const { data } = await supabase
      .from("driver_compliance_events")
      .select("*")
      .eq("organization_id", organizationId)
      .order("due_date", { ascending: true })
      .limit(200);
    setEvents((data as ComplianceEvent[]) || []);
    setLoading(false);
  }, [organizationId]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const now = new Date();
  const overdueCount = events.filter(e => e.status !== "completed" && isPast(new Date(e.due_date))).length;
  const dueSoonCount = events.filter(e => {
    if (e.status === "completed") return false;
    const days = differenceInDays(new Date(e.due_date), now);
    return days >= 0 && days <= 30;
  }).length;
  const completedCount = events.filter(e => e.status === "completed").length;

  const filteredEvents = events.filter(e => {
    if (filter === "overdue") return e.status !== "completed" && isPast(new Date(e.due_date));
    if (filter === "due_soon") return e.status !== "completed" && differenceInDays(new Date(e.due_date), now) <= 30 && differenceInDays(new Date(e.due_date), now) >= 0;
    if (filter === "completed") return e.status === "completed";
    return true;
  });

  const priorityColor = (p: string) => {
    switch (p) {
      case "critical": return "bg-red-500/10 text-red-400 border-red-500/30";
      case "high": return "bg-orange-500/10 text-orange-400 border-orange-500/30";
      case "medium": return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const eventTypeLabel = (t: string) => t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const getDriverName = (id: string) => {
    const d = drivers.find(dr => dr.id === id);
    return d ? `${d.first_name} ${d.last_name}` : "";
  };

  const handleCreate = async () => {
    if (!organizationId || !form.driver_id || !form.title || !form.due_date) return;
    setSaving(true);
    const { error } = await supabase.from("driver_compliance_events").insert({
      organization_id: organizationId,
      driver_id: form.driver_id,
      event_type: form.event_type,
      title: form.title,
      description: form.description || null,
      due_date: form.due_date,
      priority: form.priority,
    });
    setSaving(false);
    if (error) { toast.error("Failed to create event"); return; }
    toast.success("Compliance event created");
    setShowAdd(false);
    setForm({ driver_id: "", event_type: "license_renewal", title: "", description: "", due_date: "", priority: "medium" });
    fetchEvents();
  };

  const markComplete = async (id: string) => {
    await supabase.from("driver_compliance_events").update({
      status: "completed",
      completed_date: new Date().toISOString().split("T")[0],
    }).eq("id", id);
    toast.success("Marked as completed");
    fetchEvents();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Compliance Calendar</h3>
          <p className="text-sm text-muted-foreground">Unified view of all compliance deadlines across drivers</p>
        </div>
        <Button className="gap-2" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" />Add Event</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="cursor-pointer hover:ring-1 ring-primary/30 transition-all" onClick={() => setFilter("all")}>
          <CardContent className="p-3 text-center">
            <Calendar className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{events.length}</p>
            <p className="text-[10px] text-muted-foreground">Total Events</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-1 ring-red-400/30 transition-all" onClick={() => setFilter("overdue")}>
          <CardContent className="p-3 text-center">
            <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-red-400" />
            <p className="text-2xl font-bold">{overdueCount}</p>
            <p className="text-[10px] text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-1 ring-amber-400/30 transition-all" onClick={() => setFilter("due_soon")}>
          <CardContent className="p-3 text-center">
            <Bell className="w-5 h-5 mx-auto mb-1 text-amber-400" />
            <p className="text-2xl font-bold">{dueSoonCount}</p>
            <p className="text-[10px] text-muted-foreground">Due in 30 Days</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-1 ring-emerald-400/30 transition-all" onClick={() => setFilter("completed")}>
          <CardContent className="p-3 text-center">
            <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
            <p className="text-2xl font-bold">{completedCount}</p>
            <p className="text-[10px] text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">
              {filter === "all" ? "All Events" : filter === "overdue" ? "Overdue Events" : filter === "due_soon" ? "Due Soon" : "Completed"}
            </CardTitle>
            <Badge variant="secondary" className="text-[10px]">{filteredEvents.length}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No compliance events found</p>
            </div>
          ) : (
            filteredEvents.slice(0, 50).map(evt => {
              const isOverdue = evt.status !== "completed" && isPast(new Date(evt.due_date));
              const daysLeft = differenceInDays(new Date(evt.due_date), now);
              return (
                <div key={evt.id} className={`flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors ${isOverdue ? "border-red-500/30 bg-red-500/5" : ""}`}>
                  {evt.status === "completed" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : isOverdue ? (
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{evt.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px]">{eventTypeLabel(evt.event_type)}</Badge>
                      <span className="text-[10px] text-muted-foreground">{getDriverName(evt.driver_id)}</span>
                      <span className="text-[10px] text-muted-foreground">Due: {format(new Date(evt.due_date), "MMM dd, yyyy")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={`text-[10px] ${priorityColor(evt.priority)}`}>{evt.priority}</Badge>
                    {isOverdue && <Badge variant="destructive" className="text-[10px]">{Math.abs(daysLeft)}d overdue</Badge>}
                    {!isOverdue && evt.status !== "completed" && daysLeft <= 30 && (
                      <Badge variant="secondary" className="text-[10px]">{daysLeft}d left</Badge>
                    )}
                    {evt.status !== "completed" && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-emerald-500" onClick={() => markComplete(evt.id)}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />Done
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Create Event Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Compliance Event</DialogTitle>
            <DialogDescription>Schedule a compliance deadline for a driver.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Driver *</Label>
              <Select value={form.driver_id || undefined} onValueChange={v => setForm(f => ({ ...f, driver_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
                <SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Event Type</Label>
                <Select value={form.event_type} onValueChange={v => setForm(f => ({ ...f, event_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g., License Renewal for John" />
            </div>
            <div>
              <Label>Due Date *</Label>
              <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional details..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !form.driver_id || !form.title || !form.due_date}>
              {saving ? "Saving..." : "Create Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
