/**
 * RequestTimeline — vertical milestone timeline for a vehicle request.
 * Steps reflect the request lifecycle: Submitted → Approved → Assigned → In Progress → Completed.
 * If a request is rejected or cancelled, that step replaces the future ones.
 */
import { CheckCircle2, Circle, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface TimelineRequest {
  status: string;
  approval_status?: string | null;
  created_at: string;
  approved_at?: string | null;
  assigned_at?: string | null;
  driver_checked_in_at?: string | null;
  driver_checked_out_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  rejection_reason?: string | null;
}

interface Step {
  key: string;
  label: string;
  at: string | null | undefined;
  state: "done" | "current" | "pending" | "failed";
  hint?: string;
}

function buildSteps(r: TimelineRequest): Step[] {
  const isRejected = r.status === "rejected" || r.approval_status === "rejected";
  const isCancelled = r.status === "cancelled";
  const failed = isRejected || isCancelled;

  const steps: Step[] = [
    {
      key: "submitted",
      label: "Submitted",
      at: r.created_at,
      state: "done",
    },
    {
      key: "approved",
      label: "Approved",
      at: r.approved_at,
      state: r.approved_at ? "done" : failed ? "pending" : "current",
    },
    {
      key: "assigned",
      label: "Vehicle Assigned",
      at: r.assigned_at,
      state: r.assigned_at ? "done" : r.approved_at ? "current" : "pending",
    },
    {
      key: "in_progress",
      label: "Trip In Progress",
      at: r.driver_checked_in_at,
      state: r.driver_checked_in_at ? "done" : r.assigned_at ? "current" : "pending",
    },
    {
      key: "completed",
      label: "Completed",
      at: r.completed_at ?? r.driver_checked_out_at,
      state:
        r.completed_at || r.driver_checked_out_at
          ? "done"
          : r.driver_checked_in_at
            ? "current"
            : "pending",
    },
  ];

  if (failed) {
    return [
      steps[0],
      {
        key: "failed",
        label: isRejected ? "Rejected" : "Cancelled",
        at: r.cancelled_at ?? r.approved_at ?? r.created_at,
        state: "failed",
        hint: r.rejection_reason ?? undefined,
      },
    ];
  }

  return steps;
}

const fmt = (d: string | null | undefined) =>
  d ? format(new Date(d), "MMM d, yyyy · HH:mm") : "—";

export function RequestTimeline({ request }: { request: TimelineRequest }) {
  const steps = buildSteps(request);

  return (
    <ol className="relative border-l border-border pl-6 space-y-5">
      {steps.map((s, i) => {
        const Icon =
          s.state === "done"
            ? CheckCircle2
            : s.state === "failed"
              ? XCircle
              : s.state === "current"
                ? Clock
                : Circle;

        const dot =
          s.state === "done"
            ? "bg-success/15 text-success border-success/40"
            : s.state === "failed"
              ? "bg-destructive/15 text-destructive border-destructive/40"
              : s.state === "current"
                ? "bg-primary/15 text-primary border-primary/40 animate-pulse"
                : "bg-muted text-muted-foreground border-border";

        return (
          <li key={s.key} className="relative">
            <span
              className={cn(
                "absolute -left-[34px] top-0 inline-flex h-7 w-7 items-center justify-center rounded-full border",
                dot,
              )}
              aria-hidden="true"
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="flex flex-col gap-0.5">
              <span
                className={cn(
                  "text-sm font-medium",
                  s.state === "pending" ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {s.label}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">{fmt(s.at)}</span>
              {s.hint && (
                <span className="text-xs text-destructive mt-0.5">Reason: {s.hint}</span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
