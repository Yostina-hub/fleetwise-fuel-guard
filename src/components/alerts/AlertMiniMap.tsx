import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getProviderStyle, getActiveProvider } from '@/lib/mapProviders';
import { LEMAT_DEFAULT_CENTER } from '@/lib/lemat';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation } from 'lucide-react';

interface AlertMiniMapProps {
  lat?: number | null;
  lng?: number | null;
  severity?: string;
  title?: string;
  className?: string;
  height?: string;
  interactive?: boolean;
  onNavigate?: () => void;
}

const AlertMiniMap = ({
  lat,
  lng,
  severity = 'info',
  title,
  className = '',
  height = '200px',
  interactive = false,
  onNavigate,
}: AlertMiniMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const marker = useRef<maplibregl.Marker | null>(null);
  const [error, setError] = useState(false);

  const hasCoords = lat != null && lng != null && isFinite(lat) && isFinite(lng);

  useEffect(() => {
    if (!hasCoords || !mapContainer.current) return;

    let cancelled = false;

    const init = async () => {
      try {
        const provider = getActiveProvider();
        const style = await getProviderStyle(provider, 'streets');

        if (cancelled || !mapContainer.current) return;

        const mapInstance = new maplibregl.Map({
          container: mapContainer.current,
          style,
          center: [lng!, lat!],
          zoom: 14,
          interactive,
          attributionControl: false,
        });

        map.current = mapInstance;

        // Severity-colored marker
        const markerColor = severity === 'critical' ? '#ef4444' : severity === 'warning' ? '#f59e0b' : '#3b82f6';

        const el = document.createElement('div');
        el.style.cssText = `
          width: 24px; height: 24px; border-radius: 50%;
          background: ${markerColor}; border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          ${severity === 'critical' ? 'animation: pulse 1.5s infinite;' : ''}
        `;

        marker.current = new maplibregl.Marker({ element: el })
          .setLngLat([lng!, lat!])
          .addTo(mapInstance);

        // Pulse animation for critical alerts
        if (severity === 'critical') {
          const styleEl = document.createElement('style');
          styleEl.textContent = `
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.3); opacity: 0.7; }
            }
          `;
          document.head.appendChild(styleEl);
        }

        mapInstance.on('error', () => setError(true));
      } catch {
        setError(true);
      }
    };

    init();

    return () => {
      cancelled = true;
      marker.current?.remove();
      map.current?.remove();
      map.current = null;
    };
  }, [lat, lng, severity, hasCoords, interactive]);

  if (!hasCoords) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border bg-muted/30 ${className}`}
        style={{ height }}
      >
        <div className="text-center text-muted-foreground text-sm">
          <MapPin className="w-6 h-6 mx-auto mb-1 opacity-40" />
          <span>No location data</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border bg-muted/30 ${className}`}
        style={{ height }}
      >
        <div className="text-center text-muted-foreground text-sm">
          <MapPin className="w-6 h-6 mx-auto mb-1 opacity-40" />
          <span>{lat!.toFixed(5)}, {lng!.toFixed(5)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative rounded-xl overflow-hidden border ${className}`} style={{ height }}>
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Overlay info */}
      <div className="absolute top-2 left-2 flex gap-1.5">
        {title && (
          <Badge variant="secondary" className="text-xs bg-background/80 backdrop-blur-sm">
            {title}
          </Badge>
        )}
      </div>

      {/* Navigate button */}
      {onNavigate && (
        <button
          onClick={onNavigate}
          className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-background/80 backdrop-blur-sm border hover:bg-background transition-colors"
          title="View on live map"
        >
          <Navigation className="w-4 h-4 text-primary" />
        </button>
      )}

      {/* Coordinates */}
      <div className="absolute bottom-2 left-2 text-[10px] text-muted-foreground bg-background/70 backdrop-blur-sm px-1.5 py-0.5 rounded">
        {lat!.toFixed(5)}, {lng!.toFixed(5)}
      </div>
    </div>
  );
};

export default AlertMiniMap;
