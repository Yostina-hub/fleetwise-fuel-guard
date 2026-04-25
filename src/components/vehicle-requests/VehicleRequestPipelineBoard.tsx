/**
 * VehicleRequestPipelineBoard — kanban for the unified vehicle_requests flow.
 *
 * v2: drag-and-drop between columns via @dnd-kit. Dropping a card on a
 * different column updates `vehicle_requests.status` to that column's
 * canonical status (the first entry in `match`). Successful drops invalidate
 * the trip-mgmt query so the board refreshes.
 *
 * Columns:
 *   pending → approved → assigned → in_progress → completed
 *   plus rejected / cancelled side bins.
 */
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VehicleRequestCard } from "./VehicleRequestCard";
import { AnimatePresence } from "framer-motion";
import {
  Send, CheckCircle, Truck, Zap, Flag, XCircle, Ban,
} from "lucide-react";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useDroppable, useSensor, useSensors, closestCorners,
} from "@dnd-kit/core";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { SharedRideMembership } from "@/hooks/useSharedRideMembership";

interface PipelineColumn {
  id: string;
  /** statuses that fall into this column (first entry = canonical) */
  match: string[];
  label: string;
  icon: React.ReactNode;
  color: string;
  dotColor: string;
}

const PIPELINE_COLUMNS: PipelineColumn[] = [
  { id: "pending",     match: ["pending", "submitted", "draft"],          label: "Pending",     icon: <Send className="w-3.5 h-3.5" />,        color: "border-warning/40",          dotColor: "bg-warning" },
  { id: "approved",    match: ["approved"],                               label: "Approved",    icon: <CheckCircle className="w-3.5 h-3.5" />, color: "border-success/40",          dotColor: "bg-success" },
  { id: "assigned",    match: ["assigned", "scheduled", "dispatched"],    label: "Assigned",    icon: <Truck className="w-3.5 h-3.5" />,       color: "border-secondary/40",        dotColor: "bg-secondary" },
  { id: "in_progress", match: ["in_progress", "in_service"],              label: "In Progress", icon: <Zap className="w-3.5 h-3.5" />,         color: "border-primary/40",          dotColor: "bg-primary" },
  { id: "completed",   match: ["completed", "closed"],                    label: "Completed",   icon: <Flag className="w-3.5 h-3.5" />,        color: "border-success/40",          dotColor: "bg-success" },
  { id: "rejected",    match: ["rejected"],                               label: "Rejected",    icon: <XCircle className="w-3.5 h-3.5" />,     color: "border-destructive/40",      dotColor: "bg-destructive" },
  { id: "cancelled",   match: ["cancelled", "canceled"],                  label: "Cancelled",   icon: <Ban className="w-3.5 h-3.5" />,         color: "border-muted-foreground/30", dotColor: "bg-muted-foreground" },
];

interface Props {
  requests: any[];
  onViewDetails?: (req: any) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onAssign?: (req: any) => void;
  /** restrict columns shown */
  visibleColumns?: string[];
  /** Map of vehicle_request_id → shared ride info, used to render badges. */
  sharedRideMap?: Record<string, SharedRideMembership>;
}

// ─── Sortable card wrapper ──────────────────────────────────────────────
const SortableCard = ({
  req, onViewDetails, onApprove, onReject, onAssign, sharedRide,
}: { req: any; sharedRide?: SharedRideMembership | null } & Omit<Props, "requests" | "visibleColumns" | "sharedRideMap">) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: req.id, data: { type: "card", request: req } });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <VehicleRequestCard
        request={req}
        onViewDetails={onViewDetails}
        onApprove={onApprove}
        onReject={onReject}
        onAssign={onAssign}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
        sharedRide={sharedRide}
      />
    </div>
  );
};

// ─── Droppable column wrapper ───────────────────────────────────────────
const DroppableColumn = ({
  col, items, children,
}: { col: PipelineColumn; items: any[]; children: React.ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({ id: col.id, data: { type: "column", column: col } });
  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-[280px] flex flex-col rounded-xl border-2 border-dashed ${col.color} bg-muted/20 transition-colors ${
        isOver ? "ring-2 ring-primary bg-primary/5" : ""
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${col.dotColor}`} />
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            {col.icon} {col.label}
          </span>
        </div>
        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-bold">
          {items.length}
        </Badge>
      </div>
      <ScrollArea className="flex-1 p-2 max-h-[calc(100vh-340px)]">
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2.5 pb-2 min-h-[80px]">
            {children}
            {items.length === 0 && (
              <div className="text-center py-8 text-xs text-muted-foreground/60">
                Drop here
              </div>
            )}
          </div>
        </SortableContext>
      </ScrollArea>
    </div>
  );
};

export const VehicleRequestPipelineBoard = ({
  requests, onViewDetails, onApprove, onReject, onAssign, visibleColumns, sharedRideMap,
}: Props) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeDrag, setActiveDrag] = useState<any | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

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

  const handleDragStart = (e: DragStartEvent) => {
    const req = (requests ?? []).find((r) => r.id === e.active.id);
    setActiveDrag(req ?? null);
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveDrag(null);
    const { active, over } = e;
    if (!over) return;

    const req = (requests ?? []).find((r) => r.id === active.id);
    if (!req) return;

    // Resolve destination column id (over could be a card or a column)
    const overData: any = over.data.current;
    let destColId: string | undefined;
    if (overData?.type === "column") destColId = overData.column.id;
    else if (overData?.type === "card") {
      const overReq = overData.request;
      destColId = columns.find((c) => c.match.includes(overReq.status))?.id;
    }
    if (!destColId) return;

    const destCol = columns.find((c) => c.id === destColId);
    if (!destCol) return;

    // Already in this column — no-op
    if (destCol.match.includes(req.status)) return;

    const newStatus = destCol.match[0];

    try {
      const { error } = await (supabase as any)
        .from("vehicle_requests")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", req.id);
      if (error) throw error;

      toast({
        title: "Request moved",
        description: `${req.request_number ?? "Request"} → ${destCol.label}`,
      });
      queryClient.invalidateQueries({ queryKey: ["trip-mgmt-vehicle-requests"] });
    } catch (err: any) {
      toast({
        title: "Move failed",
        description: err?.message ?? "Could not update request status.",
        variant: "destructive",
      });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4 min-h-[500px]">
        {columns.map((col) => {
          const list = grouped[col.id] ?? [];
          return (
            <DroppableColumn key={col.id} col={col} items={list}>
              <AnimatePresence mode="popLayout">
                {list.map((req) => (
                  <SortableCard
                    key={req.id}
                    req={req}
                    onViewDetails={onViewDetails}
                    onApprove={onApprove}
                    onReject={onReject}
                    onAssign={onAssign}
                    sharedRide={sharedRideMap?.[req.id] ?? null}
                  />
                ))}
              </AnimatePresence>
            </DroppableColumn>
          );
        })}
      </div>

      {/* Drag overlay (ghost card) */}
      <DragOverlay>
        {activeDrag ? (
          <div className="opacity-90 rotate-1 w-[260px]">
            <VehicleRequestCard request={activeDrag} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
