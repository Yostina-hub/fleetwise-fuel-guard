import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CalendarClock, Gauge, Timer, Wrench, Sparkles, RefreshCw } from "lucide-react";
import { useDuePreventiveSchedules, useTriggerPreventiveScan, DueSchedule } from "@/hooks/usePreventiveSchedules";
import { useMaintenanceRequests } from "@/hooks/useMaintenanceRequests";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  vehicleId?: string;
  driverId?: string | null;
  /** When true (fleet ops view), exposes the "Run Auto-Scan" action */
  showAutoScan?: boolean;
}

const reasonLabel: Record<NonNullable<DueSchedule["due_reason"]>, { label: string; icon: typeof CalendarClock; tone: string }> = {
  date_overdue:      { label: "Date overdue",        icon: CalendarClock, tone: "bg-destructive/15 text-destructive border-destructive/30" },
  date_upcoming:     { label: "Due soon (date)",     icon: CalendarClock, tone: "bg-warning/15 text-warning border-warning/30" },
  odometer_overdue:  { label: "KM threshold passed", icon: Gauge,         tone: "bg-destructive/15 text-destructive border-destructive/30" },
  odometer_upcoming: { label: "KM approaching",      icon: Gauge,         tone: "bg-warning/15 text-warning border-warning/30" },
  hours_overdue:     { label: "Engine hours due",    icon: Timer,         tone: "bg-destructive/15 text-destructive border-destructive/30" },
  hours_upcoming:    { label: "Hours approaching",   icon: Timer,         tone: "bg-warning/15 text-warning border-warning/30" },
};

const DuePreventiveSchedules = ({ vehicleId, driverId, showAutoScan = false }: Props) => {
  // All hooks must be called unconditionally on every render.
  const { data: dueSchedules = [], isLoading, refetch } = useDuePreventiveSchedules({
    vehicleId,
    enabled: !!vehicleId || showAutoScan,
  });
  const { createRequest } = useMaintenanceRequests();
  const triggerScan = useTriggerPreventiveScan();
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // Driver has no vehicle assigned — show clear empty state instead of hiding the panel.
  if (!vehicleId && !showAutoScan) {
    return (
      <Card className="glass-strong border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Preventive Maintenance
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No vehicle assigned to you yet. Once Fleet Operations assigns a vehicle, scheduled services
          (oil changes, brake checks, etc.) due by kilometer, engine hours or date will appear here
          with a one-click <span className="font-semibold text-foreground">"Request Now"</span> button.
        </CardContent>
      </Card>
    );
  }

  const handleRequest = async (s: DueSchedule) => {
    setSubmittingId(s.schedule_id);
    try {
      await createRequest.mutateAsync({
        vehicle_id: s.vehicle_id,
        driver_id: driverId || undefined,
        request_type: "preventive",
        trigger_source: "manual",
        priority: s.is_overdue ? "high" : "medium",
        km_reading: s.current_odometer || undefined,
        running_hours: s.current_hours || undefined,
        description: `Preventive maintenance: ${s.service_type} (${s.plate_number})`,
        notes: `Schedule due — ${reasonLabel[s.due_reason!]?.label ?? "threshold reached"}.`,
        schedule_id: s.schedule_id,
      });
      toast.success(`Preventive request submitted for ${s.plate_number}`);
      refetch();
    } catch (e) {
      // toast handled in hook
    } finally {
      setSubmittingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card className="glass-strong">
        <CardContent className="p-6 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Checking schedules…
        </CardContent>
      </Card>
    );
  }

  if (dueSchedules.length === 0) {
    return (
      <Card className="glass-strong">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Preventive Maintenance
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No preventive services are due in the next 7 days. ✅
          {showAutoScan && (
            <Button
              size="sm"
              variant="outline"
              className="ml-3"
              onClick={() => triggerScan.mutate()}
              disabled={triggerScan.isPending}
            >
              {triggerScan.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Run Auto-Scan
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-strong border-warning/30">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Wrench className="w-4 h-4 text-warning" />
          Preventive Maintenance Due
          <Badge variant="outline" className="ml-1">{dueSchedules.length}</Badge>
        </CardTitle>
        {showAutoScan && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => triggerScan.mutate()}
            disabled={triggerScan.isPending}
          >
            {triggerScan.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Auto-Create Overdue
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {dueSchedules.map((s) => {
          const meta = s.due_reason ? reasonLabel[s.due_reason] : null;
          const Icon = meta?.icon ?? Wrench;
          return (
            <div
              key={s.schedule_id}
              className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-card/40 border border-border hover:border-primary/30 transition-colors"
            >
              <div className="p-2 rounded-md bg-muted/40">
                <Icon className="w-4 h-4 text-foreground" />
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{s.service_type}</span>
                  <Badge variant="outline" className="text-xs">{s.plate_number}</Badge>
                  {meta && (
                    <Badge variant="outline" className={`text-xs ${meta.tone}`}>
                      {meta.label}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                  {s.next_due_date && (
                    <span>Due: {format(new Date(s.next_due_date), "MMM dd, yyyy")}</span>
                  )}
                  {s.next_due_odometer != null && (
                    <span>
                      KM: {Number(s.current_odometer).toLocaleString()} / {Number(s.next_due_odometer).toLocaleString()}
                    </span>
                  )}
                  {s.next_due_hours != null && (
                    <span>
                      Hours: {Number(s.current_hours).toLocaleString()} / {Number(s.next_due_hours).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant={s.is_overdue ? "default" : "outline"}
                onClick={() => handleRequest(s)}
                disabled={submittingId === s.schedule_id}
              >
                {submittingId === s.schedule_id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Request Now"
                )}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default DuePreventiveSchedules;
