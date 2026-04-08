import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Gauge } from 'lucide-react';

interface SpeedCorridorOverlayProps {
  map: maplibregl.Map | null;
  vehicles: Array<{
    id: string;
    plate: string;
    lat: number;
    lng: number;
    speed: number;
    speedLimit?: number;
    status: string;
  }>;
  visible: boolean;
  onClose: () => void;
}

const SPEED_SOURCE = 'speed-corridor-source';
const SPEED_LAYER = 'speed-corridor-layer';
const SPEED_LABEL_LAYER = 'speed-label-layer';

export const SpeedCorridorOverlay = ({ map, vehicles, visible, onClose }: SpeedCorridorOverlayProps) => {
  const layerAdded = useRef(false);
  const [violators, setViolators] = useState<Array<{ plate: string; speed: number; limit: number; excess: number }>>([]);

  useEffect(() => {
    if (!map || !visible) {
      if (map && layerAdded.current) {
        try {
          if (map.getLayer(SPEED_LABEL_LAYER)) map.removeLayer(SPEED_LABEL_LAYER);
          if (map.getLayer(SPEED_LAYER)) map.removeLayer(SPEED_LAYER);
          if (map.getSource(SPEED_SOURCE)) map.removeSource(SPEED_SOURCE);
        } catch {}
        layerAdded.current = false;
      }
      return;
    }

    const movingVehicles = vehicles.filter(v => v.status !== 'offline' && v.speed > 0);

    // Detect speed violators
    const speedViolators = movingVehicles
      .filter(v => v.speedLimit && v.speed > v.speedLimit)
      .map(v => ({ plate: v.plate, speed: v.speed, limit: v.speedLimit!, excess: v.speed - v.speedLimit! }))
      .sort((a, b) => b.excess - a.excess);
    setViolators(speedViolators);

    // Create speed zone features
    const features: GeoJSON.Feature[] = movingVehicles.map(v => {
      const isViolating = v.speedLimit && v.speed > v.speedLimit;
      const speedRatio = v.speedLimit ? v.speed / v.speedLimit : v.speed / 120;
      
      return {
        type: 'Feature',
        properties: {
          speed: v.speed,
          limit: v.speedLimit || 0,
          plate: v.plate,
          violating: isViolating ? 1 : 0,
          ratio: Math.min(speedRatio, 2),
        },
        geometry: { type: 'Point', coordinates: [v.lng, v.lat] },
      };
    });

    const geojson: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features };

    const addLayers = () => {
      if (!map.isStyleLoaded()) return;
      try {
        if (map.getLayer(SPEED_LABEL_LAYER)) map.removeLayer(SPEED_LABEL_LAYER);
        if (map.getLayer(SPEED_LAYER)) map.removeLayer(SPEED_LAYER);
        if (map.getSource(SPEED_SOURCE)) map.removeSource(SPEED_SOURCE);
      } catch {}

      map.addSource(SPEED_SOURCE, { type: 'geojson', data: geojson });

      map.addLayer({
        id: SPEED_LAYER,
        type: 'circle',
        source: SPEED_SOURCE,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 6, 15, 20],
          'circle-color': [
            'case',
            ['==', ['get', 'violating'], 1],
            '#ef4444',
            ['interpolate', ['linear'], ['get', 'ratio'],
              0, '#22c55e',
              0.5, '#eab308',
              0.8, '#f97316',
              1, '#ef4444',
            ],
          ],
          'circle-opacity': 0.7,
          'circle-stroke-width': 2,
          'circle-stroke-color': [
            'case',
            ['==', ['get', 'violating'], 1],
            '#dc2626',
            '#ffffff',
          ],
        },
      });

      map.addLayer({
        id: SPEED_LABEL_LAYER,
        type: 'symbol',
        source: SPEED_SOURCE,
        minzoom: 12,
        layout: {
          'text-field': ['concat', ['to-string', ['get', 'speed']], ' km/h'],
          'text-size': 10,
          'text-offset': [0, -2],
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': ['case', ['==', ['get', 'violating'], 1], '#dc2626', '#374151'],
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5,
        },
      });

      layerAdded.current = true;
    };

    if (map.isStyleLoaded()) addLayers();
    else map.once('style.load', addLayers);

    return () => {
      if (map && layerAdded.current) {
        try {
          if (map.getLayer(SPEED_LABEL_LAYER)) map.removeLayer(SPEED_LABEL_LAYER);
          if (map.getLayer(SPEED_LAYER)) map.removeLayer(SPEED_LAYER);
          if (map.getSource(SPEED_SOURCE)) map.removeSource(SPEED_SOURCE);
        } catch {}
        layerAdded.current = false;
      }
    };
  }, [map, visible, vehicles]);

  // Live data update
  useEffect(() => {
    if (!map || !visible || !layerAdded.current) return;
    const movingVehicles = vehicles.filter(v => v.status !== 'offline' && v.speed > 0);
    const features: GeoJSON.Feature[] = movingVehicles.map(v => ({
      type: 'Feature',
      properties: {
        speed: v.speed,
        limit: v.speedLimit || 0,
        plate: v.plate,
        violating: v.speedLimit && v.speed > v.speedLimit ? 1 : 0,
        ratio: Math.min(v.speedLimit ? v.speed / v.speedLimit : v.speed / 120, 2),
      },
      geometry: { type: 'Point', coordinates: [v.lng, v.lat] },
    }));
    try {
      const source = map.getSource(SPEED_SOURCE) as maplibregl.GeoJSONSource;
      if (source) source.setData({ type: 'FeatureCollection', features });
    } catch {}
  }, [vehicles]);

  if (!visible) return null;

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 bg-background/95 backdrop-blur-md rounded-xl border shadow-xl p-3">
      <div className="flex items-center gap-3">
        <Gauge className="w-4 h-4 text-orange-500 shrink-0" />
        <span className="text-xs font-semibold">Speed Corridors</span>

        {/* Legend */}
        <div className="flex items-center gap-1.5">
          <div className="flex h-3 w-16 rounded-sm overflow-hidden">
            <div className="flex-1" style={{ background: '#22c55e' }} />
            <div className="flex-1" style={{ background: '#eab308' }} />
            <div className="flex-1" style={{ background: '#f97316' }} />
            <div className="flex-1" style={{ background: '#ef4444' }} />
          </div>
          <span className="text-[10px] text-muted-foreground">Speed</span>
        </div>

        {violators.length > 0 && (
          <Badge variant="destructive" className="text-[10px] h-5">
            {violators.length} violating
          </Badge>
        )}

        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      {violators.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5 max-w-md">
          {violators.slice(0, 5).map((v, i) => (
            <Badge key={i} variant="outline" className="text-[10px] text-red-600 border-red-200 bg-red-50">
              {v.plate}: {v.speed}/{v.limit} (+{v.excess})
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default SpeedCorridorOverlay;
