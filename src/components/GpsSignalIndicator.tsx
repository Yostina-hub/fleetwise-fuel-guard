import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Satellite, AlertTriangle, Signal, SignalHigh, SignalLow, SignalZero } from "lucide-react";
import { cn } from "@/lib/utils";

interface GpsSignalIndicatorProps {
  signalStrength?: number;
  satellitesCount?: number;
  hdop?: number;
  fixType?: 'no_fix' | '2d_fix' | '3d_fix';
  showDetails?: boolean;
  variant?: 'default' | 'compact';
}

export const GpsSignalIndicator = ({
  signalStrength = 0,
  satellitesCount = 0,
  hdop,
  fixType = 'no_fix',
  showDetails = false,
  variant = 'default',
}: GpsSignalIndicatorProps) => {
  
  const getSignalQuality = () => {
    if (fixType === 'no_fix' || signalStrength === 0) return 'no-signal';
    if (signalStrength >= 75) return 'excellent';
    if (signalStrength >= 50) return 'good';
    if (signalStrength >= 25) return 'poor';
    return 'weak';
  };

  const getSignalIcon = () => {
    const quality = getSignalQuality();
    switch (quality) {
      case 'no-signal':
        return <SignalZero className="h-4 w-4" />;
      case 'weak':
      case 'poor':
        return <SignalLow className="h-4 w-4" />;
      case 'good':
        return <Signal className="h-4 w-4" />;
      case 'excellent':
        return <SignalHigh className="h-4 w-4" />;
    }
  };

  const getSignalColor = () => {
    const quality = getSignalQuality();
    switch (quality) {
      case 'no-signal':
        return 'bg-gray-500';
      case 'weak':
        return 'bg-red-500';
      case 'poor':
        return 'bg-orange-500';
      case 'good':
        return 'bg-yellow-500';
      case 'excellent':
        return 'bg-green-500';
    }
  };

  const getSignalText = () => {
    const quality = getSignalQuality();
    switch (quality) {
      case 'no-signal':
        return 'No GPS Signal';
      case 'weak':
        return 'Weak Signal';
      case 'poor':
        return 'Poor Signal';
      case 'good':
        return 'Good Signal';
      case 'excellent':
        return 'Excellent Signal';
    }
  };

  const getAccuracyText = () => {
    if (!hdop) return 'Unknown';
    if (hdop <= 1) return 'Excellent (<1m)';
    if (hdop <= 2) return 'Good (1-5m)';
    if (hdop <= 5) return 'Moderate (5-10m)';
    if (hdop <= 10) return 'Fair (10-20m)';
    return 'Poor (>20m)';
  };

  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={cn(
                "gap-1.5",
                getSignalQuality() === 'no-signal' && "border-gray-500 text-gray-500",
                getSignalQuality() === 'weak' && "border-red-500 text-red-500",
                getSignalQuality() === 'poor' && "border-orange-500 text-orange-500",
                getSignalQuality() === 'good' && "border-yellow-500 text-yellow-500",
                getSignalQuality() === 'excellent' && "border-green-500 text-green-500"
              )}
            >
              {getSignalIcon()}
              <span>{signalStrength}%</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1.5">
              <div className="font-medium">{getSignalText()}</div>
              <div className="text-xs space-y-1">
                <div>Satellites: {satellitesCount}</div>
                <div>Fix Type: {fixType?.replace('_', ' ').toUpperCase()}</div>
                {hdop && <div>Accuracy: {getAccuracyText()}</div>}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg bg-card">
      <div className={cn("p-2 rounded-full", getSignalColor())}>
        <Satellite className="h-5 w-5 text-white" />
      </div>
      
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm">{getSignalText()}</span>
          <Badge variant="outline" className="gap-1">
            {getSignalIcon()}
            {signalStrength}%
          </Badge>
        </div>
        
        {showDetails && (
          <div className="text-xs text-muted-foreground space-y-0.5">
            <div className="flex justify-between">
              <span>Satellites:</span>
              <span className="font-medium">{satellitesCount} visible</span>
            </div>
            <div className="flex justify-between">
              <span>Fix Type:</span>
              <span className="font-medium">{fixType?.replace('_', ' ').toUpperCase()}</span>
            </div>
            {hdop && (
              <div className="flex justify-between">
                <span>Accuracy:</span>
                <span className="font-medium">{getAccuracyText()}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {getSignalQuality() === 'no-signal' && (
        <AlertTriangle className="h-5 w-5 text-yellow-500" />
      )}
    </div>
  );
};
