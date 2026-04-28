/**
 * DispatchJobAuditTrail
 * ---------------------
 * Renders the immutable audit log for a dispatch job inside the detail
 * dialog. Visible only to roles allowed by RLS (Operations, Dispatcher,
 * Auditor, Fleet Owner, Org/Super Admin). For unauthorized users the
 * hook simply returns no rows.
 */
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  History,
  PlayCircle,
  Truck,
  User,
  Pencil,
  CircleSlash,
  Loader2,
} from "lucide-react";
import {
  useDispatchJobAuditLog,
  type DispatchJobAuditEntry,
} from "@/hooks/useDispatchJobAuditLog";

interface Props {
  jobId: string | null | undefined;
  open: boolean;
}

const EVENT_META: Record<
  DispatchJobAuditEntry["event_type"],
  { label: string; icon: any; tone: string }
> = {
  created: { label: "Created", icon: PlayCircle, tone: "bg-primary/10 text-primary border-primary/30" },
  status_changed: { label: "Status changed", icon: History, tone: "bg-warning/10 text-warning border-warning/30" },
  vehicle_assigned: { label: "Vehicle assigned", icon: Truck, tone: "bg-success/10 text-success border-success/30" },
  driver_assigned: { label: "Driver assigned", icon: User, tone: "bg-success/10 text-success border-success/30" },
  unassigned: { label: "Unassigned", icon: CircleSlash, tone: "bg-destructive/10 text-destructive border-destructive/30" },
  updated: { label: "Updated", icon: Pencil, tone: "bg-muted text-muted-foreground border-border" },
};

const fmtVal = (v: string | null) => {
  if (!v) return "—";
  // Truncate long uuids for readability
  if (v.length === 36 && v.includes("-")) return v.slice(0, 8) + "…";
  return v.replace("_", " ");
};

export const DispatchJobAuditTrail = ({ jobId, open }: Props) => {
  const { data: entries = [], isLoading } = useDispatchJobAuditLog(jobId, open);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <History className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
        <h3 className="text-sm font-semibold">Audit Trail</h3>
        <Badge variant="outline" className="ml-auto text-[10px]">
          {entries.length} event{entries.length === 1 ? "" : "s"}
        </Badge>
      </div>

      {isLoading ? (
        <div
          className="flex items-center justify-center py-6 text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden="true" />
          Loading audit history…
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground py-3 text-center">
          No audit entries visible. (Operations &amp; Auditor roles can view changes.)
        </p>
      ) : (
        <ScrollArea className="max-h-[260px] pr-2">
          <ol className="relative border-l border-border pl-4 space-y-3">
            {entries.map((e) => {
              const meta = EVENT_META[e.event_type] ?? EVENT_META.updated;
              const Icon = meta.icon;
              return (
                <li key={e.id} className="relative">
                  <span
                    className="absolute -left-[22px] top-1 flex items-center justify-center w-4 h-4 rounded-full bg-background border border-border"
                    aria-hidden="true"
                  >
                    <Icon className="w-2.5 h-2.5" />
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={`${meta.tone} text-[10px]`}>
                      {meta.label}
                    </Badge>
                    {e.event_type === "status_changed" && (
                      <span className="text-xs font-medium">
                        {fmtVal(e.from_value)}{" "}
                        <span className="text-muted-foreground">→</span>{" "}
                        {fmtVal(e.to_value)}
                      </span>
                    )}
                    {(e.event_type === "vehicle_assigned" ||
                      e.event_type === "driver_assigned") && (
                      <span className="text-xs font-mono text-muted-foreground">
                        {fmtVal(e.to_value)}
                      </span>
                    )}
                    {e.event_type === "updated" && e.changed_fields?.length ? (
                      <span className="text-xs text-muted-foreground">
                        {e.changed_fields.join(", ")}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {format(new Date(e.created_at), "MMM dd, yyyy HH:mm:ss")}
                    {e.actor_role ? ` · ${e.actor_role.replace(/_/g, " ")}` : ""}
                    {e.actor_id ? ` · ${e.actor_id.slice(0, 8)}…` : " · system"}
                  </p>
                </li>
              );
            })}
          </ol>
        </ScrollArea>
      )}
    </div>
  );
};

export default DispatchJobAuditTrail;
