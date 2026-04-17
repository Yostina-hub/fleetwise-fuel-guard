import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInMinutes, formatDistanceToNowStrict } from "date-fns";

interface SlaChipProps {
  createdAt: string;
  dueAt?: string | null;
  /** Default expected duration if no due_at provided (minutes). */
  expectedMinutes?: number;
  className?: string;
  compact?: boolean;
}

/**
 * Traffic-light SLA chip.
 * - green  : < 70% of window elapsed
 * - amber  : 70–100%
 * - red    : breached
 */
export function SlaChip({ createdAt, dueAt, expectedMinutes = 60 * 24, className, compact }: SlaChipProps) {
  const created = new Date(createdAt);
  const now = new Date();
  const due = dueAt ? new Date(dueAt) : new Date(created.getTime() + expectedMinutes * 60_000);

  const totalMin = Math.max(1, differenceInMinutes(due, created));
  const elapsedMin = Math.max(0, differenceInMinutes(now, created));
  const ratio = elapsedMin / totalMin;

  let tone: "ok" | "warn" | "breach" = "ok";
  if (ratio >= 1) tone = "breach";
  else if (ratio >= 0.7) tone = "warn";

  const label = tone === "breach"
    ? `${formatDistanceToNowStrict(due)} overdue`
    : `${formatDistanceToNowStrict(due)} left`;

  const toneClass = {
    ok: "bg-[hsl(var(--sla-ok)/0.12)] text-[hsl(var(--sla-ok))] border-[hsl(var(--sla-ok)/0.3)]",
    warn: "bg-[hsl(var(--sla-warn)/0.12)] text-[hsl(var(--sla-warn))] border-[hsl(var(--sla-warn)/0.3)]",
    breach: "bg-[hsl(var(--sla-breach)/0.12)] text-[hsl(var(--sla-breach))] border-[hsl(var(--sla-breach)/0.3)]",
  }[tone];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums",
        toneClass,
        className,
      )}
      title={`Created ${formatDistanceToNowStrict(created)} ago · due ${due.toLocaleString()}`}
    >
      <Clock className={cn("shrink-0", compact ? "h-2.5 w-2.5" : "h-3 w-3")} />
      {label}
    </span>
  );
}
