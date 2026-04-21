import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getVehicleLiveStatusMeta, type VehicleLiveStatusKey } from "@/lib/vehicleLiveStatus";

interface Props {
  status?: VehicleLiveStatusKey | string | null;
  /** Render compact (icon only) — used in tight cells / badges next to plate. */
  compact?: boolean;
  className?: string;
}

/**
 * Single source of truth for displaying a vehicle's live status anywhere in
 * the fleet UI. Always shows colour, dot, icon and label that match each
 * other — no more mismatch between icon and column text.
 */
const VehicleLiveStatusBadge = ({ status, compact = false, className }: Props) => {
  const meta = getVehicleLiveStatusMeta(status);
  const Icon = meta.icon;

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 px-2 py-0.5 font-medium whitespace-nowrap",
        meta.className,
        className,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", meta.dotClass)} aria-hidden="true" />
      <Icon className="w-3 h-3" aria-hidden="true" />
      {!compact && <span className="text-xs">{meta.label}</span>}
    </Badge>
  );

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">{badge}</span>
        </TooltipTrigger>
        <TooltipContent side="top">
          <div className="text-xs">
            <p className="font-semibold">{meta.label}</p>
            <p className="text-muted-foreground">{meta.description}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default VehicleLiveStatusBadge;
