import { CheckCircle, Circle, ArrowRight } from "lucide-react";

type Stage =
  | "submitted"
  | "approval"
  | "pool_review"
  | "assigned"
  | "checked_in"
  | "checked_out"
  | "completed";

const STAGE_SEQUENCE: { key: Stage; label: string; short: string }[] = [
  { key: "submitted", label: "Submitted", short: "1" },
  { key: "approval", label: "Approval", short: "2" },
  { key: "pool_review", label: "Pool Review", short: "3" },
  { key: "assigned", label: "Vehicle Assigned", short: "4" },
  { key: "checked_in", label: "Driver Check-in", short: "5" },
  { key: "checked_out", label: "Driver Check-out", short: "6" },
  { key: "completed", label: "Completed", short: "✓" },
];

const TERMINAL_BAD = ["rejected", "cancelled"] as const;

interface Props {
  request: any;
}

const deriveStage = (req: any): Stage | "rejected" | "cancelled" => {
  if (req.status === "rejected" || req.approval_status === "rejected") return "rejected";
  if (req.status === "cancelled") return "cancelled";
  if (req.status === "completed" || req.auto_closed || req.driver_checked_out_at) return "completed";
  if (req.driver_checked_out_at) return "checked_out";
  if (req.driver_checked_in_at || req.check_in_at) return "checked_in";
  if (req.assigned_vehicle_id) return "assigned";
  if (req.pool_review_status === "reviewed") return "pool_review";
  if (req.approval_status === "approved" || req.approval_status === "auto_approved" || req.status === "approved") return "approval";
  return "submitted";
};

const VehicleRequestWorkflowProgress = ({ request }: Props) => {
  const derived = deriveStage(request);
  const isBad = (TERMINAL_BAD as readonly string[]).includes(derived);
  // For positive flow, find the highest-reached stage index.
  const reachedIdx = isBad
    ? -1
    : STAGE_SEQUENCE.findIndex(s => s.key === derived);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1 pb-1">
        {STAGE_SEQUENCE.map((stage, idx) => {
          const isDone = reachedIdx > idx || (reachedIdx === STAGE_SEQUENCE.length - 1 && idx <= reachedIdx);
          const isCurrent = reachedIdx === idx && reachedIdx !== STAGE_SEQUENCE.length - 1;
          return (
            <div key={stage.key} className="flex items-center shrink-0">
              <div
                title={stage.label}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all ${
                  isDone ? "bg-success/20 text-success" :
                  isCurrent ? "bg-primary/20 text-primary ring-1 ring-primary/40" :
                  "bg-muted/50 text-muted-foreground"
                }`}
              >
                {isDone ? <CheckCircle className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                <span className={isCurrent ? "inline" : "hidden lg:inline"}>{stage.label}</span>
                <span className={isCurrent ? "hidden" : "lg:hidden"}>{stage.short}</span>
              </div>
              {idx < STAGE_SEQUENCE.length - 1 && (
                <ArrowRight className="w-3 h-3 mx-0.5 text-muted-foreground/50 shrink-0" />
              )}
            </div>
          );
        })}
      </div>
      {isBad && (
        <div className={`text-xs px-2 py-1 rounded inline-block ${
          derived === "rejected" ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"
        }`}>
          {derived === "rejected" ? "Request Rejected" : "Request Cancelled"}
        </div>
      )}
    </div>
  );
};

export default VehicleRequestWorkflowProgress;
