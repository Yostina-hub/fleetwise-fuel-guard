import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Inbox,
  RotateCcw,
  Truck,
  Zap,
  XCircle,
  Navigation,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useDriverCoachingQueue, CoachingQueueItem } from "@/hooks/useDriverCoachingQueue";
import { useDrivers } from "@/hooks/useDrivers";
import { useVehicles } from "@/hooks/useVehicles";

type FilterKey = "open" | "coached" | "dismissed" | "all";

/**
 * Idle-time coaching queue. Shows driver coaching items auto-generated from
 * idle alerts, with re-route suggestions and quick actions to mark coached
 * or dismissed. Dispatchers can jump to the relevant assignment.
 */
export const IdleCoachingQueue = () => {
  const navigate = useNavigate();
  const { items, counts, loading, markCoached, dismiss, reopen } =
    useDriverCoachingQueue({ limit: 200 });
  const { drivers } = useDrivers();
  const { vehicles } = useVehicles();

  const [filter, setFilter] = useState<FilterKey>("open");
  const [coachTarget, setCoachTarget] = useState<CoachingQueueItem | null>(null);
  const [coachingNotes, setCoachingNotes] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const driverName = (id: string | null) => {
    if (!id) return "Unassigned";
    const d = drivers.find((x) => x.id === id);
    return d ? `${d.first_name} ${d.last_name}` : "Unknown driver";
  };
  const vehiclePlate = (id: string | null) => {
    if (!id) return "—";
    const v = vehicles.find((x) => x.id === id);
    return v?.license_plate || v?.vehicle_number || id.slice(0, 8);
  };

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.status === filter);
  }, [items, filter]);

  const handleCoach = async () => {
    if (!coachTarget) return;
    setBusyId(coachTarget.id);
    try {
      const { error } = await markCoached(coachTarget.id, coachingNotes.trim() || undefined);
      if (error) throw error;
      toast.success("Marked as coached");
      setCoachTarget(null);
      setCoachingNotes("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setBusyId(null);
    }
  };

  const handleDismiss = async (id: string) => {
    setBusyId(id);
    try {
      const { error } = await dismiss(id);
      if (error) throw error;
      toast.success("Dismissed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to dismiss");
    } finally {
      setBusyId(null);
    }
  };

  const handleReopen = async (id: string) => {
    setBusyId(id);
    try {
      const { error } = await reopen(id);
      if (error) throw error;
      toast.success("Re-opened");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reopen");
    } finally {
      setBusyId(null);
    }
  };

  const sevBadge = (sev: string) => {
    const map: Record<string, string> = {
      high: "border-destructive/40 text-destructive",
      medium: "border-warning/40 text-warning",
      low: "border-info/40 text-info",
    };
    return (
      <Badge variant="outline" className={map[sev] || map.medium}>
        {sev}
      </Badge>
    );
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "coached":
        return (
          <Badge variant="outline" className="border-success/40 text-success">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Coached
          </Badge>
        );
      case "dismissed":
        return (
          <Badge variant="outline" className="border-muted-foreground/40 text-muted-foreground">
            <XCircle className="h-3 w-3 mr-1" /> Dismissed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-warning/40 text-warning">
            <Clock className="h-3 w-3 mr-1" /> Open
          </Badge>
        );
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4" />
            Idle-Time Coaching Queue
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Auto-generated from idle-time alerts (≥10 min, engine on). Re-route suggestions
            surface in Dispatch when an active assignment exists.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">Open</div>
              <div className="text-2xl font-bold text-warning">{counts.open}</div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">Coached</div>
              <div className="text-2xl font-bold text-success">{counts.coached}</div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">Dismissed</div>
              <div className="text-2xl font-bold text-muted-foreground">{counts.dismissed}</div>
            </div>
          </div>

          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
            <TabsList>
              <TabsTrigger value="open">Open</TabsTrigger>
              <TabsTrigger value="coached">Coached</TabsTrigger>
              <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>

          {loading ? (
            <div className="text-xs text-muted-foreground py-6 text-center">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center text-xs text-muted-foreground py-8">
              <Inbox className="h-4 w-4 mr-2" />
              No coaching items in "{filter}".
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="border border-border rounded-lg p-3 space-y-2 hover:bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap text-sm">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      <span className="font-medium">{item.title}</span>
                      {sevBadge(item.severity)}
                      {statusBadge(item.status)}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Driver:</span>{" "}
                      <span className="font-medium">{driverName(item.driver_id)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Vehicle:</span>{" "}
                      <span className="font-mono">{vehiclePlate(item.vehicle_id)}</span>
                    </div>
                  </div>

                  {item.recommendation && (
                    <div className="text-xs text-muted-foreground">{item.recommendation}</div>
                  )}

                  {item.reroute_suggestion && (
                    <div className="text-xs flex items-start gap-2 bg-info/10 border border-info/30 rounded p-2 text-info">
                      <Navigation className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>{item.reroute_suggestion}</span>
                    </div>
                  )}

                  {item.coaching_notes && (
                    <div className="text-xs bg-success/10 border border-success/30 rounded p-2">
                      <strong className="text-success">Coach notes:</strong> {item.coaching_notes}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    {item.suggested_assignment_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7"
                        onClick={() => navigate("/dispatch")}
                      >
                        <Truck className="h-3 w-3 mr-1" />
                        View dispatch
                      </Button>
                    )}
                    {item.status === "open" && (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7"
                          disabled={busyId === item.id}
                          onClick={() => {
                            setCoachTarget(item);
                            setCoachingNotes("");
                          }}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Mark coached
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7"
                          disabled={busyId === item.id}
                          onClick={() => handleDismiss(item.id)}
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Dismiss
                        </Button>
                      </>
                    )}
                    {(item.status === "coached" || item.status === "dismissed") && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7"
                        disabled={busyId === item.id}
                        onClick={() => handleReopen(item.id)}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Re-open
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!coachTarget} onOpenChange={(o) => !o && setCoachTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record coaching</DialogTitle>
            <DialogDescription>
              {coachTarget?.title} · {driverName(coachTarget?.driver_id ?? null)}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Optional coaching notes (what was discussed, agreed actions, follow-up date…)"
            value={coachingNotes}
            onChange={(e) => setCoachingNotes(e.target.value)}
            rows={5}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCoachTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleCoach} disabled={busyId === coachTarget?.id}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Save coaching
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
