import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: "online" | "offline" | "idle" | "moving" | "stopped" | "warning" | "critical";
  className?: string;
}

const statusConfig = {
  online: { label: "Online", className: "bg-success/10 text-success border-success/20" },
  offline: { label: "Offline", className: "bg-muted text-muted-foreground border-border" },
  idle: { label: "Idle", className: "bg-warning/10 text-warning border-warning/20" },
  moving: { label: "Moving", className: "bg-primary/10 text-primary border-primary/20" },
  stopped: { label: "Stopped", className: "bg-muted text-muted-foreground border-border" },
  warning: { label: "Warning", className: "bg-warning/10 text-warning border-warning/20" },
  critical: { label: "Critical", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const config = statusConfig[status];
  
  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", 
        status === "online" && "bg-success",
        status === "moving" && "bg-primary",
        status === "idle" && "bg-warning",
        status === "warning" && "bg-warning",
        status === "critical" && "bg-destructive",
        (status === "offline" || status === "stopped") && "bg-muted-foreground"
      )} />
      {config.label}
    </Badge>
  );
};

export default StatusBadge;
