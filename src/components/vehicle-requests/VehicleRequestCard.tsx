/**
 * VehicleRequestCard — kanban card for the unified `vehicle_requests` flow.
 *
 * v2 changes:
 *  • Kebab + quick-action buttons are now ALWAYS visible (no hover-only).
 *  • Approve / Reject / Assign live INSIDE the card so they don't get clipped
 *    by the column ScrollArea — and they work on touch devices.
 *  • Optional `dragHandleProps` from @dnd-kit's useSortable so the whole card
 *    surface (minus action buttons) becomes a drag handle.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin, Clock, Users, CheckCircle, XCircle, Eye,
  Truck, ChevronRight, Package, MoreHorizontal, Briefcase, CalendarRange, Building2,
  GripVertical, Moon, Share2,
} from "lucide-react";
import type { SharedRideMembership } from "@/hooks/useSharedRideMembership";
import { format, formatDistanceToNow } from "date-fns";
import { formatRequestNumber } from "@/lib/formatRequestNumber";
import { motion } from "framer-motion";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SlaCountdownBadge } from "./SlaCountdownBadge";

interface VehicleRequestCardProps {
  request: any;
  onViewDetails?: (req: any) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onAssign?: (req: any) => void;
  /** Drag handle props from @dnd-kit useSortable.listeners (+ attributes). */
  dragHandleProps?: Record<string, any>;
  /** Visual feedback while being dragged. */
  isDragging?: boolean;
  /** If this request is part of a shared ride, show a "Shared" badge. */
  sharedRide?: SharedRideMembership | null;
}

const priorityConfig: Record<string, { color: string; label: string }> = {
  urgent:  { color: "bg-destructive/15 text-destructive border-destructive/30", label: "Urgent" },
  high:    { color: "bg-warning/15 text-warning border-warning/30",            label: "High" },
  normal:  { color: "bg-secondary/15 text-secondary border-secondary/30",      label: "Normal" },
  low:     { color: "bg-muted text-muted-foreground border-border",            label: "Low" },
};

const TYPE_META: Record<string, { label: string; icon: React.ReactNode }> = {
  daily_operation:     { label: "Daily",     icon: <Clock className="w-3 h-3" /> },
  nighttime_operation: { label: "Nighttime", icon: <Moon className="w-3 h-3" /> },
  project_operation:   { label: "Project",   icon: <Briefcase className="w-3 h-3" /> },
  field_operation:     { label: "Field",     icon: <CalendarRange className="w-3 h-3" /> },
};

export const VehicleRequestCard = ({
  request, onViewDetails, onApprove, onReject, onAssign,
  dragHandleProps, isDragging, sharedRide,
}: VehicleRequestCardProps) => {
  const priority = request.priority || "normal";
  const pConfig = priorityConfig[priority] || priorityConfig.normal;
  const tMeta = TYPE_META[request.request_type] ?? { label: request.request_type ?? "Trip", icon: <Clock className="w-3 h-3" /> };

  const startAt = request.needed_from ?? request.created_at;
  const endAt   = request.needed_until;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      whileHover={{ y: -2 }}
      className={`group relative bg-card border border-border rounded-xl p-3.5 transition-colors hover:border-primary/40 ${
        isDragging ? "opacity-50 ring-2 ring-primary shadow-2xl" : ""
      }`}
    >
      {/* Priority stripe */}
      <div className={`absolute top-0 left-3 right-3 h-0.5 rounded-b ${
        priority === "urgent" ? "bg-destructive" :
        priority === "high"   ? "bg-warning" : "bg-transparent"
      }`} />

      {/* Header */}
      <div className="flex items-start justify-between mb-2.5 gap-2">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {/* Drag handle (always visible) */}
          {dragHandleProps && (
            <button
              {...dragHandleProps}
              type="button"
              className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none -ml-1 p-0.5 rounded hover:bg-muted"
              aria-label="Drag to reorder"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
          )}
          <span className="font-mono text-xs font-semibold text-primary" title={request.request_number}>
            {request.request_number
              ? formatRequestNumber(request.request_number, { requestType: request.request_type, compact: true })
              : request.id?.slice(0, 8)}
          </span>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${pConfig.color}`}>
            {pConfig.label}
          </Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-1 border-border/60">
            {tMeta.icon} {tMeta.label}
          </Badge>
          <SlaCountdownBadge
            createdAt={request.created_at}
            slaDueAt={request.sla_due_at}
            assignedAt={request.assigned_at}
            slaBreached={request.sla_breached}
            operationType={request.operation_type}
          />
          {sharedRide && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-4 gap-1 bg-primary/10 text-primary border-primary/30"
              title={`Shared ride · ${sharedRide.poolCode ?? "pool"}`}
            >
              <Share2 className="w-3 h-3" /> Shared
            </Badge>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 hover:bg-muted"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewDetails?.(request); }}>
              <Eye className="w-3.5 h-3.5 mr-2" /> View Details
            </DropdownMenuItem>
            {request.status === "pending" && onApprove && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onApprove?.(request.id); }}>
                <CheckCircle className="w-3.5 h-3.5 mr-2" /> Approve
              </DropdownMenuItem>
            )}
            {request.status === "pending" && onReject && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onReject?.(request.id); }} className="text-destructive">
                <XCircle className="w-3.5 h-3.5 mr-2" /> Reject
              </DropdownMenuItem>
            )}
            {request.status === "approved" && onAssign && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAssign?.(request); }}>
                <Truck className="w-3.5 h-3.5 mr-2" /> Assign Vehicle
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Body — clicking opens details */}
      <div onClick={() => onViewDetails?.(request)} className="cursor-pointer">
        <p className="text-sm font-medium text-foreground line-clamp-2 mb-3 leading-snug">
          {request.purpose || "(no purpose)"}
        </p>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2.5">
          <MapPin className="w-3 h-3 text-primary shrink-0" />
          <span className="truncate">
            {request.departure_place || request.pool_name || request.pool_location || "Pickup"}
          </span>
          {request.destination && (
            <>
              <ChevronRight className="w-3 h-3 shrink-0" />
              <span className="truncate">{request.destination}</span>
            </>
          )}
        </div>

        {startAt && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
            <Clock className="w-3 h-3 shrink-0" />
            <span>
              {format(new Date(startAt), "MMM dd, h:mm a")}
              {endAt && ` → ${format(new Date(endAt), "MMM dd h:mm a")}`}
            </span>
          </div>
        )}

        {(request.assigned_vehicle || request.assigned_driver) && (
          <div className="flex items-center gap-1.5 text-[11px] mb-2 px-2 py-1 rounded-md bg-primary/5 border border-primary/20">
            <Truck className="w-3 h-3 text-primary shrink-0" />
            <span className="truncate text-foreground">
              {request.assigned_vehicle?.plate_number}
              {request.assigned_driver && ` · ${request.assigned_driver.first_name} ${request.assigned_driver.last_name}`}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2.5 border-t border-border/50">
          <div className="flex items-center gap-2">
            {request.passengers ? (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Users className="w-3 h-3" /> {request.passengers}
              </span>
            ) : null}
            {request.num_vehicles && request.num_vehicles > 1 ? (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Package className="w-3 h-3" /> {request.num_vehicles}
              </span>
            ) : null}
            {request.requester_name && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground truncate max-w-[100px]">
                <Building2 className="w-3 h-3" /> {request.requester_name}
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>

      {/* Always-visible quick actions for pending */}
      {request.status === "pending" && onApprove && (
        <div className="flex gap-1.5 mt-3 pt-2.5 border-t border-border/50">
          <Button
            size="sm"
            className="flex-1 h-8 text-xs gap-1"
            onClick={(e) => { e.stopPropagation(); onApprove?.(request.id); }}
          >
            <CheckCircle className="w-3.5 h-3.5" /> Approve
          </Button>
          {onReject && (
            <Button
              size="sm"
              variant="destructive"
              className="flex-1 h-8 text-xs gap-1"
              onClick={(e) => { e.stopPropagation(); onReject?.(request.id); }}
            >
              <XCircle className="w-3.5 h-3.5" /> Reject
            </Button>
          )}
        </div>
      )}

      {/* Always-visible Assign action for approved */}
      {request.status === "approved" && onAssign && (
        <div className="mt-3 pt-2.5 border-t border-border/50">
          <Button
            size="sm"
            variant="secondary"
            className="w-full h-8 text-xs gap-1"
            onClick={(e) => { e.stopPropagation(); onAssign?.(request); }}
          >
            <Truck className="w-3.5 h-3.5" /> Assign Vehicle
          </Button>
        </div>
      )}
    </motion.div>
  );
};
