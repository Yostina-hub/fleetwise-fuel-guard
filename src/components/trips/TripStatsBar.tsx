import { useMemo } from "react";
import { motion } from "framer-motion";
import { 
  FileEdit, Send, CheckCircle, Truck, Zap, Flag, XCircle, TrendingUp 
} from "lucide-react";

interface TripStatsBarProps {
  trips: any[];
  activeFilter: string | null;
  onFilterChange: (status: string | null) => void;
}

const STAT_ITEMS = [
  { key: "all", label: "All", icon: TrendingUp, color: "text-foreground", bg: "bg-muted hover:bg-muted/80" },
  { key: "draft", label: "Drafts", icon: FileEdit, color: "text-muted-foreground", bg: "bg-muted/50 hover:bg-muted" },
  { key: "submitted", label: "Pending", icon: Send, color: "text-warning", bg: "bg-warning/10 hover:bg-warning/20" },
  { key: "approved", label: "Approved", icon: CheckCircle, color: "text-success", bg: "bg-success/10 hover:bg-success/20" },
  { key: "scheduled", label: "Scheduled", icon: Truck, color: "text-secondary", bg: "bg-secondary/10 hover:bg-secondary/20" },
  { key: "in_service", label: "Active", icon: Zap, color: "text-primary", bg: "bg-primary/10 hover:bg-primary/20" },
  { key: "completed", label: "Done", icon: Flag, color: "text-success", bg: "bg-success/10 hover:bg-success/20" },
  { key: "rejected", label: "Rejected", icon: XCircle, color: "text-destructive", bg: "bg-destructive/10 hover:bg-destructive/20" },
];

export const TripStatsBar = ({ trips, activeFilter, onFilterChange }: TripStatsBarProps) => {
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: trips?.length || 0 };
    trips?.forEach(t => { c[t.status] = (c[t.status] || 0) + 1; });
    return c;
  }, [trips]);

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
      {STAT_ITEMS.map((item) => {
        const count = counts[item.key] || 0;
        const isActive = activeFilter === item.key || (activeFilter === null && item.key === "all");

        return (
          <motion.button
            key={item.key}
            whileTap={{ scale: 0.97 }}
            onClick={() => onFilterChange(item.key === "all" ? null : item.key)}
            className={`
              relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
              ${isActive 
                ? `${item.bg} ${item.color} ring-1 ring-current/20 shadow-sm` 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }
            `}
          >
            <item.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{item.label}</span>
            <span className="font-bold tabular-nums">{count}</span>
            {isActive && (
              <motion.div
                layoutId="trip-filter-indicator"
                className="absolute inset-0 rounded-lg border border-current/20"
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
};
