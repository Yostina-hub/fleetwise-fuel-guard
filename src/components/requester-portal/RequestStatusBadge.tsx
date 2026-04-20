/**
 * RequestStatusBadge — semantic status pill for vehicle requests.
 * All colors are routed through tokens (no raw hex / RGB).
 */
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Clock,
  Hourglass,
  PlayCircle,
  XCircle,
  type LucideIcon,
} from "lucide-react";

export type RequestStatus =
  | "pending"
  | "approved"
  | "assigned"
  | "in_progress"
  | "completed"
  | "rejected"
  | "cancelled";

interface Meta {
  label: string;
  icon: LucideIcon;
  /** semantic-token tailwind classes — all theme-aware */
  classes: string;
}

const META: Record<RequestStatus, Meta> = {
  pending:     { label: "Pending",     icon: Hourglass,   classes: "bg-warning/15 text-warning border-warning/30" },
  approved:    { label: "Approved",    icon: CheckCircle2,classes: "bg-primary/15 text-primary border-primary/30" },
  assigned:    { label: "Assigned",    icon: Clock,       classes: "bg-primary/15 text-primary border-primary/30" },
  in_progress: { label: "In Progress", icon: PlayCircle,  classes: "bg-success/15 text-success border-success/30" },
  completed:   { label: "Completed",   icon: CheckCircle2,classes: "bg-success/15 text-success border-success/30" },
  rejected:    { label: "Rejected",    icon: XCircle,     classes: "bg-destructive/15 text-destructive border-destructive/30" },
  cancelled:   { label: "Cancelled",   icon: XCircle,     classes: "bg-muted text-muted-foreground border-border" },
};

export const REQUEST_STATUSES: RequestStatus[] = [
  "pending", "approved", "assigned", "in_progress", "completed", "rejected", "cancelled",
];

export function RequestStatusBadge({ status, className }: { status: string; className?: string }) {
  const key = (status as RequestStatus) in META ? (status as RequestStatus) : "pending";
  const m = META[key];
  const Icon = m.icon;
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 font-medium border", m.classes, className)}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {m.label}
    </Badge>
  );
}

export function getStatusMeta(status: string) {
  return META[(status as RequestStatus) in META ? (status as RequestStatus) : "pending"];
}
