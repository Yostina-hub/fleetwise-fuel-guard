import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, AlertCircle, Info, ExternalLink, MapPin, Clock } from "lucide-react";
import { useHeaderAlerts } from "@/hooks/useHeaderAlerts";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const severityConfig: Record<string, { icon: typeof AlertTriangle; color: string; bg: string; label: string }> = {
  critical: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10", label: "Critical" },
  warning: { icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-500/10", label: "Warning" },
  info: { icon: Info, color: "text-cyan-400", bg: "bg-cyan-500/10", label: "Info" },
};

export const HeaderAlertBell = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const {
    criticalCount,
    warningCount,
    infoCount,
    totalUnresolved,
    recentAlerts,
    loading,
  } = useHeaderAlerts();

  const handleAlertClick = (alert: any) => {
    if (alert.lat && alert.lng) {
      navigate(`/map?lat=${alert.lat}&lng=${alert.lng}&alertId=${alert.id}`);
    } else {
      navigate(`/alerts`);
    }
    setOpen(false);
  };

  const bellColor = criticalCount > 0
    ? "text-red-400 hover:text-red-300"
    : warningCount > 0
    ? "text-amber-400 hover:text-amber-300"
    : "text-white/60 hover:text-white";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative h-8 w-8", bellColor, "hover:bg-[#2a3a4d]")}
          aria-label={`${totalUnresolved} unresolved alerts`}
        >
          <AlertTriangle className={cn("h-5 w-5", criticalCount > 0 && "animate-pulse")} />
          {totalUnresolved > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-[20px] rounded-full p-0 flex items-center justify-center text-[10px] font-bold"
            >
              {totalUnresolved > 99 ? "99+" : totalUnresolved}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="end" sideOffset={8}>
        {/* Header */}
        <div className="p-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Active Alerts</h3>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1"
              onClick={() => { navigate("/alerts"); setOpen(false); }}
            >
              View All <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
          {/* Severity Summary */}
          <div className="flex items-center gap-3 mt-2">
            {criticalCount > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span className="font-bold text-red-400">{criticalCount}</span>
                <span className="text-muted-foreground">critical</span>
              </div>
            )}
            {warningCount > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-bold text-amber-400">{warningCount}</span>
                <span className="text-muted-foreground">warning</span>
              </div>
            )}
            {infoCount > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-bold text-cyan-400">{infoCount}</span>
                <span className="text-muted-foreground">info</span>
              </div>
            )}
            {totalUnresolved === 0 && (
              <span className="text-xs text-muted-foreground">All clear — no active alerts</span>
            )}
          </div>
        </div>

        {/* Alert List */}
        <ScrollArea className="max-h-[350px]">
          {loading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Loading...</div>
          ) : recentAlerts.length === 0 ? (
            <div className="p-8 text-center">
              <AlertTriangle className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No active alerts</p>
            </div>
          ) : (
            <div className="divide-y">
              {recentAlerts.map((alert: any) => {
                const config = severityConfig[alert.severity] || severityConfig.info;
                const Icon = config.icon;
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "p-3 hover:bg-muted/50 transition-colors cursor-pointer flex items-start gap-3",
                      alert.status === 'unacknowledged' && config.bg
                    )}
                    onClick={() => handleAlertClick(alert)}
                  >
                    <div className={cn("p-1.5 rounded-md mt-0.5", config.bg)}>
                      <Icon className={cn("w-4 h-4", config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{alert.title}</p>
                        {alert.status === 'unacknowledged' && (
                          <div className="h-2 w-2 rounded-full bg-red-400 shrink-0 animate-pulse" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{alert.message}</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(alert.alert_time), { addSuffix: true })}
                        </span>
                        {alert.lat && (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="w-3 h-3" />
                            Map
                          </span>
                        )}
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                          {(alert.alert_type || '').replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {recentAlerts.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full text-sm"
                onClick={() => { navigate("/alerts"); setOpen(false); }}
              >
                View all {totalUnresolved} active alerts
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};
