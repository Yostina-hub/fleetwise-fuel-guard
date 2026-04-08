import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Flame, X } from 'lucide-react';

interface HeatmapPoint {
  lat: number;
  lng: number;
  weight: number;
}

type HeatmapMode = 'density' | 'speed' | 'idle';

interface HeatmapOverlayProps {
  map: maplibregl.Map | null;
  vehicles: Array<{
    id: string;
    lat: number;
    lng: number;
    speed: number;
    status: 'moving' | 'idle' | 'stopped' | 'offline';
    engine_on?: boolean;
  }>;
  visible: boolean;
  onClose: () => void;
}

const HEATMAP_SOURCE = 'heatmap-source';
const HEATMAP_LAYER = 'heatmap-layer';
const HEATMAP_POINT_LAYER = 'heatmap-point-layer';

const modeConfig: Record<HeatmapMode, { label: string; description: string; colorStops: [number, string][] }> = {
  density: {
    label: 'Vehicle Density',
    description: 'Concentration of vehicles',
    colorStops: [
      [0, 'rgba(33,102,172,0)'],
      [0.2, 'rgb(103,169,207)'],
      [0.4, 'rgb(209,229,240)'],
      [0.6, 'rgb(253,219,199)'],
      [0.8, 'rgb(239,138,98)'],
      [1, 'rgb(178,24,43)'],
    ],
  },
  speed: {
    label: 'Speed Zones',
    description: 'High-speed areas',
    colorStops: [
      [0, 'rgba(0,128,0,0)'],
      [0.2, 'rgb(144,238,144)'],
      [0.4, 'rgb(255,255,0)'],
      [0.6, 'rgb(255,165,0)'],
      [0.8, 'rgb(255,69,0)'],
      [1, 'rgb(220,20,60)'],
    ],
  },
  idle: {
    label: 'Idle Hotspots',
    description: 'Where vehicles idle most',
    colorStops: [
      [0, 'rgba(255,193,7,0)'],
      [0.2, 'rgb(255,235,59)'],
      [0.4, 'rgb(255,193,7)'],
      [0.6, 'rgb(255,152,0)'],
      [0.8, 'rgb(255,87,34)'],
      [1, 'rgb(244,67,54)'],
    ],
  },
};

export const HeatmapOverlay = ({ map, vehicles, visible, onClose }: HeatmapOverlayProps) => {
  const [mode, setMode] = useState<HeatmapMode>('density');
  const layerAdded = useRef(false);

  const getHeatmapPoints = useCallback((): HeatmapPoint[] => {
    return vehicles
      .filter(v => v.status !== 'offline')
      .map(v => {
        let weight = 1;
        if (mode === 'speed') {
          weight = Math.min(v.speed / 120, 1);
        } else if (mode === 'idle') {
          weight = v.status === 'idle' ? 1 : v.status === 'stopped' && v.engine_on ? 0.7 : 0;
        }
        return { lat: v.lat, lng: v.lng, weight };
      })
      .filter(p => p.weight > 0);
  }, [vehicles, mode]);

  useEffect(() => {
    if (!map || !visible) {
      // Cleanup
      if (map && layerAdded.current) {
        try {
          if (map.getLayer(HEATMAP_POINT_LAYER)) map.removeLayer(HEATMAP_POINT_LAYER);
          if (map.getLayer(HEATMAP_LAYER)) map.removeLayer(HEATMAP_LAYER);
          if (map.getSource(HEATMAP_SOURCE)) map.removeSource(HEATMAP_SOURCE);
        } catch {}
        layerAdded.current = false;
      }
      return;
    }

    const points = getHeatmapPoints();
    const config = modeConfig[mode];

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: points.map(p => ({
        type: 'Feature',
        properties: { weight: p.weight },
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      })),
    };

    const addLayers = () => {
      if (!map.isStyleLoaded()) return;

      try {
        if (map.getLayer(HEATMAP_POINT_LAYER)) map.removeLayer(HEATMAP_POINT_LAYER);
        if (map.getLayer(HEATMAP_LAYER)) map.removeLayer(HEATMAP_LAYER);
        if (map.getSource(HEATMAP_SOURCE)) map.removeSource(HEATMAP_SOURCE);
      } catch {}

      map.addSource(HEATMAP_SOURCE, { type: 'geojson', data: geojson });

      // Build heatmap-color expression from config
      const colorExpr: any[] = ['interpolate', ['linear'], ['heatmap-density']];
      config.colorStops.forEach(([stop, color]) => {
        colorExpr.push(stop, color);
      });

      map.addLayer({
        id: HEATMAP_LAYER,
        type: 'heatmap',
        source: HEATMAP_SOURCE,
        paint: {
          'heatmap-weight': ['get', 'weight'],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
          'heatmap-color': colorExpr as any,
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 15, 15, 30],
          'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.8, 15, 0.5],
        },
      });

      // Add point layer visible at higher zoom
      map.addLayer({
        id: HEATMAP_POINT_LAYER,
        type: 'circle',
        source: HEATMAP_SOURCE,
        minzoom: 14,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 14, 4, 18, 10],
          'circle-color': config.colorStops[4][1],
          'circle-opacity': 0.6,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#fff',
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
          if (map.getLayer(HEATMAP_POINT_LAYER)) map.removeLayer(HEATMAP_POINT_LAYER);
          if (map.getLayer(HEATMAP_LAYER)) map.removeLayer(HEATMAP_LAYER);
          if (map.getSource(HEATMAP_SOURCE)) map.removeSource(HEATMAP_SOURCE);
        } catch {}
        layerAdded.current = false;
      }
    };
  }, [map, visible, mode, getHeatmapPoints]);

  // Update data without removing layers
  useEffect(() => {
    if (!map || !visible || !layerAdded.current) return;
    
    const points = getHeatmapPoints();
    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: points.map(p => ({
        type: 'Feature',
        properties: { weight: p.weight },
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      })),
    };

    try {
      const source = map.getSource(HEATMAP_SOURCE) as maplibregl.GeoJSONSource;
      if (source) source.setData(geojson);
    } catch {}
  }, [vehicles]);

  if (!visible) return null;

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-background/95 backdrop-blur-md rounded-xl border shadow-xl p-3 flex items-center gap-3">
      <Flame className="w-4 h-4 text-orange-500 shrink-0" />
      <Select value={mode} onValueChange={(v) => setMode(v as HeatmapMode)}>
        <SelectTrigger className="h-8 w-40 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(modeConfig).map(([key, cfg]) => (
            <SelectItem key={key} value={key}>
              <div>
                <div className="font-medium">{cfg.label}</div>
                <div className="text-[10px] text-muted-foreground">{cfg.description}</div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* Legend */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-muted-foreground">Low</span>
        <div className="flex h-3 w-20 rounded-sm overflow-hidden">
          {modeConfig[mode].colorStops.slice(1).map(([, color], i) => (
            <div key={i} className="flex-1" style={{ background: color }} />
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground">High</span>
      </div>

      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
};

export default HeatmapOverlay;
