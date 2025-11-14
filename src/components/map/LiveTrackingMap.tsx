import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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
const resizeObserver = useRef<ResizeObserver | null>(null);
const [mapLoaded, setMapLoaded] = useState(false);
const [tokenError, setTokenError] = useState<string | null>(null);
const [tempToken, setTempToken] = useState('');
const [vehicleAddresses, setVehicleAddresses] = useState<Map<string, string>>(new Map());

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

    // Add or update markers
    vehicles.forEach(vehicle => {
      const statusColors = {
        moving: '#10b981', // primary/success
        idle: '#f59e0b', // warning
        stopped: '#6b7280', // muted
        offline: '#ef4444', // destructive
      };

      const color = statusColors[vehicle.status];
      
      // Fetch address if not already cached
      if (!vehicleAddresses.has(vehicle.id)) {
        fetchAddress(vehicle.lng, vehicle.lat, vehicle.id);
      }
      
      const address = vehicleAddresses.get(vehicle.id) || 'Loading address...';

      let existingMarker = markers.current.get(vehicle.id);

      if (existingMarker) {
        // Update existing marker
        existingMarker.setLngLat([vehicle.lng, vehicle.lat]);
        const element = existingMarker.getElement();
        element.style.backgroundColor = color;
        element.style.borderColor = vehicle.id === selectedVehicleId ? '#fff' : color;
        element.style.borderWidth = vehicle.id === selectedVehicleId ? '3px' : '2px';
      } else {
        // Create new marker
        const el = document.createElement('div');
        el.className = 'vehicle-marker';
        el.style.width = '32px';
        el.style.height = '32px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = color;
        el.style.border = `2px solid ${color}`;
        el.style.cursor = 'pointer';
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.transition = 'all 0.3s ease';

        // Add engine icon if engine is on
        if (vehicle.engine_on) {
          el.innerHTML = '<div style="width:8px;height:8px;background:white;border-radius:50%;"></div>';
        }

        el.addEventListener('mouseenter', () => {
          el.style.transform = 'scale(1.2)';
        });

        el.addEventListener('mouseleave', () => {
          el.style.transform = 'scale(1)';
        });

        const marker = new mapboxgl.Marker({
          element: el,
          rotation: vehicle.heading || 0,
        })
          .setLngLat([vehicle.lng, vehicle.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(`
              <div style="padding:12px; min-width:200px;">
                <strong style="font-size:14px;">${vehicle.plate}</strong><br/>
                <div style="margin-top:8px; padding-top:8px; border-top:1px solid #eee;">
                  <small style="display:block; margin:4px 0;">⚡ Speed: ${vehicle.speed} km/h</small>
                  <small style="display:block; margin:4px 0;">⛽ Fuel: ${vehicle.fuel}%</small>
                  <small style="display:block; margin:4px 0;">📍 Status: ${vehicle.status}</small>
                  <small style="display:block; margin:4px 0; color: ${
                    !vehicle.gps_signal_strength || vehicle.gps_signal_strength === 0 
                      ? '#ef4444' 
                      : vehicle.gps_signal_strength > 50 
                        ? '#22c55e' 
                        : '#f59e0b'
                  };">
                    📡 GPS: ${vehicle.gps_signal_strength || 0}% (${vehicle.gps_satellites_count || 0} satellites)
                  </small>
                </div>
                ${!vehicle.gps_signal_strength || vehicle.gps_signal_strength === 0 
                  ? '<div style="margin-top:8px;padding:6px;background:#fef2f2;border-radius:4px;color:#ef4444;text-align:center;font-size:11px;">⚠️ No GPS Signal - Location may be outdated</div>' 
                  : ''}
                <div style="margin-top:8px; padding-top:8px; border-top:1px solid #eee;">
                  <small style="color:#666; font-size:11px;">${address}</small>
                </div>
              </div>
            `)
          )
          .addTo(map.current!);

        el.addEventListener('click', () => {
          onVehicleClick?.(vehicle);
        });

        markers.current.set(vehicle.id, marker);
      }
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
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="max-w-md w-full glass-strong border rounded-xl p-6 text-center space-y-4">
          <h2 className="text-2xl font-bold gradient-text">
            {tokenError === 'webgl' ? 'WebGL not supported' : tokenError === 'invalid' ? 'Invalid Mapbox token' : 'Map requires a Mapbox token'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {tokenError === 'webgl'
              ? 'Your browser/device does not support WebGL required by the 3D map. Try a different browser or enable hardware acceleration.'
              : tokenError === 'invalid'
              ? 'The Mapbox token is invalid or expired. Update the token to render the map.'
              : 'Add your Mapbox public token to render the live map.'}
          </p>
          {tokenError !== 'webgl' && (
            <div className="space-y-2 text-left">
              <label className="text-sm">Enter token (starts with pk.)</label>
              <Input placeholder="pk.XXXX..." value={tempToken} onChange={(e) => setTempToken(e.target.value)} />
              <Button className="w-full" onClick={() => { if (tempToken) { localStorage.setItem('mapbox_token', tempToken); window.location.reload(); } }}>
                Save token and reload
              </Button>
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            Or configure in <Link className="text-primary underline" to="/settings#api">Settings → API Keys</Link>
          </div>
          <div className="text-xs text-muted-foreground">
            Get a token at mapbox.com (Tokens)
          </div>
        </div>
      </div>
    );
  }

  return (
<div ref={mapContainer} className="h-full w-full" />
  );
};

export default LiveTrackingMap;
