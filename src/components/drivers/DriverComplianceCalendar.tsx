import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Calendar, AlertTriangle, CheckCircle2, Clock, Bell } from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";

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

export const DriverComplianceCalendar = () => {
  const { organizationId } = useOrganization();
  const [events, setEvents] = useState<ComplianceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (!organizationId) return;
    const fetchEvents = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("driver_compliance_events")
        .select("*")
        .eq("organization_id", organizationId)
        .order("due_date", { ascending: true })
        .limit(200);
      setEvents((data as ComplianceEvent[]) || []);
      setLoading(false);
    };
    fetchEvents();
  }, [organizationId]);

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

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Compliance Calendar</h3>
        <p className="text-sm text-muted-foreground">Unified view of all compliance deadlines across drivers</p>
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
                      <span className="text-[10px] text-muted-foreground">Due: {format(new Date(evt.due_date), "MMM dd, yyyy")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={`text-[10px] ${priorityColor(evt.priority)}`}>{evt.priority}</Badge>
                    {isOverdue && <Badge variant="destructive" className="text-[10px]">{Math.abs(daysLeft)}d overdue</Badge>}
                    {!isOverdue && evt.status !== "completed" && daysLeft <= 30 && (
                      <Badge variant="secondary" className="text-[10px]">{daysLeft}d left</Badge>
                    )}
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
