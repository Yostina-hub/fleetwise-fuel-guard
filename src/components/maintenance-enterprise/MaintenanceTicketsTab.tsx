import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Search, Clock, AlertTriangle, CheckCircle, Timer, ArrowUpRight } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const STATUSES = ["open", "triaged", "assigned", "in_progress", "pending_parts", "resolved", "closed"];
const PRIORITIES = ["P1", "P2", "P3", "P4"];

// Use semantic tokens instead of raw tailwind colors so the design system
// stays the source of truth (and dark/light themes both render correctly).
const statusColors: Record<string, string> = {
  open:          "bg-primary/15 text-primary border-primary/30",
  triaged:       "bg-secondary/15 text-secondary border-secondary/30",
  assigned:      "bg-warning/15 text-warning border-warning/30",
  in_progress:   "bg-warning/20 text-warning border-warning/40",
  pending_parts: "bg-destructive/15 text-destructive border-destructive/30",
  resolved:      "bg-success/15 text-success border-success/30",
  closed:        "bg-muted text-muted-foreground border-border",
};

const priorityColors: Record<string, string> = {
  P1: "bg-destructive/20 text-destructive border-destructive/40",
  P2: "bg-warning/20 text-warning border-warning/40",
  P3: "bg-warning/10 text-warning border-warning/20",
  P4: "bg-muted text-muted-foreground border-border",
};

const slaHours: Record<string, { response: number; resolution: number }> = {
  P1: { response: 1, resolution: 4 },
  P2: { response: 4, resolution: 24 },
  P3: { response: 8, resolution: 72 },
  P4: { response: 24, resolution: 168 },
};

const MT_PREFS_KEY = "maintenance.tickets.prefs.v1";

const MaintenanceTicketsTab = () => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const initial = (() => {
    try { return JSON.parse(localStorage.getItem(MT_PREFS_KEY) || "{}"); } catch { return {}; }
  })();
  const [searchQuery, setSearchQuery] = useState<string>(initial.searchQuery ?? "");
  const [filterStatus, setFilterStatus] = useState<string>(initial.filterStatus ?? "all");
  const [filterPriority, setFilterPriority] = useState<string>(initial.filterPriority ?? "all");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "kanban">(initial.viewMode ?? "kanban");

  useEffect(() => {
    try {
      localStorage.setItem(MT_PREFS_KEY, JSON.stringify({ searchQuery, filterStatus, filterPriority, viewMode }));
    } catch { /* ignore */ }
  }, [searchQuery, filterStatus, filterPriority, viewMode]);

  const [form, setForm] = useState({
    title: "", description: "", priority: "P3", category: "general", reported_by: "",
  });

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["maintenance-tickets", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("maintenance_tickets")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("No org");
      const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}`;
      const sla = slaHours[form.priority] || slaHours.P3;
      const now = new Date();
      const { error } = await supabase.from("maintenance_tickets").insert({
        organization_id: organizationId,
        ticket_number: ticketNumber,
        title: form.title,
        description: form.description,
        priority: form.priority,
        category: form.category,
        reported_by: form.reported_by,
        sla_response_hours: sla.response,
        sla_resolution_hours: sla.resolution,
        sla_response_deadline: new Date(now.getTime() + sla.response * 3600000).toISOString(),
        sla_resolution_deadline: new Date(now.getTime() + sla.resolution * 3600000).toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-tickets"] });
      setCreateOpen(false);
      setForm({ title: "", description: "", priority: "P3", category: "general", reported_by: "" });
      toast.success("Ticket created");
    },
    onError: () => toast.error("Failed to create ticket"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === "resolved") updates.resolved_at = new Date().toISOString();
      if (status === "closed") updates.closed_at = new Date().toISOString();
      const { error } = await supabase.from("maintenance_tickets").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-tickets"] });
      toast.success("Status updated");
    },
  });

  const filtered = tickets.filter((t: any) => {
    const matchSearch = !searchQuery || 
      t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.ticket_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = filterStatus === "all" || t.status === filterStatus;
    const matchPriority = filterPriority === "all" || t.priority === filterPriority;
    return matchSearch && matchStatus && matchPriority;
  });

  // Stats
  const openCount = tickets.filter((t: any) => !["resolved", "closed"].includes(t.status)).length;
  const breachedCount = tickets.filter((t: any) => t.sla_resolution_breached).length;
  const avgResolution = tickets.filter((t: any) => t.resolution_time_minutes).reduce((sum: number, t: any) => sum + t.resolution_time_minutes, 0) / (tickets.filter((t: any) => t.resolution_time_minutes).length || 1);

  const renderKanban = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 overflow-x-auto">
      {STATUSES.map(status => {
        const cols = filtered.filter((t: any) => t.status === status);
        return (
          <div key={status} className="min-w-[200px]">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className={statusColors[status]}>{status.replace("_", " ")}</Badge>
              <span className="text-xs text-muted-foreground">({cols.length})</span>
            </div>
            <div className="space-y-2">
              {cols.map((ticket: any) => {
                const overdue =
                  ticket.sla_resolution_deadline &&
                  new Date(ticket.sla_resolution_deadline) < new Date() &&
                  !["resolved", "closed"].includes(ticket.status);
                return (
                <Card key={ticket.id} className={`glass-strong cursor-pointer hover:border-primary/30 transition-colors ${
                  overdue ? "border-destructive/40 bg-destructive/5" : ""
                }`}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-muted-foreground">{ticket.ticket_number}</span>
                      <Badge variant="outline" className={`text-[10px] ${priorityColors[ticket.priority]}`}>{ticket.priority}</Badge>
                    </div>
                    <p className="text-sm font-medium line-clamp-2">{ticket.title}</p>
                    {ticket.sla_resolution_deadline && (
                      <div className="flex items-center gap-1">
                        <Timer className={`w-3 h-3 ${overdue ? "text-destructive" : "text-muted-foreground"}`} />
                        <span className={`text-[10px] ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                          {overdue ? "Overdue " : ""}
                          {formatDistanceToNow(new Date(ticket.sla_resolution_deadline), { addSuffix: true })}
                        </span>
                      </div>
                    )}
                    {/* Status transition */}
                    {status !== "closed" && (
                      <Select onValueChange={(val) => updateStatusMutation.mutate({ id: ticket.id, status: val })}>
                        <SelectTrigger className="h-7 text-[10px]"><SelectValue placeholder="Move →" /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.filter(s => s !== status).map(s => (
                            <SelectItem key={s} value={s} className="text-xs">{s.replace("_", " ")}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </CardContent>
                </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-strong"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{openCount}</p>
          <p className="text-xs text-muted-foreground">Open Tickets</p>
        </CardContent></Card>
        <Card className="glass-strong"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-destructive">{breachedCount}</p>
          <p className="text-xs text-muted-foreground">SLA Breached</p>
        </CardContent></Card>
        <Card className="glass-strong"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-warning">{tickets.filter((t: any) => t.priority === "P1" && !["resolved","closed"].includes(t.status)).length}</p>
          <p className="text-xs text-muted-foreground">Critical (P1)</p>
        </CardContent></Card>
        <Card className="glass-strong"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-success">{Math.round(avgResolution / 60)}h</p>
          <p className="text-xs text-muted-foreground">Avg Resolution</p>
        </CardContent></Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tickets..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace("_"," ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant={viewMode === "kanban" ? "default" : "outline"} size="sm" onClick={() => setViewMode("kanban")}>Kanban</Button>
        <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")}>List</Button>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" /> New Ticket</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Maintenance Ticket</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Brief description of the issue" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Detailed description..." /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Priority</Label>
                  <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p} — {slaHours[p].resolution}h SLA</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Category</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["general","engine","electrical","brakes","tires","body","hvac","transmission"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Reported By</Label><Input value={form.reported_by} onChange={e => setForm(f => ({ ...f, reported_by: e.target.value }))} placeholder="Name" /></div>
              <Button onClick={() => createMutation.mutate()} disabled={!form.title || createMutation.isPending} className="w-full">
                {createMutation.isPending ? "Creating..." : "Create Ticket"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading tickets...</div>
      ) : viewMode === "kanban" ? renderKanban() : (
        <div className="space-y-2">
          {filtered.map((ticket: any) => (
            <Card key={ticket.id} className="glass-strong">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">{ticket.ticket_number}</span>
                  <Badge variant="outline" className={priorityColors[ticket.priority]}>{ticket.priority}</Badge>
                  <p className="text-sm font-medium truncate">{ticket.title}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={statusColors[ticket.status]}>{ticket.status.replace("_", " ")}</Badge>
                  {ticket.sla_resolution_deadline && new Date(ticket.sla_resolution_deadline) < new Date() && !["resolved","closed"].includes(ticket.status) && (
                    <Badge variant="destructive" className="text-[10px]">SLA Breached</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">{format(new Date(ticket.created_at), "MMM d")}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MaintenanceTicketsTab;
