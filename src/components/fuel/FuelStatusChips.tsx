import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusCount {
  all: number;
  refuel: number;
  theft: number;
  leak: number;
  drain: number;
  pending: number;
  confirmed: number;
}

interface FuelStatusChipsProps {
  counts: StatusCount;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

const FuelStatusChips = ({ counts, activeFilter, onFilterChange }: FuelStatusChipsProps) => {
  const statusItems = [
    { key: "all", label: "ALL", count: counts.all, color: "bg-primary/20 text-primary border-primary/30" },
    { key: "refuel", label: "REFUEL", count: counts.refuel, color: "bg-success/20 text-success border-success/30" },
    { key: "theft", label: "THEFT", count: counts.theft, color: "bg-destructive/20 text-destructive border-destructive/30" },
    { key: "leak", label: "LEAK", count: counts.leak, color: "bg-warning/20 text-warning border-warning/30" },
    { key: "drain", label: "DRAIN", count: counts.drain, color: "bg-orange-500/20 text-orange-500 border-orange-500/30" },
    { key: "pending", label: "PENDING", count: counts.pending, color: "bg-muted text-muted-foreground border-border" },
    { key: "confirmed", label: "CONFIRMED", count: counts.confirmed, color: "bg-blue-500/20 text-blue-500 border-blue-500/30" },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {statusItems.map((item) => (
        <button
          key={item.key}
          onClick={() => onFilterChange(item.key)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all",
            item.color,
            activeFilter === item.key && "ring-2 ring-offset-2 ring-offset-background ring-primary/50"
          )}
        >
          <span className="font-bold">{item.count}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
};

export default FuelStatusChips;
