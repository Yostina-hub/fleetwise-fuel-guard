import { cn } from '@/lib/utils';
import { 
  Navigation, 
  Fuel, 
  Power, 
  WifiOff,
  AlertTriangle,
  Gauge,
  Clock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Vehicle {
  id: string;
  plate: string;
  status: 'moving' | 'idle' | 'stopped' | 'offline';
  lat: number;
  lng: number;
  speed: number;
  fuel: number;
  heading?: number;
  engine_on?: boolean;
  lastSeen?: string;
  isOffline?: boolean;
  speedLimit?: number;
  driverName?: string;
  gps_jamming_detected?: boolean;
  gps_spoofing_detected?: boolean;
}

interface VehicleMiniCardProps {
  vehicle: Vehicle;
  isSelected: boolean;
  onClick: () => void;
}

export const VehicleMiniCard = ({ vehicle, isSelected, onClick }: VehicleMiniCardProps) => {
  const isOverspeeding = vehicle.speedLimit && vehicle.speed > vehicle.speedLimit;
  const isLowFuel = vehicle.fuel < 20;
  const hasAlert = isOverspeeding || isLowFuel || vehicle.gps_jamming_detected || vehicle.gps_spoofing_detected;
  
  const statusConfig = {
    moving: { 
      bg: 'bg-emerald-500/10', 
      border: 'border-emerald-500/30',
      dot: 'bg-emerald-500',
      text: 'text-emerald-600',
      pulse: true,
    },
    idle: { 
      bg: 'bg-amber-500/10', 
      border: 'border-amber-500/30',
      dot: 'bg-amber-500',
      text: 'text-amber-600',
      pulse: false,
    },
    stopped: { 
      bg: 'bg-slate-400/10', 
      border: 'border-slate-400/30',
      dot: 'bg-slate-400',
      text: 'text-slate-500',
      pulse: false,
    },
    offline: { 
      bg: 'bg-rose-500/10', 
      border: 'border-rose-500/30',
      dot: 'bg-rose-500',
      text: 'text-rose-600',
      pulse: false,
    },
  };
  
  const config = statusConfig[vehicle.status];
  
  return (
    <div
      className={cn(
        "relative p-3 rounded-xl cursor-pointer transition-all duration-300",
        "border backdrop-blur-sm",
        isSelected 
          ? "bg-primary/10 border-primary/50 ring-2 ring-primary/20 shadow-lg scale-[1.02]" 
          : `${config.bg} ${config.border} hover:scale-[1.02] hover:shadow-md`,
        vehicle.isOffline && "opacity-60"
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`${vehicle.plate}, ${vehicle.status}`}
      aria-selected={isSelected}
    >
      {/* Alert Indicator */}
      {hasAlert && (
        <div className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-destructive rounded-full shadow-lg animate-pulse">
          <AlertTriangle className="w-3 h-3 text-white" />
        </div>
      )}
      
      {/* Status Pulse */}
      {config.pulse && !vehicle.isOffline && (
        <div className={cn("absolute top-3 left-3 w-2 h-2 rounded-full animate-ping", config.dot)} />
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={cn("w-2.5 h-2.5 rounded-full", config.dot)} />
          <span className="font-bold text-sm tracking-tight">{vehicle.plate}</span>
        </div>
        {vehicle.status === 'moving' && vehicle.heading !== undefined && (
          <Navigation 
            className={cn("w-4 h-4", config.text)}
            style={{ transform: `rotate(${vehicle.heading}deg)` }}
          />
        )}
        {vehicle.isOffline && (
          <WifiOff className="w-4 h-4 text-rose-500" />
        )}
      </div>
      
      {/* Metrics Row */}
      {!vehicle.isOffline && (
        <div className="flex items-center gap-3 text-xs">
          {/* Speed */}
          <div className={cn(
            "flex items-center gap-1",
            isOverspeeding ? "text-destructive font-semibold" : "text-muted-foreground"
          )}>
            <Gauge className="w-3 h-3" />
            <span className="tabular-nums">{vehicle.speed}</span>
            <span className="text-[10px]">km/h</span>
          </div>
          
          {/* Fuel */}
          <div className={cn(
            "flex items-center gap-1",
            isLowFuel ? "text-amber-500 font-semibold" : "text-muted-foreground"
          )}>
            <Fuel className="w-3 h-3" />
            <span className="tabular-nums">{vehicle.fuel}%</span>
          </div>
          
          {/* Engine Status */}
          <div className={cn(
            "flex items-center gap-1",
            vehicle.engine_on ? "text-emerald-500" : "text-muted-foreground"
          )}>
            <Power className="w-3 h-3" />
            <span>{vehicle.engine_on ? 'ON' : 'OFF'}</span>
          </div>
        </div>
      )}
      
      {/* Driver & Time */}
      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
        {vehicle.driverName && (
          <span className="truncate max-w-[60%]">{vehicle.driverName}</span>
        )}
        {vehicle.lastSeen && (
          <span className="flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {formatDistanceToNow(new Date(vehicle.lastSeen), { addSuffix: true })}
          </span>
        )}
      </div>
    </div>
  );
};
