import { useState, useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, GitCompare, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

interface RouteReplayComparisonProps {
  map: maplibregl.Map | null;
  visible: boolean;
  onClose: () => void;
  vehicles: Array<{ id: string; plate: string }>;
}

const ACTUAL_SOURCE = 'route-actual-source';
const ACTUAL_LAYER = 'route-actual-layer';
const OPTIMAL_SOURCE = 'route-optimal-source';
const OPTIMAL_LAYER = 'route-optimal-layer';

export const RouteReplayComparison = ({ map, visible, onClose, vehicles }: RouteReplayComparisonProps) => {
  const { organizationId } = useOrganization();
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [loading, setLoading] = useState(false);
  const [routeStats, setRouteStats] = useState<{ actualKm: number; optimalKm: number; deviation: number } | null>(null);
  const layerAdded = useRef(false);

  const cleanupLayers = useCallback(() => {
    if (!map) return;
    try {
      if (map.getLayer(ACTUAL_LAYER)) map.removeLayer(ACTUAL_LAYER);
      if (map.getLayer(OPTIMAL_LAYER)) map.removeLayer(OPTIMAL_LAYER);
      if (map.getSource(ACTUAL_SOURCE)) map.removeSource(ACTUAL_SOURCE);
      if (map.getSource(OPTIMAL_SOURCE)) map.removeSource(OPTIMAL_SOURCE);
    } catch {}
    layerAdded.current = false;
  }, [map]);

  // Cleanup on unmount or hide
  useEffect(() => {
    if (!visible) cleanupLayers();
    return () => cleanupLayers();
  }, [visible, cleanupLayers]);

  const loadRoute = useCallback(async () => {
    if (!selectedVehicle || !organizationId || !map) return;
    setLoading(true);
    cleanupLayers();

    try {
      // Fetch today's telemetry history for the vehicle
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Use vehicle_telemetry for route data
      const { data, error } = await supabase
        .from('vehicle_telemetry')
        .select('latitude, longitude, last_communication_at')
        .eq('vehicle_id', selectedVehicle)
        .eq('organization_id', organizationId)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('last_communication_at', { ascending: true })
        .limit(2000);

      if (error) throw error;

      const coords: [number, number][] = [];
      (data || []).forEach((row: any) => {
        if (row.latitude && row.longitude) {
          coords.push([row.longitude, row.latitude]);
        }
      });

      if (coords.length < 2) {
        setRouteStats(null);
        setLoading(false);
        return;
      }

      // Calculate actual distance
      let actualKm = 0;
      for (let i = 1; i < coords.length; i++) {
        const R = 6371;
        const dLat = ((coords[i][1] - coords[i - 1][1]) * Math.PI) / 180;
        const dLng = ((coords[i][0] - coords[i - 1][0]) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos((coords[i - 1][1] * Math.PI) / 180) * Math.cos((coords[i][1] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
        actualKm += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      }

      // Optimal = straight line distance * 1.2
      const startEnd = coords.length > 1 ? (() => {
        const R = 6371;
        const dLat = ((coords[coords.length - 1][1] - coords[0][1]) * Math.PI) / 180;
        const dLng = ((coords[coords.length - 1][0] - coords[0][0]) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos((coords[0][1] * Math.PI) / 180) * Math.cos((coords[coords.length - 1][1] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      })() : 0;
      const optimalKm = startEnd * 1.2;

      setRouteStats({
        actualKm: Math.round(actualKm * 10) / 10,
        optimalKm: Math.round(optimalKm * 10) / 10,
        deviation: optimalKm > 0 ? Math.round(((actualKm - optimalKm) / optimalKm) * 100) : 0,
      });

      // Draw actual route
      if (!map.isStyleLoaded()) {
        setLoading(false);
        return;
      }

      map.addSource(ACTUAL_SOURCE, {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } },
      });
      map.addLayer({
        id: ACTUAL_LAYER,
        type: 'line',
        source: ACTUAL_SOURCE,
        paint: { 'line-color': '#3b82f6', 'line-width': 3, 'line-opacity': 0.8 },
      });

      // Draw optimal (straight line) route
      map.addSource(OPTIMAL_SOURCE, {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [coords[0], coords[coords.length - 1]] } },
      });
      map.addLayer({
        id: OPTIMAL_LAYER,
        type: 'line',
        source: OPTIMAL_SOURCE,
        paint: { 'line-color': '#22c55e', 'line-width': 2, 'line-dasharray': [4, 3], 'line-opacity': 0.7 },
      });

      layerAdded.current = true;

      // Fit map to route
      const bounds = coords.reduce(
        (b, c) => b.extend(c as [number, number]),
        new maplibregl.LngLatBounds(coords[0], coords[0])
      );
      map.fitBounds(bounds, { padding: 60 });
    } catch (err) {
      console.error('Route load error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedVehicle, organizationId, map, cleanupLayers]);

  if (!visible) return null;

  return (
    <div className="absolute top-20 right-4 z-20 bg-background/95 backdrop-blur-md rounded-xl border shadow-xl p-4 w-72">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-semibold">Route Comparison</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
        <SelectTrigger className="h-8 text-xs mb-2">
          <SelectValue placeholder="Select vehicle" />
        </SelectTrigger>
        <SelectContent>
          {vehicles.map(v => (
            <SelectItem key={v.id} value={v.id}>{v.plate}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button className="w-full h-8 text-xs mb-3" onClick={loadRoute} disabled={loading || !selectedVehicle}>
        {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <GitCompare className="w-3.5 h-3.5 mr-1.5" />}
        Compare Today's Route
      </Button>

      {/* Legend */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-2">
        <div className="flex items-center gap-1"><div className="w-4 h-0.5 bg-blue-500 rounded" /> Actual</div>
        <div className="flex items-center gap-1"><div className="w-4 h-0.5 bg-green-500 rounded border-dashed" /> Optimal</div>
      </div>

      {routeStats && (
        <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center p-1.5 bg-background rounded">
              <div className="text-sm font-bold text-blue-600">{routeStats.actualKm} km</div>
              <div className="text-[10px] text-muted-foreground">Actual</div>
            </div>
            <div className="text-center p-1.5 bg-background rounded">
              <div className="text-sm font-bold text-green-600">{routeStats.optimalKm} km</div>
              <div className="text-[10px] text-muted-foreground">Optimal</div>
            </div>
          </div>
          <div className="text-center">
            <Badge variant={routeStats.deviation > 50 ? 'destructive' : routeStats.deviation > 20 ? 'secondary' : 'default'} className="text-[10px]">
              {routeStats.deviation > 0 ? '+' : ''}{routeStats.deviation}% deviation
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteReplayComparison;
