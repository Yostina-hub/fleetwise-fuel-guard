import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gauge, ShieldAlert, Fuel, MapPin, X, AlertTriangle,
  Clock, Truck, ChevronDown, ChevronUp, Zap, Eye
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AnomalyMapLayerProps {
  map: any;
  visible: boolean;
  onClose: () => void;
}

interface Anomaly {
  id: string;
  type: 'overspeed' | 'speed_violation' | 'geofence_enter' | 'geofence_exit' | 'fuel_theft' | 'fuel_drain' | 'fuel_refuel';
  lat: number;
  lng: number;
  speed_kmh?: number | null;
  vehicle_id: string;
  plate?: string;
  geofence_name?: string;
  event_time: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  details: string;
  fuel_change_percent?: number | null;
}

const ANOMALY_ICONS: Record<string, { emoji: string; color: string; label: string }> = {
  overspeed: { emoji: '🏎️', color: '#ef4444', label: 'Overspeed' },
  speed_violation: { emoji: '⚡', color: '#f97316', label: 'Speed Violation' },
  geofence_enter: { emoji: '📍', color: '#6366f1', label: 'Zone Entry' },
  geofence_exit: { emoji: '🚪', color: '#8b5cf6', label: 'Zone Exit' },
  fuel_theft: { emoji: '🔴', color: '#dc2626', label: 'Fuel Theft' },
  fuel_drain: { emoji: '⛽', color: '#ea580c', label: 'Fuel Drain' },
  fuel_refuel: { emoji: '🟢', color: '#16a34a', label: 'Refuel' },
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-600 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-amber-500 text-black',
  low: 'bg-blue-500 text-white',
};

export function AnomalyMapLayer({ map, visible, onClose }: AnomalyMapLayerProps) {
  const { organizationId } = useOrganization();
  const markersRef = useRef<any[]>([]);
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
  const [showList, setShowList] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  // Fetch geofence events (real data — speed violations, entries, exits)
  const { data: geofenceEvents } = useQuery({
    queryKey: ['anomaly-geofence-events', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase
        .from('geofence_events')
        .select('id, event_type, lat, lng, speed_kmh, event_time, vehicle_id, geofence_id')
        .eq('organization_id', organizationId)
        .not('lat', 'is', null)
        .order('event_time', { ascending: false })
        .limit(200);

      // Fetch geofence names
      if (!data || data.length === 0) return [];
      const geofenceIds = [...new Set(data.map(e => e.geofence_id).filter(Boolean))];
      const { data: geofences } = await supabase
        .from('geofences')
        .select('id, name')
        .in('id', geofenceIds);
      const gfMap = new Map(geofences?.map(g => [g.id, g.name]) || []);

      return data.map(e => ({ ...e, geofence_name: gfMap.get(e.geofence_id) || 'Unknown Zone' }));
    },
    enabled: !!organizationId && visible,
    refetchInterval: 30000,
  });

  // Fetch fuel events
  const { data: fuelEvents } = useQuery({
    queryKey: ['anomaly-fuel-events', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase
        .from('fuel_events')
        .select('id, event_type, lat, lng, speed_kmh, event_time, vehicle_id, fuel_change_percent')
        .eq('organization_id', organizationId)
        .not('lat', 'is', null)
        .order('event_time', { ascending: false })
        .limit(100);
      return data || [];
    },
    enabled: !!organizationId && visible,
    refetchInterval: 30000,
  });

  // Fetch vehicle plates for display
  const { data: vehiclePlates } = useQuery({
    queryKey: ['anomaly-vehicle-plates', organizationId],
    queryFn: async () => {
      if (!organizationId) return {};
      const { data } = await supabase
        .from('vehicles')
        .select('id, plate_number')
        .eq('organization_id', organizationId);
      const map: Record<string, string> = {};
      data?.forEach(v => { map[v.id] = v.plate_number; });
      return map;
    },
    enabled: !!organizationId && visible,
  });

  // Build unified anomaly list
  const anomalies: Anomaly[] = useMemo(() => {
    const results: Anomaly[] = [];

    geofenceEvents?.forEach(e => {
      const type = e.event_type === 'speed_violation' ? 'speed_violation'
        : e.event_type === 'enter' ? 'geofence_enter' : 'geofence_exit';
      const severity = e.event_type === 'speed_violation' ? 
        ((e.speed_kmh || 0) > 80 ? 'critical' : 'high') : 'low';
      
      let details = '';
      if (e.event_type === 'speed_violation') {
        details = `Speed: ${e.speed_kmh} km/h in ${e.geofence_name}`;
      } else {
        details = `${e.event_type === 'enter' ? 'Entered' : 'Exited'} ${e.geofence_name}`;
      }

      results.push({
        id: e.id,
        type,
        lat: e.lat!,
        lng: e.lng!,
        speed_kmh: e.speed_kmh,
        vehicle_id: e.vehicle_id,
        plate: vehiclePlates?.[e.vehicle_id] || e.vehicle_id.slice(0, 8),
        geofence_name: e.geofence_name,
        event_time: e.event_time,
        severity,
        details,
      });
    });

    fuelEvents?.forEach(e => {
      const type = e.event_type === 'theft' ? 'fuel_theft'
        : e.event_type === 'drain' ? 'fuel_drain' : 'fuel_refuel';
      const severity = e.event_type === 'theft' ? 'critical' 
        : e.event_type === 'drain' ? 'high' : 'low';

      results.push({
        id: e.id,
        type,
        lat: e.lat!,
        lng: e.lng!,
        speed_kmh: e.speed_kmh,
        vehicle_id: e.vehicle_id,
        plate: vehiclePlates?.[e.vehicle_id] || e.vehicle_id.slice(0, 8),
        event_time: e.event_time,
        severity,
        details: `${ANOMALY_ICONS[type]?.label || type}: ${Math.abs(e.fuel_change_percent || 0).toFixed(1)}% change`,
        fuel_change_percent: e.fuel_change_percent,
      });
    });

    return results.sort((a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime());
  }, [geofenceEvents, fuelEvents, vehiclePlates]);

  // Filtered anomalies
  const filteredAnomalies = useMemo(() => {
    if (filter === 'all') return anomalies;
    return anomalies.filter(a => a.type === filter);
  }, [anomalies, filter]);

  // Place markers on map
  useEffect(() => {
    if (!map || !visible) {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      return;
    }

    // Clear old
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Check for maplibregl
    const maplibregl = (window as any).maplibregl;
    if (!maplibregl) return;

    filteredAnomalies.forEach(anomaly => {
      const iconInfo = ANOMALY_ICONS[anomaly.type] || ANOMALY_ICONS.overspeed;
      
      // Create marker element
      const el = document.createElement('div');
      el.style.cssText = `
        width: 32px; height: 32px; cursor: pointer; position: relative;
        display: flex; align-items: center; justify-content: center;
        font-size: 18px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
        transition: transform 0.15s;
      `;
      el.textContent = iconInfo.emoji;
      el.title = `${iconInfo.label} — ${anomaly.plate}`;

      // Pulse ring for critical/high
      if (anomaly.severity === 'critical' || anomaly.severity === 'high') {
        const ring = document.createElement('div');
        ring.style.cssText = `
          position: absolute; inset: -4px; border-radius: 50%;
          border: 2px solid ${iconInfo.color}; opacity: 0.6;
          animation: anomaly-pulse 2s ease-in-out infinite;
        `;
        el.appendChild(ring);
      }

      el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.3)'; });
      el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedAnomaly(anomaly);
        map.flyTo({ center: [anomaly.lng, anomaly.lat], zoom: 15, duration: 800 });
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([anomaly.lng, anomaly.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
    };
  }, [map, visible, filteredAnomalies]);

  // Inject pulse animation CSS
  useEffect(() => {
    if (!visible) return;
    const style = document.createElement('style');
    style.id = 'anomaly-pulse-css';
    style.textContent = `
      @keyframes anomaly-pulse {
        0%, 100% { transform: scale(1); opacity: 0.6; }
        50% { transform: scale(1.6); opacity: 0; }
      }
    `;
    if (!document.getElementById('anomaly-pulse-css')) {
      document.head.appendChild(style);
    }
    return () => { document.getElementById('anomaly-pulse-css')?.remove(); };
  }, [visible]);

  if (!visible) return null;

  const counts = {
    all: anomalies.length,
    speed_violation: anomalies.filter(a => a.type === 'speed_violation').length,
    geofence_enter: anomalies.filter(a => a.type === 'geofence_enter').length,
    geofence_exit: anomalies.filter(a => a.type === 'geofence_exit').length,
    fuel_theft: anomalies.filter(a => a.type === 'fuel_theft').length,
    fuel_drain: anomalies.filter(a => a.type === 'fuel_drain').length,
    fuel_refuel: anomalies.filter(a => a.type === 'fuel_refuel').length,
  };

  return (
    <>
      {/* Filter Bar - Top Right */}
      <motion.div
        initial={{ x: 80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 80, opacity: 0 }}
        className="absolute top-14 right-[22rem] z-20"
      >
        <Card className="bg-background/95 backdrop-blur-xl border shadow-2xl p-2">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
            <span className="text-xs font-bold mr-1">Anomalies</span>
            <Badge variant="secondary" className="text-[10px] h-5">{counts.all}</Badge>
            <div className="w-px h-5 bg-border mx-1" />
            {[
              { key: 'all', label: 'All' },
              { key: 'speed_violation', label: '⚡ Speed' },
              { key: 'geofence_enter', label: '📍 Entry' },
              { key: 'geofence_exit', label: '🚪 Exit' },
              { key: 'fuel_theft', label: '🔴 Fuel' },
            ].map(f => (
              <Button
                key={f.key}
                variant={filter === f.key ? 'default' : 'ghost'}
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={() => setFilter(f.key)}
              >
                {f.label}
                {f.key !== 'all' && counts[f.key as keyof typeof counts] > 0 && (
                  <span className="ml-1 text-[9px] opacity-70">
                    {counts[f.key as keyof typeof counts]}
                  </span>
                )}
              </Button>
            ))}
            <div className="w-px h-5 bg-border mx-1" />
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px]"
              onClick={() => setShowList(!showList)}
            >
              {showList ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              List
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* Anomaly List Panel */}
      <AnimatePresence>
        {showList && (
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            className="absolute top-24 right-[22rem] z-20 w-96"
          >
            <Card className="bg-background/95 backdrop-blur-xl border shadow-2xl overflow-hidden">
              <div className="p-3 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-semibold">Event Log</span>
                </div>
                <span className="text-xs text-muted-foreground">{filteredAnomalies.length} events</span>
              </div>
              <ScrollArea className="h-72">
                {filteredAnomalies.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">
                    No anomalies detected
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredAnomalies.slice(0, 50).map(a => {
                      const icon = ANOMALY_ICONS[a.type];
                      return (
                        <button
                          key={a.id}
                          className={cn(
                            "w-full text-left p-3 hover:bg-muted/50 transition-colors",
                            selectedAnomaly?.id === a.id && "bg-primary/10"
                          )}
                          onClick={() => {
                            setSelectedAnomaly(a);
                            map?.flyTo({ center: [a.lng, a.lat], zoom: 15, duration: 800 });
                          }}
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="text-lg mt-0.5">{icon.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-semibold truncate">{icon.label}</span>
                                <Badge className={cn("text-[9px] h-4 px-1", SEVERITY_COLORS[a.severity])}>
                                  {a.severity}
                                </Badge>
                              </div>
                              <p className="text-[11px] text-muted-foreground truncate">{a.details}</p>
                              <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Truck className="w-3 h-3" />
                                  {a.plate}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDistanceToNow(new Date(a.event_time), { addSuffix: true })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Anomaly Detail Popup */}
      <AnimatePresence>
        {selectedAnomaly && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 10 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-[420px]"
          >
            <Card className="bg-background/95 backdrop-blur-xl border-2 shadow-2xl overflow-hidden"
              style={{ borderColor: ANOMALY_ICONS[selectedAnomaly.type]?.color + '40' }}
            >
              {/* Header */}
              <div className="p-4 border-b flex items-center justify-between"
                style={{ background: ANOMALY_ICONS[selectedAnomaly.type]?.color + '10' }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{ANOMALY_ICONS[selectedAnomaly.type]?.emoji}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold">{ANOMALY_ICONS[selectedAnomaly.type]?.label}</h3>
                      <Badge className={cn("text-[10px] h-5", SEVERITY_COLORS[selectedAnomaly.severity])}>
                        {selectedAnomaly.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{selectedAnomaly.details}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedAnomaly(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Details Grid */}
              <div className="p-4 grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                  <Truck className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Vehicle</span>
                    <span className="text-xs font-semibold">{selectedAnomaly.plate}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Time</span>
                    <span className="text-xs font-semibold">
                      {new Date(selectedAnomaly.event_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                {selectedAnomaly.speed_kmh != null && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <Gauge className="w-4 h-4 text-red-500" />
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Speed</span>
                      <span className="text-xs font-bold text-red-500">{selectedAnomaly.speed_kmh} km/h</span>
                    </div>
                  </div>
                )}
                {selectedAnomaly.geofence_name && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <MapPin className="w-4 h-4 text-indigo-500" />
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Zone</span>
                      <span className="text-xs font-semibold truncate block max-w-[120px]">{selectedAnomaly.geofence_name}</span>
                    </div>
                  </div>
                )}
                {selectedAnomaly.fuel_change_percent != null && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <Fuel className="w-4 h-4 text-orange-500" />
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Fuel Change</span>
                      <span className={cn("text-xs font-bold", selectedAnomaly.fuel_change_percent < 0 ? "text-red-500" : "text-emerald-500")}>
                        {selectedAnomaly.fuel_change_percent > 0 ? '+' : ''}{selectedAnomaly.fuel_change_percent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Coordinates</span>
                    <span className="text-[10px] font-mono">{selectedAnomaly.lat.toFixed(5)}, {selectedAnomaly.lng.toFixed(5)}</span>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
