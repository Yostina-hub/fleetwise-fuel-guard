import { AlertTriangle, Radio, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface GpsJammingIndicatorProps {
  jammingDetected?: boolean;
  spoofingDetected?: boolean;
  showLabel?: boolean;
}

export function GpsJammingIndicator({
  jammingDetected = false,
  spoofingDetected = false,
  showLabel = true,
}: GpsJammingIndicatorProps) {
  if (!jammingDetected && !spoofingDetected) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="destructive" 
            className="gap-1 animate-pulse cursor-help"
          >
            {jammingDetected && <Radio className="w-3 h-3" />}
            {spoofingDetected && <ShieldAlert className="w-3 h-3" />}
            {showLabel && (
              <span>
                {jammingDetected && spoofingDetected
                  ? "GPS Threat"
                  : jammingDetected
                  ? "Jamming"
                  : "Spoofing"}
              </span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            {jammingDetected && (
              <div className="flex items-start gap-2">
                <Radio className="w-4 h-4 text-destructive mt-0.5" />
                <div>
                  <p className="font-semibold text-destructive">GPS Jamming Detected</p>
                  <p className="text-xs text-muted-foreground">
                    Signal interference detected. Location may be unreliable.
                  </p>
                </div>
              </div>
            )}
            {spoofingDetected && (
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-destructive mt-0.5" />
                <div>
                  <p className="font-semibold text-destructive">GPS Spoofing Detected</p>
                  <p className="text-xs text-muted-foreground">
                    Location may be falsified. Investigate immediately.
                  </p>
                </div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
