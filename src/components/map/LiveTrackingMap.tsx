import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { 
  createAnimatedMarkerElement, 
  animatePosition, 
  injectMarkerAnimations,
  getSpeedColor 
} from './AnimatedMarker';

interface TrailPoint {
  lat: number;
  lng: number;
  timestamp: string;
  speed: number;
}

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
  speed_limit?: number;
  driverName?: string;
  driverPhone?: string;
  lastSeen?: string;
  isOffline?: boolean;
}

interface LiveTrackingMapProps {
  vehicles: Vehicle[];
  onVehicleClick?: (vehicle: Vehicle) => void;
  selectedVehicleId?: string;
  token?: string;
  mapStyle?: 'streets' | 'satellite';
  onMapReady?: (map: mapboxgl.Map) => void;
  showTrails?: boolean;
  trails?: Map<string, TrailPoint[]>;
  openPopupVehicleId?: string | null;
  onPopupOpened?: () => void;
}

const LiveTrackingMap = ({ 
  vehicles, 
  onVehicleClick, 
  selectedVehicleId, 
  token, 
  mapStyle = 'satellite', 
  onMapReady,
  showTrails = true,
  trails = new Map(),
  openPopupVehicleId,
  onPopupOpened
}: LiveTrackingMapProps) => {
const mapContainer = useRef<HTMLDivElement>(null);
const map = useRef<mapboxgl.Map | null>(null);
const markers = useRef<Map<string, mapboxgl.Marker>>(new Map());
const previousPositions = useRef<Map<string, { lng: number; lat: number }>>(new Map());
const resizeObserver = useRef<ResizeObserver | null>(null);
const addressFetchTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
const initialBoundsFitted = useRef(false);
const trailSourcesAdded = useRef<Set<string>>(new Set());
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

  // Debounced address fetching to avoid API spam - gets detailed street-level address
  const fetchAddressDebounced = (lng: number, lat: number, vehicleId: string) => {
    // Clear existing timeout for this vehicle
    const existingTimeout = addressFetchTimeouts.current.get(vehicleId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new debounced fetch
    const timeout = setTimeout(async () => {
      try {
        const mapboxToken = token || localStorage.getItem('mapbox_token') || import.meta.env.VITE_MAPBOX_TOKEN;
        if (!mapboxToken) return;

        // Fetch with all types to get the most detailed result
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&types=poi,address,neighborhood,locality,place&limit=5&language=en`;
        const res = await fetch(url);
        
        if (!res.ok) {
          setVehicleAddresses(prev => new Map(prev).set(vehicleId, `${lat.toFixed(6)}, ${lng.toFixed(6)}`));
          return;
        }
        
        const json = await res.json();
        const features = json?.features || [];

        if (features.length === 0) {
          setVehicleAddresses(prev => new Map(prev).set(vehicleId, `${lat.toFixed(6)}, ${lng.toFixed(6)}`));
          return;
        }

        // Find the most specific feature (prefer address/poi over neighborhood/place)
        const typePriority: Record<string, number> = { 
          'address': 1, 
          'poi': 2, 
          'neighborhood': 3, 
          'locality': 4, 
          'place': 5 
        };
        
        const sortedFeatures = features.sort((a: any, b: any) => {
          const aType = a.place_type?.[0] || 'place';
          const bType = b.place_type?.[0] || 'place';
          return (typePriority[aType] || 99) - (typePriority[bType] || 99);
        });

        const bestFeature = sortedFeatures[0];
        const featureType = bestFeature.place_type?.[0] || '';
        const context = bestFeature.context || [];
        
        // Extract context parts
        const street = context.find((c: any) => c.id?.startsWith('address'))?.text || '';
        const neighborhood = context.find((c: any) => c.id?.startsWith('neighborhood'))?.text || '';
        const locality = context.find((c: any) => c.id?.startsWith('locality'))?.text || '';
        const place = context.find((c: any) => c.id?.startsWith('place'))?.text || '';
        const district = context.find((c: any) => c.id?.startsWith('district'))?.text || '';
        const region = context.find((c: any) => c.id?.startsWith('region'))?.text || '';

        // Build a detailed, human-readable address
        let addressParts: string[] = [];
        
        // Main feature name (POI name, street address, etc.)
        if (featureType === 'address') {
          const houseNumber = bestFeature.address || '';
          const streetName = bestFeature.text || '';
          if (houseNumber && streetName) {
            addressParts.push(`${houseNumber} ${streetName}`);
          } else if (streetName) {
            addressParts.push(streetName);
          }
        } else if (featureType === 'poi') {
          // POI: show the POI name prominently
          addressParts.push(bestFeature.text || '');
          if (street) {
            addressParts.push(street);
          }
        } else {
          addressParts.push(bestFeature.text || '');
        }

        // Add neighborhood/sub-locality for more precision
        if (neighborhood && !addressParts.includes(neighborhood)) {
          addressParts.push(neighborhood);
        }
        
        // Add locality or district
        if (locality && !addressParts.includes(locality)) {
          addressParts.push(locality);
        } else if (district && !addressParts.includes(district)) {
          addressParts.push(district);
        }
        
        // Add city/place
        if (place && !addressParts.includes(place)) {
          addressParts.push(place);
        }

        // Filter empty and dedupe
        addressParts = addressParts.filter((p, i, arr) => p && p.trim() && arr.indexOf(p) === i);
        
        const finalAddress = addressParts.length > 0 
          ? addressParts.join(', ') 
          : bestFeature.place_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

        setVehicleAddresses(prev => new Map(prev).set(vehicleId, finalAddress));
      } catch (error) {
        console.error('Error fetching address:', error);
        setVehicleAddresses(prev => new Map(prev).set(vehicleId, `${lat.toFixed(6)}, ${lng.toFixed(6)}`));
      }
      addressFetchTimeouts.current.delete(vehicleId);
    }, 500); // 500ms debounce

    addressFetchTimeouts.current.set(vehicleId, timeout);
  };

  // Helper to get relative time string
  const getRelativeTime = (dateStr: string): string => {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 10) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  // Get heading direction label
  const getHeadingLabel = (heading: number): string => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(heading / 45) % 8;
    return directions[index];
  };

  // Helper to generate popup HTML
  const generatePopupHTML = useCallback((addr: string, v: Vehicle) => {
    const gpsStrength = v.gps_signal_strength ?? 0;
    const gpsSignalLabel = gpsStrength >= 80 ? 'Strong' : gpsStrength >= 50 ? 'Moderate' : gpsStrength > 0 ? 'Weak' : 'No signal';
    const gpsColor = gpsStrength >= 80 ? '#22c55e' : gpsStrength >= 50 ? '#f59e0b' : gpsStrength > 0 ? '#ef4444' : '#6b7280';
    const relativeTime = v.lastSeen ? getRelativeTime(v.lastSeen) : 'N/A';
    const speedLimit = v.speed_limit || 80;
    const isOverspeeding = v.speed > speedLimit;
    const headingLabel = v.heading !== undefined ? getHeadingLabel(v.heading) : '';
    const headingDeg = v.heading !== undefined ? Math.round(v.heading) : 0;
    const satellites = v.gps_satellites_count ?? 0;
    const hdop = v.gps_hdop ?? 0;
    const fuelStatus = v.fuel < 15 ? 'critical' : v.fuel < 25 ? 'low' : 'normal';
    const fuelColor = fuelStatus === 'critical' ? '#dc2626' : fuelStatus === 'low' ? '#f59e0b' : '#22c55e';
    
    return `
      <div class="vehicle-popup-content" style="min-width:380px;max-width:420px;font-family:system-ui,-apple-system,sans-serif;padding:16px;">
        <!-- Header with plate, status, and timestamp -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #e5e7eb;">
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
              <span style="font-weight:700;font-size:18px;color:#111827;">${v.plate}</span>
              <span style="font-size:11px;padding:4px 12px;border-radius:9999px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;background:${v.status === 'moving' ? '#dcfce7' : v.status === 'idle' ? '#fef3c7' : v.status === 'stopped' ? '#f3f4f6' : '#fee2e2'};color:${v.status === 'moving' ? '#166534' : v.status === 'idle' ? '#92400e' : v.status === 'stopped' ? '#4b5563' : '#991b1b'};">${v.status}</span>
            </div>
            ${v.status === 'moving' && v.heading !== undefined ? `
              <div style="display:flex;align-items:center;gap:6px;color:#6b7280;font-size:12px;">
                <svg width="12" height="12" viewBox="0 0 10 10" fill="#22c55e" style="transform:rotate(${headingDeg}deg)"><path d="M5 0L10 10H0L5 0Z"/></svg>
                Heading ${headingLabel} (${headingDeg}°)
              </div>
            ` : ''}
          </div>
          <div style="text-align:right;">
            <div style="font-size:11px;color:#9ca3af;">Last Update</div>
            <div style="font-size:13px;font-weight:600;color:${relativeTime === 'Just now' ? '#22c55e' : relativeTime.includes('m') && parseInt(relativeTime) < 5 ? '#22c55e' : relativeTime.includes('h') ? '#f59e0b' : '#6b7280'};">${relativeTime}</div>
          </div>
        </div>
        
        <!-- Primary metrics grid -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px;">
          <div style="text-align:center;padding:10px 6px;background:linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);border-radius:10px;border:1px solid #e5e7eb;">
            <div style="font-size:20px;font-weight:700;color:${isOverspeeding ? '#dc2626' : '#111827'};">${v.speed}</div>
            <div style="font-size:10px;color:#6b7280;font-weight:500;">km/h</div>
          </div>
          <div style="text-align:center;padding:10px 6px;background:linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);border-radius:10px;border:1px solid #e5e7eb;">
            <div style="font-size:20px;font-weight:700;color:${fuelColor};">${v.fuel}%</div>
            <div style="font-size:10px;color:#6b7280;font-weight:500;">Fuel</div>
          </div>
          <div style="text-align:center;padding:10px 6px;background:linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);border-radius:10px;border:1px solid #e5e7eb;">
            <div style="font-size:16px;font-weight:700;color:${v.engine_on ? '#22c55e' : '#6b7280'};">
              ${v.engine_on ? '🟢' : '⚫'} ${v.engine_on ? 'ON' : 'OFF'}
            </div>
            <div style="font-size:10px;color:#6b7280;font-weight:500;">Ignition</div>
          </div>
          <div style="text-align:center;padding:10px 6px;background:linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);border-radius:10px;border:1px solid #e5e7eb;">
            <div style="font-size:16px;font-weight:700;color:${gpsColor};">●</div>
            <div style="font-size:10px;color:#6b7280;font-weight:500;">${gpsSignalLabel}</div>
          </div>
        </div>

        <!-- Alerts section -->
        ${isOverspeeding ? `
          <div style="background:linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);color:#991b1b;font-size:12px;font-weight:600;padding:10px 14px;border-radius:8px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;border:1px solid #fca5a5;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:16px;">⚠️</span> 
              <span>OVERSPEEDING</span>
            </div>
            <div>${v.speed} km/h <span style="color:#7f1d1d;font-weight:400;">(limit: ${speedLimit})</span></div>
          </div>
        ` : ''}
        
        ${fuelStatus === 'critical' ? `
          <div style="background:linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);color:#92400e;font-size:12px;font-weight:600;padding:10px 14px;border-radius:8px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;border:1px solid #fcd34d;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:16px;">⛽</span> 
              <span>LOW FUEL WARNING</span>
            </div>
            <div>${v.fuel}% remaining</div>
          </div>
        ` : ''}

        <!-- Driver info -->
        <div style="background:#f9fafb;border-radius:10px;padding:12px;margin-bottom:12px;border:1px solid #e5e7eb;">
          <div style="font-size:10px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Driver</div>
          ${v.driverName ? `
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div style="display:flex;align-items:center;gap:8px;">
                <div style="width:32px;height:32px;background:linear-gradient(135deg, #8DC63F 0%, #6ba02f 100%);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:600;font-size:13px;">
                  ${v.driverName.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <div>
                  <div style="font-weight:600;font-size:14px;color:#111827;">${v.driverName}</div>
                  ${v.driverPhone ? `<div style="color:#6b7280;font-size:12px;">📞 ${v.driverPhone}</div>` : ''}
                </div>
              </div>
            </div>
          ` : `
            <div style="color:#9ca3af;font-size:13px;font-style:italic;">No driver assigned</div>
          `}
        </div>

        <!-- GPS & Technical details -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
          <div style="background:#f9fafb;border-radius:10px;padding:12px;border:1px solid #e5e7eb;">
            <div style="font-size:10px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">GPS Info</div>
            <div style="display:flex;flex-direction:column;gap:4px;font-size:12px;">
              <div style="display:flex;justify-content:space-between;"><span style="color:#6b7280;">Satellites:</span><span style="font-weight:600;color:#111827;">${satellites > 0 ? satellites : 'N/A'}</span></div>
              <div style="display:flex;justify-content:space-between;"><span style="color:#6b7280;">Signal:</span><span style="font-weight:600;color:${gpsColor};">${gpsStrength}%</span></div>
              <div style="display:flex;justify-content:space-between;"><span style="color:#6b7280;">HDOP:</span><span style="font-weight:600;color:#111827;">${hdop > 0 ? hdop.toFixed(1) : 'N/A'}</span></div>
            </div>
          </div>
          <div style="background:#f9fafb;border-radius:10px;padding:12px;border:1px solid #e5e7eb;">
            <div style="font-size:10px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Coordinates</div>
            <div style="display:flex;flex-direction:column;gap:4px;font-size:12px;">
              <div style="display:flex;justify-content:space-between;"><span style="color:#6b7280;">Lat:</span><span style="font-weight:600;color:#111827;font-family:monospace;">${v.lat.toFixed(6)}</span></div>
              <div style="display:flex;justify-content:space-between;"><span style="color:#6b7280;">Lng:</span><span style="font-weight:600;color:#111827;font-family:monospace;">${v.lng.toFixed(6)}</span></div>
            </div>
          </div>
        </div>
        
        <!-- Location address -->
        <div style="background:linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);border-radius:10px;padding:12px;border:1px solid #bbf7d0;">
          <div style="display:flex;align-items:flex-start;gap:8px;">
            <span style="font-size:16px;">📍</span>
            <div style="flex:1;">
              <div style="font-size:10px;color:#166534;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Current Location</div>
              <div style="font-size:13px;color:#166534;line-height:1.5;font-weight:500;">${addr}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }, []);

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
        fetchAddressDebounced(vehicle.lng, vehicle.lat, vehicle.id);
      }
      
      const address = vehicleAddresses.get(vehicle.id) || 'Loading address...';
      const existingMarker = markers.current.get(vehicle.id);
      const previousPos = previousPositions.current.get(vehicle.id);
      
      // Check if vehicle is overspeeding (speed > limit, default 80 km/h if no limit set)
      const speedLimit = vehicle.speed_limit || 80;
      const isOverspeeding = vehicle.speed > speedLimit;

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

        // Update marker appearance - recreate if status, overspeeding, or speed changed significantly
        const el = existingMarker.getElement();
        const isSelected = vehicle.id === selectedVehicleId;
        const wasOverspeeding = el.dataset.overspeeding === 'true';
        const previousStatus = el.dataset.status;
        const previousSpeed = parseFloat(el.dataset.speed || '0');
        const speedChanged = Math.abs(previousSpeed - vehicle.speed) >= 5; // Recreate if speed changed by 5+ km/h
        
        // Recreate marker if status, overspeeding state, or speed changed
        if (wasOverspeeding !== isOverspeeding || previousStatus !== vehicle.status || speedChanged) {
          existingMarker.remove();
          markers.current.delete(vehicle.id);
        } else {
          el.style.borderWidth = isSelected ? '3px' : '2.5px';
          el.style.borderColor = isSelected ? 'white' : '';
        }
      }
      
      // Create new marker if needed
      if (!markers.current.has(vehicle.id)) {
        const el = createAnimatedMarkerElement(
          vehicle.status,
          vehicle.id === selectedVehicleId,
          vehicle.engine_on,
          vehicle.heading,
          isOverspeeding,
          vehicle.speed
        );
        el.dataset.overspeeding = isOverspeeding.toString();
        el.dataset.status = vehicle.status;
        el.dataset.speed = vehicle.speed.toString();

        const popup = new mapboxgl.Popup({ offset: 25, closeButton: true, closeOnClick: false, className: 'vehicle-popup' })
          .setHTML(generatePopupHTML(address, vehicle));

        const marker = new mapboxgl.Marker({
          element: el,
          anchor: 'center',
        })
          .setLngLat([vehicle.lng, vehicle.lat])
          .setPopup(popup)
          .addTo(map.current!);

        // Store popup reference for updates
        (marker as any)._customPopup = popup;
        (marker as any)._vehicleId = vehicle.id;

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
          // Refresh popup content with latest address
          const latestAddr = vehicleAddresses.get(vehicle.id) || 'Loading address...';
          popup.setHTML(generatePopupHTML(latestAddr, vehicle));
          marker.togglePopup();
        });

        markers.current.set(vehicle.id, marker);
      } else {
        // Update existing marker's popup content with latest address
        const existingMarker = markers.current.get(vehicle.id);
        if (existingMarker) {
          const popup = existingMarker.getPopup();
          if (popup && popup.isOpen()) {
            const latestAddr = vehicleAddresses.get(vehicle.id) || 'Loading address...';
            popup.setHTML(generatePopupHTML(latestAddr, vehicle));
          }
        }
      }

      // Store current position for next animation
      previousPositions.current.set(vehicle.id, { lng: vehicle.lng, lat: vehicle.lat });
    });

    // Center on selected vehicle
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
    } else if (vehicles.length > 0 && !initialBoundsFitted.current) {
      // Auto-fit bounds only on initial load
      const bounds = new mapboxgl.LngLatBounds();
      vehicles.forEach(v => bounds.extend([v.lng, v.lat]));
      map.current!.fitBounds(bounds, { padding: 50, maxZoom: 15 });
      initialBoundsFitted.current = true;
    }
  }, [vehicles, mapLoaded, selectedVehicleId, onVehicleClick, vehicleAddresses, generatePopupHTML]);

  // Open popup for a specific vehicle when requested from sidebar
  useEffect(() => {
    if (!openPopupVehicleId || !mapLoaded || !map.current) return;
    
    const marker = markers.current.get(openPopupVehicleId);
    const vehicle = vehicles.find(v => v.id === openPopupVehicleId);
    
    if (marker && vehicle) {
      // Close all other popups first
      markers.current.forEach((m, id) => {
        if (id !== openPopupVehicleId && m.getPopup()?.isOpen()) {
          m.getPopup()?.remove();
        }
      });
      
      // Fly to the vehicle
      map.current.flyTo({
        center: [vehicle.lng, vehicle.lat],
        zoom: 16,
        duration: 1200,
        essential: true
      });
      
      // Trigger address fetch if not already cached
      if (!vehicleAddresses.has(vehicle.id)) {
        fetchAddressDebounced(vehicle.lng, vehicle.lat, vehicle.id);
      }
      
      // Update popup content with latest address and open it
      const popup = marker.getPopup();
      if (popup) {
        const latestAddr = vehicleAddresses.get(vehicle.id) || 'Fetching address...';
        popup.setHTML(generatePopupHTML(latestAddr, vehicle));
        
        if (!popup.isOpen()) {
          marker.togglePopup();
        }
      }
      
      // Notify parent that popup was opened
      onPopupOpened?.();
    }
  }, [openPopupVehicleId, mapLoaded, vehicles, onPopupOpened, generatePopupHTML]);

  // Update any open popup when vehicleAddresses changes (to show fetched address)
  useEffect(() => {
    if (!mapLoaded) return;
    
    markers.current.forEach((marker, vehicleId) => {
      const popup = marker.getPopup();
      if (popup && popup.isOpen()) {
        const vehicle = vehicles.find(v => v.id === vehicleId);
        const address = vehicleAddresses.get(vehicleId);
        if (vehicle && address) {
          popup.setHTML(generatePopupHTML(address, vehicle));
        }
      }
    });
  }, [vehicleAddresses, mapLoaded, vehicles, generatePopupHTML]);

  // Draw vehicle trails on the map with speed-based coloring
  useEffect(() => {
    if (!map.current || !mapLoaded || !showTrails) return;

    trails.forEach((points, vehicleId) => {
      if (points.length < 2) return;

      const sourceId = `trail-${vehicleId}`;
      const layerId = `trail-line-${vehicleId}`;
      const isSelected = vehicleId === selectedVehicleId;

      // Create line segments with speed data for gradient coloring
      const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];
      
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const avgSpeed = (p1.speed + p2.speed) / 2;
        
        features.push({
          type: 'Feature',
          properties: { 
            speed: avgSpeed,
            color: getSpeedColor(avgSpeed, 120)
          },
          geometry: {
            type: 'LineString',
            coordinates: [[p1.lng, p1.lat], [p2.lng, p2.lat]],
          },
        });
      }

      const geojsonData: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features,
      };

      // Update or create source
      const source = map.current!.getSource(sourceId) as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData(geojsonData);
      } else {
        map.current!.addSource(sourceId, {
          type: 'geojson',
          data: geojsonData,
        });

        // Add glow effect layer (wider, semi-transparent)
        map.current!.addLayer({
          id: `${layerId}-glow`,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': isSelected ? ['get', 'color'] : '#3b82f6',
            'line-width': 10,
            'line-opacity': 0.25,
            'line-blur': 4,
          },
        });

        // Add main trail line with speed-based colors for selected vehicle
        map.current!.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': isSelected ? ['get', 'color'] : '#3b82f6',
            'line-width': isSelected ? 4 : 3,
            'line-opacity': 0.95,
          },
        });

        trailSourcesAdded.current.add(vehicleId);
      }

      // Update colors based on selection - show speed gradient only for selected
      if (map.current!.getLayer(layerId)) {
        if (isSelected) {
          map.current!.setPaintProperty(layerId, 'line-color', ['get', 'color']);
          map.current!.setPaintProperty(`${layerId}-glow`, 'line-color', ['get', 'color']);
          map.current!.setPaintProperty(layerId, 'line-width', 4);
        } else {
          map.current!.setPaintProperty(layerId, 'line-color', '#3b82f6');
          map.current!.setPaintProperty(`${layerId}-glow`, 'line-color', '#3b82f6');
          map.current!.setPaintProperty(layerId, 'line-width', 3);
        }
      }
    });

    // Remove trails for vehicles no longer tracked
    trailSourcesAdded.current.forEach(vehicleId => {
      if (!trails.has(vehicleId)) {
        const sourceId = `trail-${vehicleId}`;
        const layerId = `trail-line-${vehicleId}`;
        
        if (map.current!.getLayer(layerId)) {
          map.current!.removeLayer(layerId);
        }
        if (map.current!.getLayer(`${layerId}-glow`)) {
          map.current!.removeLayer(`${layerId}-glow`);
        }
        if (map.current!.getSource(sourceId)) {
          map.current!.removeSource(sourceId);
        }
        trailSourcesAdded.current.delete(vehicleId);
      }
    });
  }, [trails, mapLoaded, showTrails, selectedVehicleId]);

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
