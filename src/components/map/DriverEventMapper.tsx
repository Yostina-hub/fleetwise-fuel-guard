import { useState, useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Zap, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

interface DriverEventMapperProps {
  map: maplibregl.Map | null;
  visible: boolean;
  onClose: () => void;
}

const EVENT_SOURCE = 'driver-events-source';
const EVENT_LAYER = 'driver-events-layer';
const EVENT_LABEL_LAYER = 'driver-events-label';

type EventFilter = 'all' | 'harsh_braking' | 'harsh_acceleration' | 'sharp_turn' | 'speeding';

const eventColors: Record<string, string> = {
  harsh_braking: '#ef4444',
  harsh_acceleration: '#f97316',
  sharp_turn: '#a855f7',
  speeding: '#dc2626',
  default: '#6b7280',
};

export const DriverEventMapper = ({ map, visible, onClose }: DriverEventMapperProps) => {
  const { organizationId } = useOrganization();
  const [events, setEvents] = useState<any[]>([]);
  const [filter, setFilter] = useState<EventFilter>('all');
  const [loading, setLoading] = useState(false);
  const layerAdded = useRef(false);

  // Fetch driver events
  useEffect(() => {
    if (!organizationId || !visible) return;
    setLoading(true);

    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from('driver_events')
        .select('id, event_type, severity, lat, lng, speed_kmh, event_time, driver_id')
        .eq('organization_id', organizationId)
        .gte('event_time', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .not('lat', 'is', null)
        .not('lng', 'is', null)
        .order('event_time', { ascending: false })
        .limit(500);

      if (!error && data) setEvents(data);
      setLoading(false);
    };

    fetchEvents();
  }, [organizationId, visible]);

  // Render events on map
  useEffect(() => {
    if (!map || !visible) {
      if (map && layerAdded.current) {
        try {
          if (map.getLayer(EVENT_LABEL_LAYER)) map.removeLayer(EVENT_LABEL_LAYER);
          if (map.getLayer(EVENT_LAYER)) map.removeLayer(EVENT_LAYER);
          if (map.getSource(EVENT_SOURCE)) map.removeSource(EVENT_SOURCE);
        } catch {}
        layerAdded.current = false;
      }
      return;
    }

    const filtered = filter === 'all' ? events : events.filter(e => e.event_type === filter);

    const features: GeoJSON.Feature[] = filtered.map(e => ({
      type: 'Feature',
      properties: {
        type: e.event_type,
        severity: e.severity,
        speed: e.speed_kmh || 0,
        color: eventColors[e.event_type] || eventColors.default,
      },
      geometry: { type: 'Point', coordinates: [e.lng, e.lat] },
    }));

    const geojson: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features };

    const addLayers = () => {
      if (!map.isStyleLoaded()) return;
      try {
        if (map.getLayer(EVENT_LABEL_LAYER)) map.removeLayer(EVENT_LABEL_LAYER);
        if (map.getLayer(EVENT_LAYER)) map.removeLayer(EVENT_LAYER);
        if (map.getSource(EVENT_SOURCE)) map.removeSource(EVENT_SOURCE);
      } catch {}

      map.addSource(EVENT_SOURCE, { type: 'geojson', data: geojson });

      map.addLayer({
        id: EVENT_LAYER,
        type: 'circle',
        source: EVENT_SOURCE,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 4, 15, 10],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.8,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#fff',
        },
      });

      map.addLayer({
        id: EVENT_LABEL_LAYER,
        type: 'symbol',
        source: EVENT_SOURCE,
        minzoom: 13,
        layout: {
          'text-field': ['get', 'type'],
          'text-size': 9,
          'text-offset': [0, 1.5],
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#374151',
          'text-halo-color': '#fff',
          'text-halo-width': 1,
        },
      });

      layerAdded.current = true;
    };

    if (map.isStyleLoaded()) addLayers();
    else map.once('style.load', addLayers);

    return () => {
      if (map && layerAdded.current) {
        try {
          if (map.getLayer(EVENT_LABEL_LAYER)) map.removeLayer(EVENT_LABEL_LAYER);
          if (map.getLayer(EVENT_LAYER)) map.removeLayer(EVENT_LAYER);
          if (map.getSource(EVENT_SOURCE)) map.removeSource(EVENT_SOURCE);
        } catch {}
        layerAdded.current = false;
      }
    };
  }, [map, visible, events, filter]);

  if (!visible) return null;

  const eventCounts = {
    harsh_braking: events.filter(e => e.event_type === 'harsh_braking').length,
    harsh_acceleration: events.filter(e => e.event_type === 'harsh_acceleration').length,
    sharp_turn: events.filter(e => e.event_type === 'sharp_turn').length,
    speeding: events.filter(e => e.event_type === 'speeding').length,
  };

  return (
    <div className="absolute bottom-6 right-4 z-20 bg-background/95 backdrop-blur-md rounded-xl border shadow-xl p-3 w-72">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-semibold">Driver Events</span>
          {loading && <Loader2 className="w-3 h-3 animate-spin" />}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <Select value={filter} onValueChange={(v) => setFilter(v as EventFilter)}>
        <SelectTrigger className="h-8 text-xs mb-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Events ({events.length})</SelectItem>
          <SelectItem value="harsh_braking">Harsh Braking ({eventCounts.harsh_braking})</SelectItem>
          <SelectItem value="harsh_acceleration">Harsh Acceleration ({eventCounts.harsh_acceleration})</SelectItem>
          <SelectItem value="sharp_turn">Sharp Turns ({eventCounts.sharp_turn})</SelectItem>
          <SelectItem value="speeding">Speeding ({eventCounts.speeding})</SelectItem>
        </SelectContent>
      </Select>

      {/* Legend */}
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(eventColors).filter(([k]) => k !== 'default').map(([type, color]) => (
          <div key={type} className="flex items-center gap-1 text-[10px]">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
            <span className="text-muted-foreground">{type.replace(/_/g, ' ')}</span>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground mt-2">Showing events from the last 24h</p>
    </div>
  );
};

export default DriverEventMapper;
