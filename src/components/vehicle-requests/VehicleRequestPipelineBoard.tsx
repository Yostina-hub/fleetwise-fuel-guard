/**
 * VehicleRequestPipelineBoard — kanban for the unified vehicle_requests flow.
 *
 * Replaces the legacy TripPipelineBoard on Trip Management. Columns mirror
 * the actual statuses produced by VehicleRequestForm + the assignment and
 * driver-checkin flow:
 *   pending → approved → assigned → in_progress → completed
 *   plus rejected / cancelled side bins.
 */
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VehicleRequestCard } from "./VehicleRequestCard";
import { AnimatePresence } from "framer-motion";
import {
  Send, CheckCircle, Truck, Zap, Flag, XCircle, Ban,
} from "lucide-react";

interface PipelineColumn {
  id: string;
  /** statuses that fall into this column */
  match: string[];
  label: string;
  icon: React.ReactNode;
  color: string;
  dotColor: string;
}

const PIPELINE_COLUMNS: PipelineColumn[] = [
  { id: "pending",     match: ["pending", "submitted", "draft"], label: "Pending",     icon: <Send className="w-3.5 h-3.5" />,        color: "border-warning/40",        dotColor: "bg-warning" },
  { id: "approved",    match: ["approved"],                       label: "Approved",    icon: <CheckCircle className="w-3.5 h-3.5" />, color: "border-success/40",        dotColor: "bg-success" },
  { id: "assigned",    match: ["assigned", "scheduled", "dispatched"], label: "Assigned", icon: <Truck className="w-3.5 h-3.5" />,    color: "border-secondary/40",      dotColor: "bg-secondary" },
  { id: "in_progress", match: ["in_progress", "in_service"],     label: "In Progress", icon: <Zap className="w-3.5 h-3.5" />,         color: "border-primary/40",        dotColor: "bg-primary" },
  { id: "completed",   match: ["completed", "closed"],            label: "Completed",   icon: <Flag className="w-3.5 h-3.5" />,        color: "border-success/40",        dotColor: "bg-success" },
  { id: "rejected",    match: ["rejected"],                       label: "Rejected",    icon: <XCircle className="w-3.5 h-3.5" />,     color: "border-destructive/40",    dotColor: "bg-destructive" },
  { id: "cancelled",   match: ["cancelled", "canceled"],          label: "Cancelled",   icon: <Ban className="w-3.5 h-3.5" />,         color: "border-muted-foreground/30", dotColor: "bg-muted-foreground" },
];

interface Props {
  requests: any[];
  onViewDetails?: (req: any) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onAssign?: (req: any) => void;
  /** restrict columns shown */
  visibleColumns?: string[];
}

export const VehicleRequestPipelineBoard = ({
  requests, onViewDetails, onApprove, onReject, onAssign, visibleColumns,
}: Props) => {
  const columns = visibleColumns
    ? PIPELINE_COLUMNS.filter((c) => visibleColumns.includes(c.id))
    : PIPELINE_COLUMNS;

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    columns.forEach((c) => { g[c.id] = []; });
    (requests ?? []).forEach((r) => {
      const col = columns.find((c) => c.match.includes(r.status));
      if (col) g[col.id].push(r);
    });
    return g;
  }, [requests, columns]);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 min-h-[500px]">
      {columns.map((col) => {
        const list = grouped[col.id] ?? [];
        return (
          <div
            key={col.id}
            className={`flex-shrink-0 w-[280px] flex flex-col rounded-xl border-2 border-dashed ${col.color} bg-muted/20`}
          >
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  {col.icon} {col.label}
                </span>
              </div>
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-bold">
                {list.length}
              </Badge>
            </div>
            <ScrollArea className="flex-1 p-2">
              <div className="space-y-2.5 pb-2">
                <AnimatePresence mode="popLayout">
                  {list.map((req) => (
                    <VehicleRequestCard
                      key={req.id}
                      request={req}
                      onViewDetails={onViewDetails}
                      onApprove={onApprove}
                      onReject={onReject}
                      onAssign={onAssign}
                    />
                  ))}
                </AnimatePresence>
                {list.length === 0 && (
                  <div className="text-center py-8 text-xs text-muted-foreground/60">
                    No requests
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
};
