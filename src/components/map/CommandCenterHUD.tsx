import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  Shield, AlertTriangle, Activity, Truck, Radio, Zap, 
  Eye, Clock, Fuel, Gauge, Wifi, WifiOff, 
  TrendingUp, TrendingDown, BarChart3, Target,
  Siren, ThermometerSun, Wind, MapPin, Users,
  ChevronUp, ChevronDown, CircleDot
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

interface Vehicle {
  id: string;
  plate: string;
  status: 'moving' | 'idle' | 'stopped' | 'offline';
  speed: number;
  fuel: number;
  isOffline: boolean;
  lat?: number;
  lng?: number;
  gps_jamming_detected?: boolean;
  gps_spoofing_detected?: boolean;
  driverName?: string;
  lastSeen?: string;
}

interface CommandCenterHUDProps {
  vehicles: Vehicle[];
  visible: boolean;
  onClose: () => void;
}

type ThreatLevel = 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';

const threatColors: Record<ThreatLevel, string> = {
  NORMAL: 'bg-emerald-500',
  ELEVATED: 'bg-amber-500',
  HIGH: 'bg-orange-500',
  CRITICAL: 'bg-red-600',
};

const threatGlow: Record<ThreatLevel, string> = {
  NORMAL: 'shadow-emerald-500/30',
  ELEVATED: 'shadow-amber-500/30',
  HIGH: 'shadow-orange-500/40',
  CRITICAL: 'shadow-red-600/50',
};

const threatBorder: Record<ThreatLevel, string> = {
  NORMAL: 'border-emerald-500/30',
  ELEVATED: 'border-amber-500/30',
  HIGH: 'border-orange-500/40',
  CRITICAL: 'border-red-600/50',
};

export function CommandCenterHUD({ vehicles, visible, onClose }: CommandCenterHUDProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [tickerIndex, setTickerIndex] = useState(0);
  const { organizationId } = useOrganization();

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch real alerts
  const { data: recentAlerts } = useQuery({
    queryKey: ['command-center-alerts', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase
        .from('alerts')
        .select('id, title, severity, alert_type, alert_time, status, vehicle_id')
        .eq('organization_id', organizationId)
        .order('alert_time', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!organizationId,
    refetchInterval: 15000,
  });

  // Fetch active geofence events
  const { data: geofenceEvents } = useQuery({
    queryKey: ['command-center-geofence', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase
        .from('geofence_events')
        .select('id, event_type, geofence_id, vehicle_id, created_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!organizationId,
    refetchInterval: 15000,
  });

  // Fleet KPIs
  const kpis = useMemo(() => {
    const total = vehicles.length;
    const online = vehicles.filter(v => !v.isOffline).length;
    const moving = vehicles.filter(v => v.status === 'moving').length;
    const idle = vehicles.filter(v => v.status === 'idle').length;
    const stopped = vehicles.filter(v => v.status === 'stopped').length;
    const offline = vehicles.filter(v => v.isOffline).length;
    const avgSpeed = vehicles.filter(v => v.speed > 0).length > 0
      ? Math.round(vehicles.filter(v => v.speed > 0).reduce((s, v) => s + v.speed, 0) / vehicles.filter(v => v.speed > 0).length)
      : 0;
    const lowFuel = vehicles.filter(v => !v.isOffline && v.fuel > 0 && v.fuel < 20).length;
    const jamming = vehicles.filter(v => v.gps_jamming_detected || v.gps_spoofing_detected).length;
    const readiness = total > 0 ? Math.round((online / total) * 100) : 0;

    return { total, online, moving, idle, stopped, offline, avgSpeed, lowFuel, jamming, readiness };
  }, [vehicles]);

  // Determine threat level from real data
  const threatLevel: ThreatLevel = useMemo(() => {
    const criticalAlerts = recentAlerts?.filter(a => a.severity === 'critical' && a.status === 'active').length || 0;
    const highAlerts = recentAlerts?.filter(a => a.severity === 'high' && a.status === 'active').length || 0;
    
    if (criticalAlerts > 0 || kpis.jamming > 0) return 'CRITICAL';
    if (highAlerts > 2 || kpis.lowFuel > 3 || kpis.readiness < 40) return 'HIGH';
    if (highAlerts > 0 || kpis.lowFuel > 1 || kpis.readiness < 60) return 'ELEVATED';
    return 'NORMAL';
  }, [recentAlerts, kpis]);

  // Ticker messages from real data
  const tickerMessages = useMemo(() => {
    const msgs: string[] = [];
    
    recentAlerts?.slice(0, 5).forEach(a => {
      msgs.push(`⚠ ${a.title} — ${new Date(a.alert_time).toLocaleTimeString()}`);
    });

    geofenceEvents?.slice(0, 3).forEach(e => {
      const action = e.event_type === 'enter' ? 'entered' : 'exited';
      msgs.push(`📍 Vehicle ${action} ${e.geofence_name || 'zone'}`);
    });

    if (kpis.jamming > 0) msgs.unshift(`🔴 GPS JAMMING DETECTED — ${kpis.jamming} vehicle(s) affected`);
    if (kpis.lowFuel > 0) msgs.push(`⛽ ${kpis.lowFuel} vehicle(s) with critically low fuel`);
    if (kpis.moving > 0) msgs.push(`🚛 ${kpis.moving} vehicles actively in transit`);
    
    if (msgs.length === 0) msgs.push('✅ All systems operational — No active incidents');
    
    return msgs;
  }, [recentAlerts, geofenceEvents, kpis]);

  // Rotate ticker
  useEffect(() => {
    if (tickerMessages.length <= 1) return;
    const timer = setInterval(() => {
      setTickerIndex(i => (i + 1) % tickerMessages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [tickerMessages.length]);

  // Top speed vehicle
  const topSpeedVehicle = useMemo(() => {
    const sorted = [...vehicles].filter(v => v.speed > 0).sort((a, b) => b.speed - a.speed);
    return sorted[0] || null;
  }, [vehicles]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* ═══════════════ TOP HUD BAR ═══════════════ */}
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute top-0 left-0 right-0 z-30 pointer-events-none"
          >
            <div className="pointer-events-auto">
              {/* Primary Status Bar */}
              <div className={cn(
                "bg-black/85 backdrop-blur-xl border-b",
                threatBorder[threatLevel],
                "px-4 py-2 flex items-center gap-3"
              )}>
                {/* Threat Level Indicator */}
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg border",
                  threatBorder[threatLevel],
                  "bg-black/50"
                )}>
                  <div className={cn(
                    "w-3 h-3 rounded-full animate-pulse shadow-lg",
                    threatColors[threatLevel],
                    threatGlow[threatLevel]
                  )} />
                  <span className="text-[11px] font-bold tracking-widest text-white/90 font-mono">
                    {threatLevel}
                  </span>
                </div>

                {/* Live Clock */}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/5 border border-white/10">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-xs font-mono text-cyan-300 tracking-wider">
                    {currentTime.toLocaleTimeString('en-US', { hour12: false })}
                  </span>
                </div>

                {/* Date */}
                <span className="text-[10px] text-white/40 font-mono hidden sm:block">
                  {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>

                {/* Center: Title */}
                <div className="flex-1 text-center">
                  <span className="text-xs font-bold tracking-[0.3em] text-white/70 uppercase font-mono">
                    Fleet Command Center
                  </span>
                </div>

                {/* Fleet Readiness */}
                <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-white/5 border border-white/10">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-mono text-white/80">READINESS</span>
                  <span className={cn(
                    "text-sm font-bold font-mono",
                    kpis.readiness >= 75 ? "text-emerald-400" :
                    kpis.readiness >= 50 ? "text-amber-400" : "text-red-400"
                  )}>
                    {kpis.readiness}%
                  </span>
                </div>

                {/* Close */}
                <button
                  onClick={onClose}
                  className="text-white/40 hover:text-white/80 transition-colors text-xs font-mono px-2 py-1 rounded border border-white/10 hover:border-white/30"
                >
                  ESC
                </button>
              </div>

              {/* KPI Strip */}
              <div className="bg-black/70 backdrop-blur-lg border-b border-white/5 px-4 py-1.5 flex items-center gap-1 overflow-x-auto">
                {[
                  { icon: Truck, label: 'FLEET', value: kpis.total, color: 'text-slate-300' },
                  { icon: Wifi, label: 'ONLINE', value: kpis.online, color: 'text-emerald-400', pulse: true },
                  { icon: Activity, label: 'MOVING', value: kpis.moving, color: 'text-blue-400' },
                  { icon: CircleDot, label: 'IDLE', value: kpis.idle, color: 'text-amber-400' },
                  { icon: WifiOff, label: 'OFFLINE', value: kpis.offline, color: kpis.offline > 0 ? 'text-red-400' : 'text-slate-500' },
                  { icon: Gauge, label: 'AVG SPD', value: `${kpis.avgSpeed}`, unit: 'km/h', color: 'text-cyan-400' },
                  { icon: Fuel, label: 'LOW FUEL', value: kpis.lowFuel, color: kpis.lowFuel > 0 ? 'text-orange-400' : 'text-slate-500', alert: kpis.lowFuel > 0 },
                  { icon: Shield, label: 'JAMMING', value: kpis.jamming, color: kpis.jamming > 0 ? 'text-red-500' : 'text-slate-500', alert: kpis.jamming > 0 },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-transparent",
                      kpi.alert && "border-red-500/30 bg-red-500/10"
                    )}
                  >
                    <kpi.icon className={cn("w-3.5 h-3.5", kpi.color, kpi.pulse && "animate-pulse")} />
                    <div className="flex flex-col">
                      <span className="text-[8px] font-mono text-white/40 tracking-wider leading-tight">{kpi.label}</span>
                      <span className={cn("text-sm font-bold font-mono leading-tight", kpi.color)}>
                        {kpi.value}
                        {kpi.unit && <span className="text-[9px] ml-0.5 text-white/30">{kpi.unit}</span>}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Scrolling Ticker */}
              <div className="bg-black/60 backdrop-blur-sm border-b border-white/5 px-4 py-1 overflow-hidden">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-red-600/20 text-red-400 border-red-600/30 text-[9px] px-1.5 py-0 font-mono shrink-0">
                    LIVE
                  </Badge>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={tickerIndex}
                      initial={{ y: 12, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -12, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-[11px] font-mono text-white/70 whitespace-nowrap"
                    >
                      {tickerMessages[tickerIndex]}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ═══════════════ BOTTOM HUD BAR ═══════════════ */}
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300, delay: 0.1 }}
            className="absolute bottom-0 left-0 right-80 z-30 pointer-events-auto"
          >
            <div className="bg-black/80 backdrop-blur-xl border-t border-white/10 px-4 py-2 flex items-center justify-between gap-4">
              {/* Top Speed Monitor */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/10">
                  <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[9px] font-mono text-white/50">TOP SPEED</span>
                  {topSpeedVehicle ? (
                    <span className={cn(
                      "text-xs font-bold font-mono",
                      topSpeedVehicle.speed > 120 ? "text-red-400" : "text-cyan-300"
                    )}>
                      {topSpeedVehicle.speed} km/h
                      <span className="text-[9px] text-white/30 ml-1">({topSpeedVehicle.plate})</span>
                    </span>
                  ) : (
                    <span className="text-xs font-mono text-white/30">—</span>
                  )}
                </div>

                {/* Active Alerts */}
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/10">
                  <AlertTriangle className={cn(
                    "w-3.5 h-3.5",
                    (recentAlerts?.filter(a => a.status === 'active').length || 0) > 0 ? "text-amber-400 animate-pulse" : "text-white/30"
                  )} />
                  <span className="text-[9px] font-mono text-white/50">ALERTS</span>
                  <span className="text-xs font-bold font-mono text-amber-300">
                    {recentAlerts?.filter(a => a.status === 'active').length || 0}
                  </span>
                </div>

                {/* Geofence Activity */}
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/10">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[9px] font-mono text-white/50">ZONE EVENTS</span>
                  <span className="text-xs font-bold font-mono text-indigo-300">
                    {geofenceEvents?.length || 0}
                  </span>
                </div>
              </div>

              {/* System Status */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] font-mono text-emerald-400">SYSTEMS NOMINAL</span>
                </div>
                <span className="text-[9px] font-mono text-white/20">
                  UPLINK ACTIVE
                </span>
              </div>
            </div>
          </motion.div>

          {/* ═══════════════ CORNER: READINESS GAUGE ═══════════════ */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ delay: 0.2 }}
            className="absolute bottom-16 left-16 z-30 pointer-events-none"
          >
            <div className="relative w-28 h-28">
              {/* SVG Gauge */}
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                <circle
                  cx="50" cy="50" r="42"
                  fill="none"
                  stroke={kpis.readiness >= 75 ? '#34d399' : kpis.readiness >= 50 ? '#fbbf24' : '#f87171'}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${kpis.readiness * 2.64} 264`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn(
                  "text-2xl font-black font-mono",
                  kpis.readiness >= 75 ? "text-emerald-400" :
                  kpis.readiness >= 50 ? "text-amber-400" : "text-red-400"
                )}>
                  {kpis.readiness}
                </span>
                <span className="text-[7px] font-mono text-white/40 tracking-widest">READINESS</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
