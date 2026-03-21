import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, Clock, Users, Send, CheckCircle, XCircle, Eye, 
  Truck, User, ChevronRight, Zap, ArrowRight, Package, MoreHorizontal
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TripCardProps {
  trip: any;
  onSubmit?: (id: string) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onViewDetails?: (trip: any) => void;
  onAssign?: (trip: any) => void;
  onComplete?: (id: string) => void;
  isSubmitting?: boolean;
  compact?: boolean;
}

const priorityConfig: Record<string, { color: string; label: string }> = {
  urgent: { color: "bg-destructive/15 text-destructive border-destructive/30", label: "Urgent" },
  high: { color: "bg-warning/15 text-warning border-warning/30", label: "High" },
  normal: { color: "bg-secondary/15 text-secondary border-secondary/30", label: "Normal" },
  low: { color: "bg-muted text-muted-foreground border-border", label: "Low" },
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  draft: <Clock className="w-3.5 h-3.5" />,
  submitted: <Send className="w-3.5 h-3.5" />,
  approved: <CheckCircle className="w-3.5 h-3.5" />,
  scheduled: <Truck className="w-3.5 h-3.5" />,
  dispatched: <ArrowRight className="w-3.5 h-3.5" />,
  in_service: <Zap className="w-3.5 h-3.5" />,
  completed: <CheckCircle className="w-3.5 h-3.5" />,
  rejected: <XCircle className="w-3.5 h-3.5" />,
};

export const TripCard = ({ 
  trip, onSubmit, onApprove, onReject, onViewDetails, onAssign, onComplete,
  isSubmitting, compact 
}: TripCardProps) => {
  const priority = trip.priority || "normal";
  const pConfig = priorityConfig[priority] || priorityConfig.normal;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      whileHover={{ y: -2, boxShadow: "0 8px 25px -8px hsl(var(--primary) / 0.15)" }}
      className="group relative bg-card border border-border rounded-xl p-3.5 cursor-pointer transition-colors hover:border-primary/40"
      onClick={() => onViewDetails?.(trip)}
    >
      {/* Priority indicator stripe */}
      <div className={`absolute top-0 left-3 right-3 h-0.5 rounded-b ${
        priority === "urgent" ? "bg-destructive" : 
        priority === "high" ? "bg-warning" : "bg-transparent"
      }`} />

      {/* Header */}
      <div className="flex items-start justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-primary">
            {trip.request_number}
          </span>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${pConfig.color}`}>
            {pConfig.label}
          </Badge>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewDetails?.(trip); }}>
              <Eye className="w-3.5 h-3.5 mr-2" /> View Details
            </DropdownMenuItem>
            {trip.status === "draft" && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSubmit?.(trip.id); }}>
                <Send className="w-3.5 h-3.5 mr-2" /> Submit
              </DropdownMenuItem>
            )}
            {trip.status === "approved" && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAssign?.(trip); }}>
                <Truck className="w-3.5 h-3.5 mr-2" /> Assign Vehicle
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Purpose */}
      <p className="text-sm font-medium text-foreground line-clamp-2 mb-3 leading-snug">
        {trip.purpose}
      </p>

      {/* Route */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2.5">
        <MapPin className="w-3 h-3 text-primary shrink-0" />
        <span className="truncate">
          {trip.pickup_geofence?.name || "Pickup"}
        </span>
        {trip.drop_geofence && (
          <>
            <ChevronRight className="w-3 h-3 shrink-0" />
            <span className="truncate">{trip.drop_geofence.name}</span>
          </>
        )}
      </div>

      {/* Schedule */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
        <Clock className="w-3 h-3 shrink-0" />
        <span>
          {format(new Date(trip.pickup_at), "MMM dd, HH:mm")}
          {trip.return_at && ` → ${format(new Date(trip.return_at), "HH:mm")}`}
        </span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2.5 border-t border-border/50">
        <div className="flex items-center gap-2">
          {trip.passengers && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Users className="w-3 h-3" /> {trip.passengers}
            </span>
          )}
          {trip.cargo_weight_kg && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Package className="w-3 h-3" /> {trip.cargo_weight_kg}kg
            </span>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground">
          {formatDistanceToNow(new Date(trip.created_at), { addSuffix: true })}
        </span>
      </div>

      {/* Quick Actions - visible on hover */}
      {(trip.status === "draft" || trip.status === "submitted") && (
        <div className="absolute inset-x-0 bottom-0 translate-y-full pt-1 opacity-0 group-hover:opacity-100 transition-all z-10">
          <div className="flex gap-1.5 bg-card border border-border rounded-lg p-1.5 shadow-lg mx-1">
            {trip.status === "draft" && (
              <Button 
                size="sm" 
                className="flex-1 h-7 text-xs gap-1"
                onClick={(e) => { e.stopPropagation(); onSubmit?.(trip.id); }}
                disabled={isSubmitting}
              >
                <Send className="w-3 h-3" /> Submit for Approval
              </Button>
            )}
            {trip.status === "submitted" && onApprove && (
              <>
                <Button 
                  size="sm" 
                  className="flex-1 h-7 text-xs gap-1"
                  onClick={(e) => { e.stopPropagation(); onApprove?.(trip.id); }}
                >
                  <CheckCircle className="w-3 h-3" /> Approve
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  className="flex-1 h-7 text-xs gap-1"
                  onClick={(e) => { e.stopPropagation(); onReject?.(trip.id); }}
                >
                  <XCircle className="w-3 h-3" /> Reject
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};
