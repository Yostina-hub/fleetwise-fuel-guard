import { CheckCircle, Circle, ArrowRight } from "lucide-react";
import { WorkflowStage } from "@/hooks/useMaintenanceRequests";

const STAGE_SEQUENCE: { key: WorkflowStage; label: string; short: string }[] = [
  { key: "submitted", label: "Submitted", short: "1" },
  { key: "under_review", label: "Fleet Review", short: "2" },
  { key: "pre_inspection", label: "Pre-Inspection", short: "4" },
  { key: "wo_preparation", label: "WO Prep", short: "6" },
  { key: "approved", label: "Approved", short: "6c" },
  { key: "vehicle_delivery", label: "Vehicle Delivery", short: "6b" },
  { key: "supplier_maintenance", label: "Supplier Work", short: "9" },
  { key: "inspector_assigned", label: "Inspector", short: "11" },
  { key: "post_inspection", label: "Post-Inspection", short: "15" },
  { key: "payment_pending", label: "Payment", short: "16" },
  { key: "delivery_check", label: "Delivery Check", short: "28" },
  { key: "vehicle_received", label: "Received", short: "23" },
  { key: "completed", label: "Completed", short: "✓" },
];

const TERMINAL_STAGES: WorkflowStage[] = ["rejected", "no_maintenance", "correction_required"];

interface Props {
  currentStage: WorkflowStage | string;
}

const MaintenanceWorkflowProgress = ({ currentStage }: Props) => {
  const currentIdx = STAGE_SEQUENCE.findIndex(s => s.key === currentStage);
  const isTerminal = TERMINAL_STAGES.includes(currentStage as WorkflowStage);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1 pb-1">
        {STAGE_SEQUENCE.map((stage, idx) => {
          const isDone = currentIdx > idx;
          const isCurrent = currentIdx === idx;
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
      {isTerminal && (
        <div className={`text-xs px-2 py-1 rounded inline-block ${
          currentStage === "rejected" ? "bg-destructive/20 text-destructive" :
          currentStage === "no_maintenance" ? "bg-warning/20 text-warning" :
          "bg-orange-500/20 text-orange-400"
        }`}>
          {currentStage === "rejected" ? "Request Rejected" :
           currentStage === "no_maintenance" ? "No Maintenance Needed" :
           "Correction Required — Returned to Supplier"}
        </div>
      )}
    </div>
  );
};

export default MaintenanceWorkflowProgress;
