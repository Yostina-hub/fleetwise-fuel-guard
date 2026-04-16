import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useDrivers } from "@/hooks/useDrivers";
import { useToast } from "@/hooks/use-toast";
import { Brain, Target, CheckCircle2, Clock, TrendingUp, Zap, Plus, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";

interface CoachingWorkflow {
  id: string;
  driver_id: string;
  trigger_type: string;
  coaching_type: string;
  status: string;
  assigned_coach_name: string | null;
  scheduled_date: string | null;
  completed_date: string | null;
  score_before: number | null;
  score_after: number | null;
  improvement_pct: number | null;
  session_notes: string | null;
  effectiveness_rating: number | null;
  created_at: string;
}

export const DriverAutoCoaching = () => {
  const { organizationId } = useOrganization();
  const { drivers } = useDrivers();
  const { toast } = useToast();
  const [workflows, setWorkflows] = useState<CoachingWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    driver_id: "",
    trigger_type: "manual_assignment",
    coaching_type: "one_on_one",
    assigned_coach_name: "",
    scheduled_date: "",
    session_notes: "",
    score_before: "",
  });

  const fetchWorkflows = async () => {
    if (!organizationId) return;
    setLoading(true);
    const { data } = await supabase
      .from("driver_coaching_workflows")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(100);
    setWorkflows((data as CoachingWorkflow[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchWorkflows(); }, [organizationId]);

  const createWorkflow = async () => {
    if (!organizationId || !form.driver_id) {
      toast({ title: "Please select a driver", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("driver_coaching_workflows").insert({
        organization_id: organizationId,
        driver_id: form.driver_id,
        trigger_type: form.trigger_type,
        coaching_type: form.coaching_type,
        assigned_coach_name: form.assigned_coach_name || null,
        scheduled_date: form.scheduled_date || null,
        session_notes: form.session_notes || null,
        score_before: form.score_before ? parseFloat(form.score_before) : null,
        status: form.scheduled_date ? "scheduled" : "pending",
      } as any);
      if (error) throw error;
      toast({ title: "Coaching session created" });
      setShowCreate(false);
      setForm({ driver_id: "", trigger_type: "manual_assignment", coaching_type: "one_on_one", assigned_coach_name: "", scheduled_date: "", session_notes: "", score_before: "" });
      fetchWorkflows();
    } catch (err: any) {
      toast({ title: "Error creating session", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === "completed") updates.completed_date = new Date().toISOString();
    await supabase.from("driver_coaching_workflows").update(updates).eq("id", id);
    fetchWorkflows();
  };

  const getDriver = (id: string) => drivers.find(d => d.id === id);

  const completedCount = workflows.filter(w => w.status === "completed").length;
  const pendingCount = workflows.filter(w => w.status === "pending" || w.status === "scheduled").length;
  const avgImprovement = (() => {
    const improved = workflows.filter(w => w.improvement_pct !== null && w.improvement_pct > 0);
    return improved.length > 0 ? improved.reduce((s, w) => s + (w.improvement_pct || 0), 0) / improved.length : 0;
  })();
  const avgRating = (() => {
    const rated = workflows.filter(w => w.effectiveness_rating);
    return rated.length > 0 ? rated.reduce((s, w) => s + (w.effectiveness_rating || 0), 0) / rated.length : 0;
  })();

  const statusColor = (s: string) => {
    switch (s) {
      case "completed": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "in_progress": return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "scheduled": return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "escalated": return "bg-red-500/10 text-red-400 border-red-500/30";
      case "cancelled": return "bg-muted text-muted-foreground";
      default: return "";
    }
  };

  const triggerLabel = (t: string) => t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Auto-Coaching Workflows</h3>
          <p className="text-sm text-muted-foreground">Coaching triggers, sessions, and effectiveness tracking</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5"><Plus className="w-3.5 h-3.5" />New Session</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Create Coaching Session</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-xs">Driver *</Label>
                <Select value={form.driver_id || undefined} onValueChange={v => setForm(f => ({ ...f, driver_id: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select driver" /></SelectTrigger>
                  <SelectContent>
                    {drivers.map(d => (
                      <SelectItem key={d.id} value={d.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={d.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px]">{d.first_name[0]}{d.last_name[0]}</AvatarFallback>
                          </Avatar>
                          {d.first_name} {d.last_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Trigger</Label>
                  <Select value={form.trigger_type} onValueChange={v => setForm(f => ({ ...f, trigger_type: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual_assignment">Manual</SelectItem>
                      <SelectItem value="low_score">Low Score</SelectItem>
                      <SelectItem value="incident">Incident</SelectItem>
                      <SelectItem value="violation">Violation</SelectItem>
                      <SelectItem value="customer_complaint">Customer Complaint</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Type</Label>
                  <Select value={form.coaching_type} onValueChange={v => setForm(f => ({ ...f, coaching_type: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_on_one">One-on-One</SelectItem>
                      <SelectItem value="video_review">Video Review</SelectItem>
                      <SelectItem value="ride_along">Ride Along</SelectItem>
                      <SelectItem value="online_training">Online Training</SelectItem>
                      <SelectItem value="remedial">Remedial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Coach Name</Label>
                  <Input className="h-8 text-xs" value={form.assigned_coach_name} onChange={e => setForm(f => ({ ...f, assigned_coach_name: e.target.value }))} placeholder="Coach name" />
                </div>
                <div><Label className="text-xs">Scheduled Date</Label>
                  <Input type="date" className="h-8 text-xs" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} />
                </div>
              </div>
              <div><Label className="text-xs">Current Score (before)</Label>
                <Input type="number" className="h-8 text-xs" value={form.score_before} onChange={e => setForm(f => ({ ...f, score_before: e.target.value }))} placeholder="e.g. 65" />
              </div>
              <div><Label className="text-xs">Notes</Label>
                <Textarea className="text-xs min-h-[50px]" value={form.session_notes} onChange={e => setForm(f => ({ ...f, session_notes: e.target.value }))} placeholder="Coaching objectives..." />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
              <Button size="sm" onClick={createWorkflow} disabled={saving}>
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}Create Session
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <Brain className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold">{workflows.length}</p>
          <p className="text-[10px] text-muted-foreground">Total Workflows</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Clock className="w-5 h-5 mx-auto mb-1 text-amber-400" />
          <p className="text-2xl font-bold">{pendingCount}</p>
          <p className="text-[10px] text-muted-foreground">Pending/Scheduled</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <TrendingUp className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
          <p className="text-2xl font-bold">{avgImprovement.toFixed(1)}%</p>
          <p className="text-[10px] text-muted-foreground">Avg Improvement</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <Target className="w-5 h-5 mx-auto mb-1 text-blue-400" />
          <p className="text-2xl font-bold">{avgRating.toFixed(1)}/5</p>
          <p className="text-[10px] text-muted-foreground">Effectiveness</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Coaching Sessions</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : workflows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Brain className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>No coaching workflows yet</p>
              <p className="text-xs mt-1">Click "New Session" to create a coaching workflow</p>
            </div>
          ) : (
            workflows.slice(0, 30).map(w => {
              const driver = getDriver(w.driver_id);
              return (
                <div key={w.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                  {w.status === "completed" ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <Zap className="w-4 h-4 text-amber-400 shrink-0" />}
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={driver?.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {driver ? `${driver.first_name[0]}${driver.last_name[0]}` : "??"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{driver ? `${driver.first_name} ${driver.last_name}` : "Unknown"}</span>
                      <span className="text-xs capitalize text-muted-foreground">{w.coaching_type.replace(/_/g, " ")}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px]">{triggerLabel(w.trigger_type)}</Badge>
                      {w.assigned_coach_name && <span className="text-[10px] text-muted-foreground">Coach: {w.assigned_coach_name}</span>}
                      <span className="text-[10px] text-muted-foreground">{format(new Date(w.created_at), "MMM dd, yyyy")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {w.score_before && w.score_after && (
                      <span className="text-[10px] text-muted-foreground">
                        {w.score_before.toFixed(0)} → {w.score_after.toFixed(0)}
                        {w.improvement_pct !== null && <span className={w.improvement_pct > 0 ? " text-emerald-400" : " text-red-400"}> ({w.improvement_pct > 0 ? "+" : ""}{w.improvement_pct.toFixed(1)}%)</span>}
                      </span>
                    )}
                    <Select value={w.status} onValueChange={v => updateStatus(w.id, v)}>
                      <SelectTrigger className="w-[110px] h-7 text-[10px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["pending", "scheduled", "in_progress", "completed", "escalated", "cancelled"].map(s => (
                          <SelectItem key={s} value={s} className="text-xs capitalize">{s.replace(/_/g, " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
};
