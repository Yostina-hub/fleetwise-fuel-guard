import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Car,
  Navigation,
  Clock,
  Power,
  WifiOff,
  Gauge,
  Fuel,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
} from 'lucide-react';

interface FleetStatsBarProps {
  totalVehicles: number;
  movingVehicles: number;
  idleVehicles: number;
  stoppedVehicles: number;
  offlineVehicles: number;
  avgSpeed: number;
  avgFuel: number;
  activeAlerts: number;
  className?: string;
}

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  decimals?: number;
}

const AnimatedCounter = ({ value, suffix = '', decimals = 0 }: AnimatedCounterProps) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const duration = 800;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(current);
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [value]);
  
  return (
    <span className="tabular-nums">
      {decimals > 0 ? displayValue.toFixed(decimals) : Math.round(displayValue)}
      {suffix}
    </span>
  );
};

export const FleetStatsBar = ({
  totalVehicles,
  movingVehicles,
  idleVehicles,
  stoppedVehicles,
  offlineVehicles,
  avgSpeed,
  avgFuel,
  activeAlerts,
  className,
}: FleetStatsBarProps) => {
  const onlineVehicles = totalVehicles - offlineVehicles;
  const utilizationRate = totalVehicles > 0 ? ((movingVehicles + idleVehicles) / totalVehicles) * 100 : 0;
  
  const stats = [
    {
      label: 'Fleet Online',
      value: onlineVehicles,
      total: totalVehicles,
      icon: Car,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      gradient: 'from-primary/20 to-primary/5',
      showRatio: true,
    },
    {
      label: 'Moving',
      value: movingVehicles,
      icon: Navigation,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      gradient: 'from-emerald-500/20 to-emerald-500/5',
      pulse: movingVehicles > 0,
    },
    {
      label: 'Idle',
      value: idleVehicles,
      icon: Power,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      gradient: 'from-amber-500/20 to-amber-500/5',
    },
    {
      label: 'Stopped',
      value: stoppedVehicles,
      icon: Clock,
      color: 'text-slate-400',
      bgColor: 'bg-slate-400/10',
      gradient: 'from-slate-400/20 to-slate-400/5',
    },
    {
      label: 'Offline',
      value: offlineVehicles,
      icon: WifiOff,
      color: offlineVehicles > 0 ? 'text-rose-500' : 'text-muted-foreground',
      bgColor: offlineVehicles > 0 ? 'bg-rose-500/10' : 'bg-muted/50',
      gradient: offlineVehicles > 0 ? 'from-rose-500/20 to-rose-500/5' : 'from-muted/20 to-muted/5',
      warning: offlineVehicles > 0,
    },
    {
      label: 'Avg Speed',
      value: avgSpeed,
      suffix: ' km/h',
      icon: Gauge,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      gradient: 'from-blue-500/20 to-blue-500/5',
      decimals: 0,
    },
    {
      label: 'Avg Fuel',
      value: avgFuel,
      suffix: '%',
      icon: Fuel,
      color: avgFuel < 25 ? 'text-amber-500' : 'text-cyan-500',
      bgColor: avgFuel < 25 ? 'bg-amber-500/10' : 'bg-cyan-500/10',
      gradient: avgFuel < 25 ? 'from-amber-500/20 to-amber-500/5' : 'from-cyan-500/20 to-cyan-500/5',
      decimals: 0,
    },
    {
      label: 'Utilization',
      value: utilizationRate,
      suffix: '%',
      icon: Zap,
      color: utilizationRate >= 70 ? 'text-emerald-500' : utilizationRate >= 40 ? 'text-amber-500' : 'text-rose-500',
      bgColor: utilizationRate >= 70 ? 'bg-emerald-500/10' : utilizationRate >= 40 ? 'bg-amber-500/10' : 'bg-rose-500/10',
      gradient: utilizationRate >= 70 ? 'from-emerald-500/20 to-emerald-500/5' : utilizationRate >= 40 ? 'from-amber-500/20 to-amber-500/5' : 'from-rose-500/20 to-rose-500/5',
      decimals: 1,
    },
  ];

  return (
    <div className={cn("absolute bottom-4 left-4 z-20", className)}>
      <div className="bg-background/80 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl p-3 overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none rounded-2xl" />
        
        <div className="relative grid grid-cols-4 lg:grid-cols-8 gap-2">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={cn(
                "relative group p-2.5 rounded-xl transition-all duration-300 cursor-default",
                "hover:scale-105 hover:shadow-lg",
                `bg-gradient-to-br ${stat.gradient}`
              )}
            >
              {/* Pulse effect for active items */}
              {stat.pulse && (
                <div className="absolute inset-0 rounded-xl bg-emerald-500/10 animate-pulse" />
              )}
              
              {/* Warning indicator */}
              {stat.warning && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
              )}
              
              <div className="relative flex flex-col items-center gap-1">
                <div className={cn("p-1.5 rounded-lg", stat.bgColor)}>
                  <stat.icon className={cn("w-3.5 h-3.5", stat.color)} aria-hidden="true" />
                </div>
                <div className={cn("text-lg font-bold", stat.color)}>
                  {stat.showRatio ? (
                    <span className="tabular-nums">
                      <AnimatedCounter value={stat.value} /> 
                      <span className="text-xs text-muted-foreground font-normal">/{stat.total}</span>
                    </span>
                  ) : (
                    <AnimatedCounter 
                      value={stat.value} 
                      suffix={stat.suffix} 
                      decimals={stat.decimals}
                    />
                  )}
                </div>
                <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">
                  {stat.label}
                </span>
              </div>
            </div>
          ))}
        </div>
        
        {/* Active Alerts Indicator */}
        {activeAlerts > 0 && (
          <div className="mt-2 flex items-center justify-center gap-2 px-3 py-1.5 bg-destructive/10 rounded-lg border border-destructive/20">
            <AlertTriangle className="w-4 h-4 text-destructive animate-bounce" />
            <span className="text-xs font-bold text-destructive">
              {activeAlerts} Active Alert{activeAlerts > 1 ? 's' : ''} - Requires Attention
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
