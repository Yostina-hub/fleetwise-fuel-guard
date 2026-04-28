/**
 * IncidentDispatchDecisionBanner — driver-side surface for the operator's
 * dispatch decision after an incident report. Listens for the realtime
 * `incident_dispatch_decision` and `incident_replacement_assigned` driver
 * notifications and renders a tone-appropriate banner with one-click dismiss.
 */
import { useMemo } from "react";
import { CheckCircle2, Repeat, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useDriverNotifications,
  markDriverNotificationRead,
} from "@/hooks/useDriverNotifications";

interface Props {
  driverId?: string | null;
}

const KINDS = new Set([
  "incident_dispatch_decision",
  "incident_replacement_assigned",
]);

export default function IncidentDispatchDecisionBanner({ driverId }: Props) {
  const { data } = useDriverNotifications(driverId, { limit: 25 });

  const top = useMemo(() => {
    return (data ?? []).find((n) => !n.read_at && KINDS.has(n.kind));
  }, [data]);

  if (!top) return null;

  const decision = (top.payload?.decision as string) ?? null;
  const isEmergency = decision === "emergency";
  const isReplacement =
    decision === "replacement_assigned" ||
    top.kind === "incident_replacement_assigned";

  const Icon = isEmergency ? ShieldAlert : isReplacement ? Repeat : CheckCircle2;

  const tone = isEmergency
    ? "border-destructive/40 bg-destructive/5 text-destructive"
    : isReplacement
      ? "border-primary/30 bg-primary/5"
      : "border-success/40 bg-success/5";

  return (
    <div className={`rounded-lg border ${tone} px-4 py-3 mb-3`} role="status">
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 mt-0.5 shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{top.title}</p>
          {top.body && (
            <p className="text-xs text-muted-foreground mt-0.5">{top.body}</p>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 shrink-0"
          onClick={() => markDriverNotificationRead(top.id)}
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
