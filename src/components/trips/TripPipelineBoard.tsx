import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TripCard } from "./TripCard";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileEdit, Send, CheckCircle, Truck, Zap, Flag, XCircle, 
  ArrowRight, Calendar 
} from "lucide-react";

interface PipelineColumn {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  dotColor: string;
}

const PIPELINE_COLUMNS: PipelineColumn[] = [
  { id: "draft", label: "Draft", icon: <FileEdit className="w-3.5 h-3.5" />, color: "border-muted-foreground/30", dotColor: "bg-muted-foreground" },
  { id: "submitted", label: "Pending Approval", icon: <Send className="w-3.5 h-3.5" />, color: "border-warning/40", dotColor: "bg-warning" },
  { id: "approved", label: "Approved", icon: <CheckCircle className="w-3.5 h-3.5" />, color: "border-success/40", dotColor: "bg-success" },
  { id: "scheduled", label: "Scheduled", icon: <Calendar className="w-3.5 h-3.5" />, color: "border-secondary/40", dotColor: "bg-secondary" },
  { id: "dispatched", label: "Dispatched", icon: <ArrowRight className="w-3.5 h-3.5" />, color: "border-purple-500/40", dotColor: "bg-purple-500" },
  { id: "in_service", label: "In Service", icon: <Zap className="w-3.5 h-3.5" />, color: "border-primary/40", dotColor: "bg-primary" },
  { id: "completed", label: "Completed", icon: <Flag className="w-3.5 h-3.5" />, color: "border-success/40", dotColor: "bg-success" },
  { id: "rejected", label: "Rejected", icon: <XCircle className="w-3.5 h-3.5" />, color: "border-destructive/40", dotColor: "bg-destructive" },
];

interface TripPipelineBoardProps {
  trips: any[];
  onSubmit?: (id: string) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onViewDetails?: (trip: any) => void;
  onAssign?: (trip: any) => void;
  onComplete?: (id: string) => void;
  isSubmitting?: boolean;
  visibleColumns?: string[];
}

export const TripPipelineBoard = ({
  trips, onSubmit, onApprove, onReject, onViewDetails, onAssign, onComplete,
  isSubmitting, visibleColumns
}: TripPipelineBoardProps) => {
  const columns = visibleColumns 
    ? PIPELINE_COLUMNS.filter(c => visibleColumns.includes(c.id))
    : PIPELINE_COLUMNS;

  const groupedTrips = useMemo(() => {
    const groups: Record<string, any[]> = {};
    columns.forEach(col => { groups[col.id] = []; });
    trips?.forEach(trip => {
      if (groups[trip.status]) {
        groups[trip.status].push(trip);
      }
    });
    return groups;
  }, [trips, columns]);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 min-h-[500px]">
      {columns.map((col) => {
        const colTrips = groupedTrips[col.id] || [];
        return (
          <div
            key={col.id}
            className={`flex-shrink-0 w-[280px] flex flex-col rounded-xl border-2 border-dashed ${col.color} bg-muted/20`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                <span className="text-xs font-semibold text-foreground">{col.label}</span>
              </div>
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-bold">
                {colTrips.length}
              </Badge>
            </div>

            {/* Cards */}
            <ScrollArea className="flex-1 p-2">
              <div className="space-y-2.5 pb-2">
                <AnimatePresence mode="popLayout">
                  {colTrips.map((trip) => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      onSubmit={onSubmit}
                      onApprove={onApprove}
                      onReject={onReject}
                      onViewDetails={onViewDetails}
                      onAssign={onAssign}
                      onComplete={onComplete}
                      isSubmitting={isSubmitting}
                    />
                  ))}
                </AnimatePresence>
                {colTrips.length === 0 && (
                  <div className="text-center py-8 text-xs text-muted-foreground/60">
                    No trips
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
