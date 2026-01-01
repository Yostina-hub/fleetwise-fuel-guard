import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { 
  createAnimatedMarkerElement, 
  animatePosition, 
  injectMarkerAnimations 
} from './AnimatedMarker';

interface Vehicle {
  id: string;
  plate: string;
  status: 'moving' | 'idle' | 'stopped' | 'offline';
  lat: number;
  lng: number;
  speed: number;
  fuel: number;
  heading?: number;
  engine_on?: boolean;
  address?: string;
  gps_signal_strength?: number;
  gps_satellites_count?: number;
  gps_hdop?: number;
  gps_fix_type?: string;
}

interface LiveTrackingMapProps {
  vehicles: Vehicle[];
  onVehicleClick?: (vehicle: Vehicle) => void;
  selectedVehicleId?: string;
  token?: string;
  mapStyle?: 'streets' | 'satellite';
  onMapReady?: (map: mapboxgl.Map) => void;
}

const LiveTrackingMap = ({ vehicles, onVehicleClick, selectedVehicleId, token, mapStyle = 'satellite', onMapReady }: LiveTrackingMapProps) => {
const mapContainer = useRef<HTMLDivElement>(null);
const map = useRef<mapboxgl.Map | null>(null);
const markers = useRef<Map<string, mapboxgl.Marker>>(new Map());
const previousPositions = useRef<Map<string, { lng: number; lat: number }>>(new Map());
const resizeObserver = useRef<ResizeObserver | null>(null);
const [mapLoaded, setMapLoaded] = useState(false);
const [tokenError, setTokenError] = useState<string | null>(null);
const [tempToken, setTempToken] = useState('');
const [vehicleAddresses, setVehicleAddresses] = useState<Map<string, string>>(new Map());

// Inject marker animations on mount
useEffect(() => {
  injectMarkerAnimations();
}, []);

  // Fetch token from backend
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const localToken = token || localStorage.getItem('mapbox_token') || import.meta.env.VITE_MAPBOX_TOKEN;
        if (localToken) {
          return localToken;
        }
        
        // Fetch from edge function via Supabase client (handles CORS/auth)
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) {
          console.error('get-mapbox-token error:', error);
          setTokenError('missing');
          return null;
        }
        const fetched = (data as any)?.token as string | undefined;
        if (fetched) {
          try { localStorage.setItem('mapbox_token', fetched); } catch {}
        }
        return fetched || null;
      } catch (err) {
        console.error('Failed to fetch Mapbox token:', err);
        setTokenError('missing');
        return null;
      }
    };

    const initMap = async () => {
      if (!mapContainer.current || map.current) return;

      const mapboxToken = await fetchToken();
      if (!mapboxToken) return;

      if (!mapboxgl.supported()) {
        setTokenError('webgl');
        return;
      }

      mapboxgl.accessToken = mapboxToken;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: mapStyle === 'satellite' ? 'mapbox://styles/mapbox/satellite-streets-v12' : 'mapbox://styles/mapbox/streets-v12',
        center: [38.75, 9.02], // Addis Ababa
        zoom: 12,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

const setLoaded = () => setMapLoaded(true);
map.current.on('load', () => {
  setLoaded();
  try { onMapReady?.(map.current!); } catch {}
  try {
    if (mapContainer.current) {
      resizeObserver.current = new ResizeObserver(() => {
        try { map.current?.resize(); } catch {}
      });
      resizeObserver.current.observe(mapContainer.current);
    }
  } catch {}
});
map.current.on('style.load', setLoaded);
      map.current.on('error', (e: any) => {
        const msg = e?.error?.message || '';
        const status = e?.error?.status || e?.error?.statusCode;
        if (status === 401 || status === 403 || /unauthorized|forbidden|access token|token/i.test(String(msg))) {
          setTokenError('invalid');
        }
      });
    };

    initMap();

return () => {
  try {
    // Disconnect resize observer
    try { resizeObserver.current?.disconnect(); } catch {}
    resizeObserver.current = null;

    markers.current.forEach(marker => marker.remove());
    markers.current.clear();
    if (map.current) {
      map.current.remove();
      map.current = null;
    }
  } catch (e) {
    console.warn('Map cleanup error (ignored):', e);
    map.current = null;
  }
};
  }, [token]);

  // Update map style when setting changes
  useEffect(() => {
    if (!map.current) return;
    const targetStyle = mapStyle === 'satellite' ? 'mapbox://styles/mapbox/satellite-streets-v12' : 'mapbox://styles/mapbox/streets-v12';
    setMapLoaded(false);
    map.current.setStyle(targetStyle);
  }, [mapStyle]);

  // Fetch address for a location
  const fetchAddress = async (lng: number, lat: number, vehicleId: string) => {
    try {
      const mapboxToken = token || localStorage.getItem('mapbox_token') || import.meta.env.VITE_MAPBOX_TOKEN;
      if (!mapboxToken) return;
      
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&types=poi,address,place`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const place = data.features[0];
        const address = place.place_name || place.text || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        setVehicleAddresses(prev => new Map(prev).set(vehicleId, address));
      }
    } catch (error) {
      console.error('Error fetching address:', error);
    }
  };

  // Update vehicle markers
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const currentVehicleIds = new Set(vehicles.map(v => v.id));

    // Remove markers for vehicles no longer in the list
    markers.current.forEach((marker, id) => {
      if (!currentVehicleIds.has(id)) {
        marker.remove();
        markers.current.delete(id);
      }
    });

    // Add or update markers with smooth animations
    vehicles.forEach(vehicle => {
      // Fetch address if not already cached
      if (!vehicleAddresses.has(vehicle.id)) {
        fetchAddress(vehicle.lng, vehicle.lat, vehicle.id);
      }
      
      const address = vehicleAddresses.get(vehicle.id) || 'Loading address...';
      const existingMarker = markers.current.get(vehicle.id);
      const previousPos = previousPositions.current.get(vehicle.id);

      if (existingMarker && previousPos) {
        // Animate to new position smoothly
        const hasPositionChanged = 
          Math.abs(previousPos.lng - vehicle.lng) > 0.00001 || 
          Math.abs(previousPos.lat - vehicle.lat) > 0.00001;

        if (hasPositionChanged) {
          animatePosition(
            existingMarker,
            previousPos.lng,
            previousPos.lat,
            vehicle.lng,
            vehicle.lat,
            1200
          );
        }

        // Update marker appearance
        const el = existingMarker.getElement();
        const isSelected = vehicle.id === selectedVehicleId;
        el.style.borderWidth = isSelected ? '4px' : '2px';
        el.style.borderColor = isSelected ? 'white' : '';
      } else {
        // Create new animated marker element
        const el = createAnimatedMarkerElement(
          vehicle.status,
          vehicle.id === selectedVehicleId,
          vehicle.engine_on,
          vehicle.heading
        );

        const marker = new mapboxgl.Marker({
          element: el,
          anchor: 'center',
        })
          .setLngLat([vehicle.lng, vehicle.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25, closeButton: false, closeOnClick: true, className: 'vehicle-popup' }).setHTML(`
              <div class="vehicle-popup-content">
                <div class="popup-header">
                  <span class="popup-plate">${vehicle.plate}</span>
                  <span class="popup-status popup-status-${vehicle.status}">${vehicle.status}</span>
                </div>
                <div class="popup-stats">
                  <div class="popup-stat">
                    <span class="popup-stat-value">${vehicle.speed}</span>
                    <span class="popup-stat-label">km/h</span>
                  </div>
                  <div class="popup-stat">
                    <span class="popup-stat-value">${vehicle.fuel}</span>
                    <span class="popup-stat-label">% fuel</span>
                  </div>
                </div>
                <div class="popup-address">${address}</div>
              </div>
            `)
          )
          .addTo(map.current!);

        el.addEventListener('click', () => {
          onVehicleClick?.(vehicle);
          if (map.current) {
            map.current.flyTo({
              center: [vehicle.lng, vehicle.lat],
              zoom: 16,
              duration: 1200,
              essential: true
            });
          }
          marker.togglePopup();
        });

        markers.current.set(vehicle.id, marker);
      }

      // Store current position for next animation
      previousPositions.current.set(vehicle.id, { lng: vehicle.lng, lat: vehicle.lat });
    });

    // Center on selected vehicle or auto-fit bounds to show all vehicles
    if (selectedVehicleId && vehicles.length > 0) {
      const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
      if (selectedVehicle) {
        map.current!.flyTo({
          center: [selectedVehicle.lng, selectedVehicle.lat],
          zoom: 15,
          duration: 1500,
          essential: true
        });
      }
    } else if (vehicles.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      vehicles.forEach(v => bounds.extend([v.lng, v.lat]));
      map.current!.fitBounds(bounds, { padding: 50, maxZoom: 15 });
    }
  }, [vehicles, mapLoaded, selectedVehicleId, onVehicleClick]);

  if (tokenError) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-muted/50">
        <div className="max-w-sm w-full bg-background border rounded-xl p-6 text-center space-y-4 shadow-lg">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <span className="text-2xl">🗺️</span>
          </div>
          <div>
            <h3 className="font-semibold text-lg">
              {tokenError === 'webgl' ? 'WebGL Required' : 'Map Token Needed'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {tokenError === 'webgl'
                ? 'Enable hardware acceleration in your browser settings.'
                : 'Add your Mapbox public token to display the map.'}
            </p>
          </div>
          {tokenError !== 'webgl' && (
            <div className="space-y-2">
              <Input 
                placeholder="pk.eyJ1..." 
                value={tempToken} 
                onChange={(e) => setTempToken(e.target.value)}
                className="text-sm"
              />
              <Button 
                className="w-full" 
                size="sm"
                disabled={!tempToken.startsWith('pk.')}
                onClick={() => { 
                  if (tempToken) { 
                    localStorage.setItem('mapbox_token', tempToken); 
                    window.location.reload(); 
                  } 
                }}
              >
                Save & Reload
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
<div ref={mapContainer} className="h-full w-full" />
  );
};

export default LiveTrackingMap;
