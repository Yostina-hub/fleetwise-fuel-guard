import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { X, Shield, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

interface Geofence {
  id: string;
  name: string;
  geometry_type: string;
  polygon_points: any;
  center_lat: number | null;
  center_lng: number | null;
  radius_meters: number | null;
  color: string | null;
  is_active: boolean;
}

interface GeofenceViolation {
  vehiclePlate: string;
  geofenceName: string;
  type: 'entry' | 'exit';
  time: Date;
}

interface GeofenceLiveVisualizerProps {
  map: maplibregl.Map | null;
  vehicles: Array<{ id: string; plate: string; lat: number; lng: number; status: string }>;
  visible: boolean;
  onClose: () => void;
}

const SOURCE_PREFIX = 'geofence-viz-';
const FILL_LAYER_PREFIX = 'geofence-fill-';
const LINE_LAYER_PREFIX = 'geofence-line-';
const LABEL_SOURCE_ID = 'geofence-viz-labels';
const LABEL_LAYER_ID = 'geofence-viz-label-layer';

export const GeofenceLiveVisualizer = ({ map, vehicles, visible, onClose }: GeofenceLiveVisualizerProps) => {
  const { organizationId } = useOrganization();
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [violations, setViolations] = useState<GeofenceViolation[]>([]);
  const [showLabels, setShowLabels] = useState(true);
  const layersAdded = useRef<Set<string>>(new Set());
  const prevVehiclePositions = useRef<Record<string, { inside: Set<string> }>>({});

  // Fetch geofences
  useEffect(() => {
    if (!organizationId || !visible) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('geofences')
        .select('id, name, geometry_type, polygon_points, center_lat, center_lng, radius_meters, color, is_active')
        .eq('organization_id', organizationId)
        .eq('is_active', true);
      if (data) setGeofences(data as unknown as Geofence[]);
    };
    fetch();
  }, [organizationId, visible]);

  // Point-in-polygon check (simple ray casting for polygons)
  const isPointInPolygon = useCallback((lat: number, lng: number, coords: number[][]) => {
    let inside = false;
    for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
      const xi = coords[i][1], yi = coords[i][0];
      const xj = coords[j][1], yj = coords[j][0];
      const intersect = yi > lng !== yj > lng && lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }, []);

  // Point-in-circle check
  const isPointInCircle = useCallback((lat: number, lng: number, centerLat: number, centerLng: number, radiusKm: number) => {
    const R = 6371;
    const dLat = ((lat - centerLat) * Math.PI) / 180;
    const dLng = ((lng - centerLng) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((centerLat * Math.PI) / 180) * Math.cos((lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return dist <= radiusKm;
  }, []);

  // Check vehicle-geofence violations
  useEffect(() => {
    if (!visible || geofences.length === 0 || vehicles.length === 0) return;

    const newViolations: GeofenceViolation[] = [];

    vehicles.forEach(v => {
      if (v.status === 'offline') return;
      const prev = prevVehiclePositions.current[v.id] || { inside: new Set<string>() };
      const currentInside = new Set<string>();

      geofences.forEach(gf => {
        let inside = false;
        try {
          if (gf.geometry_type === 'polygon' && gf.polygon_points) {
            const points = typeof gf.polygon_points === 'string' ? JSON.parse(gf.polygon_points) : gf.polygon_points;
            if (Array.isArray(points)) inside = isPointInPolygon(v.lat, v.lng, points);
          } else if (gf.geometry_type === 'circle' && gf.center_lat && gf.center_lng) {
            inside = isPointInCircle(v.lat, v.lng, gf.center_lat, gf.center_lng, (gf.radius_meters || 500) / 1000);
          }
        } catch {}

        if (inside) currentInside.add(gf.id);

        // Detect transitions
        if (inside && !prev.inside.has(gf.id)) {
          newViolations.push({ vehiclePlate: v.plate, geofenceName: gf.name, type: 'entry', time: new Date() });
        } else if (!inside && prev.inside.has(gf.id)) {
          newViolations.push({ vehiclePlate: v.plate, geofenceName: gf.name, type: 'exit', time: new Date() });
        }
      });

      prevVehiclePositions.current[v.id] = { inside: currentInside };
    });

    if (newViolations.length > 0) {
      setViolations(prev => [...newViolations, ...prev].slice(0, 20));
    }
  }, [vehicles, geofences, visible, isPointInPolygon, isPointInCircle]);

  // Render geofence layers on map
  useEffect(() => {
    if (!map || !visible || geofences.length === 0) return;

    const addLayers = () => {
      if (!map.isStyleLoaded()) return;

      geofences.forEach(gf => {
        const sourceId = SOURCE_PREFIX + gf.id;
        const fillId = FILL_LAYER_PREFIX + gf.id;
        const lineId = LINE_LAYER_PREFIX + gf.id;
        const color = gf.color || '#3b82f6';

        try {
          if (map.getLayer(fillId)) map.removeLayer(fillId);
          if (map.getLayer(lineId)) map.removeLayer(lineId);
          if (map.getSource(sourceId)) map.removeSource(sourceId);
        } catch {}

        try {
          let geojson: GeoJSON.Feature | null = null;

          if (gf.geometry_type === 'polygon' && gf.polygon_points) {
            const points = typeof gf.polygon_points === 'string' ? JSON.parse(gf.polygon_points) : gf.polygon_points;
            if (Array.isArray(points)) {
              const coords = points.map((p: any) => [Number(p[0] ?? p.lng), Number(p[1] ?? p.lat)]);
              geojson = { type: 'Feature', properties: { name: gf.name }, geometry: { type: 'Polygon', coordinates: [coords] } };
            }
          } else if (gf.geometry_type === 'circle' && gf.center_lat != null && gf.center_lng != null) {
            // Postgres numeric arrives as strings via PostgREST — coerce before arithmetic
            const centerLat = Number(gf.center_lat);
            const centerLng = Number(gf.center_lng);
            const radiusM = Number(gf.radius_meters) || 500;
            if (!Number.isFinite(centerLat) || !Number.isFinite(centerLng)) return;
            const pts = 64;
            const coords: number[][] = [];
            for (let i = 0; i <= pts; i++) {
              const angle = (i / pts) * 2 * Math.PI;
              const dx = radiusM * Math.cos(angle); // east-west, meters
              const dy = radiusM * Math.sin(angle); // north-south, meters
              const lat = centerLat + dy / 111320;
              const lng = centerLng + dx / (111320 * Math.cos((centerLat * Math.PI) / 180));
              coords.push([lng, lat]);
            }
            geojson = { type: 'Feature', properties: { name: gf.name }, geometry: { type: 'Polygon', coordinates: [coords] } };
          }

          if (!geojson) return;

          map.addSource(sourceId, { type: 'geojson', data: { type: 'FeatureCollection', features: [geojson] } });
          map.addLayer({ id: fillId, type: 'fill', source: sourceId, paint: { 'fill-color': color, 'fill-opacity': 0.15 } });
          map.addLayer({ id: lineId, type: 'line', source: sourceId, paint: { 'line-color': color, 'line-width': 2, 'line-dasharray': [3, 2] } });
          layersAdded.current.add(gf.id);
        } catch {}
      });
    };

    if (map.isStyleLoaded()) addLayers();
    else map.once('style.load', addLayers);

    return () => {
      geofences.forEach(gf => {
        try {
          if (map.getLayer(FILL_LAYER_PREFIX + gf.id)) map.removeLayer(FILL_LAYER_PREFIX + gf.id);
          if (map.getLayer(LINE_LAYER_PREFIX + gf.id)) map.removeLayer(LINE_LAYER_PREFIX + gf.id);
          if (map.getSource(SOURCE_PREFIX + gf.id)) map.removeSource(SOURCE_PREFIX + gf.id);
        } catch {}
      });
      layersAdded.current.clear();
    };
  }, [map, visible, geofences]);

  if (!visible) return null;

  return (
    <div className="absolute top-20 right-4 z-20 bg-background/95 backdrop-blur-md rounded-xl border shadow-xl p-4 w-72 max-h-96 overflow-auto">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-semibold">Geofence Monitor</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground">Active zones: {geofences.length}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">Labels</span>
          <Switch checked={showLabels} onCheckedChange={setShowLabels} className="scale-75" />
        </div>
      </div>

      {violations.length > 0 && (
        <div className="space-y-1.5 border-t pt-2">
          <span className="text-xs font-medium flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-warning" />
            Recent Events
          </span>
          {violations.slice(0, 8).map((v, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px] p-1.5 rounded bg-muted/50">
              <Badge variant={v.type === 'entry' ? 'default' : 'secondary'} className="text-[9px] h-4 px-1">
                {v.type === 'entry' ? 'IN' : 'OUT'}
              </Badge>
              <span className="font-medium">{v.vehiclePlate}</span>
              <span className="text-muted-foreground truncate">{v.geofenceName}</span>
            </div>
          ))}
        </div>
      )}

      {geofences.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">No active geofences found</p>
      )}
    </div>
  );
};

export default GeofenceLiveVisualizer;
