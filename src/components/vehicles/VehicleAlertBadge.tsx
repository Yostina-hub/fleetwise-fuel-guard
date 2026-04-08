import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VehicleAlertBadgeProps {
  vehicleId: string;
  organizationId?: string;
}

/**
 * Shows a red alert count badge if a vehicle has unresolved alerts (last 24h).
 * Green shield if clean. Queries the alerts table.
 */
const VehicleAlertBadge = ({ vehicleId }: VehicleAlertBadgeProps) => {
  const { data: alertCount = 0 } = useQuery({
    queryKey: ["vehicle-alert-count", vehicleId],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("alerts")
        .select("id", { count: "exact", head: true })
        .eq("vehicle_id", vehicleId)
        .is("resolved_at", null)
        .gte("alert_time", since);
      return count || 0;
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  if (alertCount === 0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <ShieldCheck className="w-3.5 h-3.5 text-success/60" />
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">No active alerts</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative">
          <AlertTriangle className="w-3.5 h-3.5 text-destructive animate-pulse" />
          <span className="absolute -top-1.5 -right-2 bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
            {alertCount > 9 ? "9+" : alertCount}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {alertCount} active alert{alertCount > 1 ? "s" : ""} (24h)
      </TooltipContent>
    </Tooltip>
  );
};

export default VehicleAlertBadge;
