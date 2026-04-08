import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Users, X, AlertTriangle, Link2 } from 'lucide-react';
import { toast } from 'sonner';

interface ConvoyVehicle {
  id: string;
  plate: string;
  lat: number;
  lng: number;
  speed: number;
  status: 'moving' | 'idle' | 'stopped' | 'offline';
  heading?: number;
}

interface ConvoyGroup {
  id: string;
  vehicleIds: string[];
  centroid: { lat: number; lng: number };
  avgSpeed: number;
  maxSpread: number; // max distance between any two vehicles in meters
  isTight: boolean;
}

interface ConvoyModeProps {
  map: maplibregl.Map | null;
  vehicles: ConvoyVehicle[];
  visible: boolean;
  onClose: () => void;
  selectedVehicleIds?: string[];
  onConvoyAlert?: (alert: { type: string; message: string; vehicles: string[] }) => void;
}

const CONVOY_LINE_SOURCE = 'convoy-lines';
const CONVOY_LINE_LAYER = 'convoy-line-layer';
const CONVOY_CIRCLE_SOURCE = 'convoy-circles';
const CONVOY_CIRCLE_LAYER = 'convoy-circle-layer';

// Haversine distance in meters
const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const ConvoyMode = ({ map, vehicles, visible, onClose, selectedVehicleIds, onConvoyAlert }: ConvoyModeProps) => {
  const [proximityRadius, setProximityRadius] = useState(500); // meters
  const [convoyGroups, setConvoyGroups] = useState<ConvoyGroup[]>([]);
  const layerAdded = useRef(false);
  const prevAlerts = useRef<Set<string>>(new Set());

  // Detect convoy groups using proximity clustering
  const detectConvoys = useCallback(() => {
    const movingVehicles = vehicles.filter(v => v.status === 'moving' || v.status === 'idle');
    
    // If specific vehicles selected, only consider those
    const candidates = selectedVehicleIds?.length
      ? movingVehicles.filter(v => selectedVehicleIds.includes(v.id))
      : movingVehicles;

    if (candidates.length < 2) {
      setConvoyGroups([]);
      return;
    }

    // Simple proximity-based clustering
    const visited = new Set<string>();
    const groups: ConvoyGroup[] = [];

    candidates.forEach(vehicle => {
      if (visited.has(vehicle.id)) return;

      const group: ConvoyVehicle[] = [vehicle];
      visited.add(vehicle.id);

      // Find all vehicles within radius (BFS)
      const queue = [vehicle];
      while (queue.length > 0) {
        const current = queue.shift()!;
        candidates.forEach(other => {
          if (visited.has(other.id)) return;
          const dist = haversineDistance(current.lat, current.lng, other.lat, other.lng);
          if (dist <= proximityRadius) {
            visited.add(other.id);
            group.push(other);
            queue.push(other);
          }
        });
      }

      if (group.length >= 2) {
        // Calculate group metrics
        const centroidLat = group.reduce((s, v) => s + v.lat, 0) / group.length;
        const centroidLng = group.reduce((s, v) => s + v.lng, 0) / group.length;
        const avgSpeed = group.reduce((s, v) => s + v.speed, 0) / group.length;

        // Max spread
        let maxSpread = 0;
        for (let i = 0; i < group.length; i++) {
          for (let j = i + 1; j < group.length; j++) {
            const d = haversineDistance(group[i].lat, group[i].lng, group[j].lat, group[j].lng);
            if (d > maxSpread) maxSpread = d;
          }
        }

        groups.push({
          id: group.map(v => v.id).sort().join('-').slice(0, 20),
          vehicleIds: group.map(v => v.id),
          centroid: { lat: centroidLat, lng: centroidLng },
          avgSpeed,
          maxSpread,
          isTight: maxSpread < proximityRadius * 0.5,
        });
      }
    });

    setConvoyGroups(groups);

    // Check for dispersion alerts
    groups.forEach(group => {
      const alertKey = `disperse-${group.id}`;
      if (group.maxSpread > proximityRadius * 0.8 && !prevAlerts.current.has(alertKey)) {
        prevAlerts.current.add(alertKey);
        const plates = group.vehicleIds
          .map(id => vehicles.find(v => v.id === id)?.plate)
          .filter(Boolean)
          .join(', ');
        toast.warning(`Convoy dispersing: ${plates}`, {
          description: `Max spread: ${Math.round(group.maxSpread)}m (limit: ${proximityRadius}m)`,
        });
        onConvoyAlert?.({
          type: 'dispersion',
          message: `Convoy spreading beyond ${proximityRadius}m radius`,
          vehicles: group.vehicleIds,
        });
      } else if (group.maxSpread <= proximityRadius * 0.5) {
        prevAlerts.current.delete(`disperse-${group.id}`);
      }
    });
  }, [vehicles, proximityRadius, selectedVehicleIds, onConvoyAlert]);

  useEffect(() => {
    if (!visible) return;
    detectConvoys();
  }, [visible, detectConvoys]);

  // Draw convoy visualizations on map
  useEffect(() => {
    if (!map || !visible) {
      if (map && layerAdded.current) {
        try {
          if (map.getLayer(CONVOY_LINE_LAYER)) map.removeLayer(CONVOY_LINE_LAYER);
          if (map.getSource(CONVOY_LINE_SOURCE)) map.removeSource(CONVOY_LINE_SOURCE);
          if (map.getLayer(CONVOY_CIRCLE_LAYER)) map.removeLayer(CONVOY_CIRCLE_LAYER);
          if (map.getSource(CONVOY_CIRCLE_SOURCE)) map.removeSource(CONVOY_CIRCLE_SOURCE);
        } catch {}
        layerAdded.current = false;
      }
      return;
    }

    if (!map.isStyleLoaded()) return;

    // Build line features connecting convoy members
    const lineFeatures: GeoJSON.Feature[] = [];
    const circleFeatures: GeoJSON.Feature[] = [];

    convoyGroups.forEach((group, idx) => {
      const color = group.isTight ? '#22c55e' : group.maxSpread > proximityRadius * 0.8 ? '#ef4444' : '#f59e0b';
      
      // Lines between all pairs
      const gVehicles = group.vehicleIds.map(id => vehicles.find(v => v.id === id)).filter(Boolean);
      for (let i = 0; i < gVehicles.length; i++) {
        for (let j = i + 1; j < gVehicles.length; j++) {
          lineFeatures.push({
            type: 'Feature',
            properties: { color, groupId: idx },
            geometry: {
              type: 'LineString',
              coordinates: [
                [gVehicles[i]!.lng, gVehicles[i]!.lat],
                [gVehicles[j]!.lng, gVehicles[j]!.lat],
              ],
            },
          });
        }
      }

      // Centroid circle
      circleFeatures.push({
        type: 'Feature',
        properties: { color, count: group.vehicleIds.length, spread: Math.round(group.maxSpread) },
        geometry: { type: 'Point', coordinates: [group.centroid.lng, group.centroid.lat] },
      });
    });

    const addLayers = () => {
      try {
        if (map.getLayer(CONVOY_LINE_LAYER)) map.removeLayer(CONVOY_LINE_LAYER);
        if (map.getSource(CONVOY_LINE_SOURCE)) map.removeSource(CONVOY_LINE_SOURCE);
        if (map.getLayer(CONVOY_CIRCLE_LAYER)) map.removeLayer(CONVOY_CIRCLE_LAYER);
        if (map.getSource(CONVOY_CIRCLE_SOURCE)) map.removeSource(CONVOY_CIRCLE_SOURCE);
      } catch {}

      map.addSource(CONVOY_LINE_SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: lineFeatures },
      });

      map.addLayer({
        id: CONVOY_LINE_LAYER,
        type: 'line',
        source: CONVOY_LINE_SOURCE,
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 2,
          'line-dasharray': [4, 3],
          'line-opacity': 0.7,
        },
      });

      map.addSource(CONVOY_CIRCLE_SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: circleFeatures },
      });

      map.addLayer({
        id: CONVOY_CIRCLE_LAYER,
        type: 'circle',
        source: CONVOY_CIRCLE_SOURCE,
        paint: {
          'circle-radius': 12,
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.3,
          'circle-stroke-width': 2,
          'circle-stroke-color': ['get', 'color'],
        },
      });

      layerAdded.current = true;
    };

    if (map.isStyleLoaded()) {
      addLayers();
    } else {
      map.once('style.load', addLayers);
    }

    return () => {
      if (map && layerAdded.current) {
        try {
          if (map.getLayer(CONVOY_LINE_LAYER)) map.removeLayer(CONVOY_LINE_LAYER);
          if (map.getSource(CONVOY_LINE_SOURCE)) map.removeSource(CONVOY_LINE_SOURCE);
          if (map.getLayer(CONVOY_CIRCLE_LAYER)) map.removeLayer(CONVOY_CIRCLE_LAYER);
          if (map.getSource(CONVOY_CIRCLE_SOURCE)) map.removeSource(CONVOY_CIRCLE_SOURCE);
        } catch {}
        layerAdded.current = false;
      }
    };
  }, [map, visible, convoyGroups, vehicles, proximityRadius]);

  if (!visible) return null;

  return (
    <div className="absolute top-20 right-4 z-20 bg-background/95 backdrop-blur-md rounded-xl border shadow-xl p-4 w-72">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-semibold">Convoy Mode</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Proximity radius control */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground">Proximity Radius</span>
          <span className="text-xs font-medium">{proximityRadius}m</span>
        </div>
        <Slider
          value={[proximityRadius]}
          onValueChange={([v]) => setProximityRadius(v)}
          min={100}
          max={2000}
          step={50}
        />
      </div>

      {/* Convoy groups */}
      <div className="space-y-2 max-h-60 overflow-auto">
        {convoyGroups.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4">
            No convoys detected within {proximityRadius}m
          </div>
        ) : (
          convoyGroups.map((group, idx) => (
            <div
              key={group.id}
              className="p-2.5 rounded-lg border bg-muted/30 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Link2 className="w-3 h-3 text-blue-500" />
                  <span className="text-xs font-medium">Group {idx + 1}</span>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1">
                    {group.vehicleIds.length} vehicles
                  </Badge>
                </div>
                {group.maxSpread > proximityRadius * 0.8 && (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                )}
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span>Avg: {Math.round(group.avgSpeed)} km/h</span>
                <span>Spread: {Math.round(group.maxSpread)}m</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {group.vehicleIds.map(id => {
                  const v = vehicles.find(veh => veh.id === id);
                  return v ? (
                    <Badge key={id} variant="outline" className="text-[10px] h-4 px-1.5">
                      {v.plate}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-3 text-[10px] text-muted-foreground text-center">
        Monitoring {vehicles.filter(v => v.status !== 'offline').length} active vehicles
      </div>
    </div>
  );
};

export default ConvoyMode;
