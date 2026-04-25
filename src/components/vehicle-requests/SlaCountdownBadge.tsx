/**
 * SLA Countdown Badge
 * -------------------
 * Live timer that visualises how a vehicle request is tracking against its
 * OLA SLA target (10 min / 30 min / 1.5 day / 30 day, depending on the
 * operation_type). Updates every 15 seconds.
 *
 * Status colours:
 *  - green   → on track, plenty of time
 *  - amber   → <25% of SLA window left
 *  - red     → breached or already assigned late
 */
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  createdAt: string;
  slaDueAt?: string | null;
  assignedAt?: string | null;
  slaBreached?: boolean;
  operationType?: string | null;
  className?: string;
}

const SLA_LABEL: Record<string, string> = {
  incident_urgent: "Urgent · 10m",
  daily_operation: "Daily · 30m",
  field_work: "Field · 1.5d",
  project_work: "Project · 30d",
};

function formatRemaining(ms: number): string {
  const sign = ms < 0 ? "-" : "";
  const abs = Math.abs(ms);
  const mins = Math.floor(abs / 60000);
  if (mins < 60) return `${sign}${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${sign}${hrs}h ${mins % 60}m`;
  const days = Math.floor(hrs / 24);
  return `${sign}${days}d ${hrs % 24}h`;
}

export function SlaCountdownBadge({
  createdAt,
  slaDueAt,
  assignedAt,
  slaBreached,
  operationType,
  className,
}: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  const dueMs = slaDueAt ? new Date(slaDueAt).getTime() : 0;
  const createdMs = new Date(createdAt).getTime();
  const totalWindow = dueMs - createdMs;

  // Already assigned: show on-time vs breached only.
  if (assignedAt) {
    const assignedMs = new Date(assignedAt).getTime();
    const breached = slaBreached || (dueMs > 0 && assignedMs > dueMs);
    return (
      <Badge
        variant="outline"
        className={cn(
          "gap-1 text-xs",
          breached
            ? "border-destructive/50 bg-destructive/10 text-destructive"
            : "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
          className,
        )}
      >
        {breached ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
        {breached ? "OLA breached" : "On time"}
      </Badge>
    );
  }

  if (!slaDueAt) return null;

  const remaining = dueMs - now;
  const pctLeft = totalWindow > 0 ? remaining / totalWindow : 0;
  const breached = slaBreached || remaining < 0;

  const tone = breached
    ? "border-destructive/50 bg-destructive/10 text-destructive"
    : pctLeft < 0.25
      ? "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400"
      : "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";

  return (
    <Badge variant="outline" className={cn("gap-1 text-xs", tone, className)}>
      {breached ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
      {operationType && <span className="opacity-70">{SLA_LABEL[operationType] ?? operationType}</span>}
      <span className="font-mono">{formatRemaining(remaining)}</span>
    </Badge>
  );
}
