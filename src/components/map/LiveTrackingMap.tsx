import { useEffect, useRef, useState, useCallback } from 'react';
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
        
        // Use limit=5 to get multiple results and pick the most specific one
        // Priority: poi > address > neighborhood > locality > place
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&types=poi,address,neighborhood,locality,place&limit=5`
        );
        const data = await response.json();
        
        if (data.features && data.features.length > 0) {
          // Find the most specific address (prefer POI > address > neighborhood)
          const typePriority = ['poi', 'address', 'neighborhood', 'locality', 'place'];
          let bestFeature = data.features[0];
          
          for (const preferredType of typePriority) {
            const match = data.features.find((f: any) => 
              f.place_type && f.place_type.includes(preferredType)
            );
            if (match) {
              bestFeature = match;
              break;
            }
          }
          
          // Build detailed address from context
          const placeName = bestFeature.text || '';
          const context = bestFeature.context || [];
          
          // Extract neighborhood, locality, place from context
          const neighborhood = context.find((c: any) => c.id?.startsWith('neighborhood'))?.text || '';
          const locality = context.find((c: any) => c.id?.startsWith('locality'))?.text || '';
          const place = context.find((c: any) => c.id?.startsWith('place'))?.text || '';
          
          // Build readable address: "POI/Street, Neighborhood, Locality" 
          const parts = [placeName, neighborhood, locality].filter(p => p && p.trim());
          const address = parts.length > 0 
            ? parts.join(', ') 
            : place || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          
          setVehicleAddresses(prev => new Map(prev).set(vehicleId, address));
        }
      } catch (error) {
        console.error('Error fetching address:', error);
      }
      addressFetchTimeouts.current.delete(vehicleId);
    }, 500); // 500ms debounce

    addressFetchTimeouts.current.set(vehicleId, timeout);
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

        // Update marker appearance - recreate if status or overspeeding changed
        const el = existingMarker.getElement();
        const isSelected = vehicle.id === selectedVehicleId;
        const wasOverspeeding = el.dataset.overspeeding === 'true';
        const previousStatus = el.dataset.status;
        
        // Recreate marker if status or overspeeding state changed
        if (wasOverspeeding !== isOverspeeding || previousStatus !== vehicle.status) {
          existingMarker.remove();
          markers.current.delete(vehicle.id);
        } else {
          el.style.borderWidth = isSelected ? '4px' : '2px';
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
          isOverspeeding
        );
        el.dataset.overspeeding = isOverspeeding.toString();
        el.dataset.status = vehicle.status;

        const gpsStrength = vehicle.gps_signal_strength ?? 0;
        const gpsSignalLabel = gpsStrength >= 80 ? 'Strong' : gpsStrength >= 50 ? 'Moderate' : gpsStrength > 0 ? 'Weak' : 'No signal';
        const reportTime = vehicle.lastSeen ? new Date(vehicle.lastSeen).toLocaleString() : 'N/A';

        const createPopupHTML = (addr: string) => `
          <div class="vehicle-popup-content" style="min-width:280px;font-family:system-ui,-apple-system,sans-serif;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #e5e7eb;">
              <span style="font-weight:600;font-size:14px;">${vehicle.plate}</span>
              <span style="font-size:11px;padding:2px 8px;border-radius:9999px;background:${vehicle.status === 'moving' ? '#10b981' : vehicle.status === 'idle' ? '#f59e0b' : vehicle.status === 'stopped' ? '#6b7280' : '#ef4444'};color:white;">${vehicle.status}</span>
            </div>
            <div style="font-size:12px;color:#374151;margin-bottom:10px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                <span style="color:#6b7280;">Latitude & Longitude:</span>
              </div>
              <div style="font-weight:500;margin-bottom:8px;">${vehicle.lat.toFixed(6)}, ${vehicle.lng.toFixed(6)}</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 12px;">
                <div><span style="color:#6b7280;">ACC:</span> <span style="font-weight:500;">${vehicle.engine_on ? 'On' : 'Off'}</span></div>
                <div><span style="color:#6b7280;">Speed:</span> <span style="font-weight:500;">${vehicle.speed} km/h</span></div>
                <div><span style="color:#6b7280;">Fuel:</span> <span style="font-weight:500;">${vehicle.fuel}%</span></div>
                <div><span style="color:#6b7280;">GPS:</span> <span style="font-weight:500;">${gpsSignalLabel}</span></div>
              </div>
            </div>
            ${vehicle.driverName ? `<div style="font-size:12px;margin-bottom:6px;"><span style="color:#6b7280;">👤 Driver:</span> <span style="font-weight:500;">${vehicle.driverName}</span>${vehicle.driverPhone ? ` <span style="color:#6b7280;">(${vehicle.driverPhone})</span>` : ''}</div>` : '<div style="font-size:12px;color:#9ca3af;margin-bottom:6px;">No driver assigned</div>'}
            ${isOverspeeding ? `<div style="font-size:12px;color:#ef4444;font-weight:500;margin-bottom:6px;">⚠️ Overspeeding: ${vehicle.speed} km/h (limit: ${speedLimit})</div>` : ''}
            <div style="font-size:11px;color:#6b7280;margin-top:8px;padding-top:8px;border-top:1px solid #e5e7eb;">
              <div style="margin-bottom:4px;"><span>🕐 Report Time:</span> <span style="color:#374151;">${reportTime}</span></div>
              <div><span>📍 Address:</span> <span style="color:#374151;">${addr}</span></div>
            </div>
          </div>
        `;

        const popup = new mapboxgl.Popup({ offset: 25, closeButton: true, closeOnClick: false, className: 'vehicle-popup' })
          .setHTML(createPopupHTML(address));

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
          popup.setHTML(createPopupHTML(latestAddr));
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
            const gpsStrength = vehicle.gps_signal_strength ?? 0;
            const gpsSignalLabel = gpsStrength >= 80 ? 'Strong' : gpsStrength >= 50 ? 'Moderate' : gpsStrength > 0 ? 'Weak' : 'No signal';
            const reportTime = vehicle.lastSeen ? new Date(vehicle.lastSeen).toLocaleString() : 'N/A';
            const speedLimit = vehicle.speed_limit || 80;
            const isOverspeeding = vehicle.speed > speedLimit;
            
            popup.setHTML(`
              <div class="vehicle-popup-content" style="min-width:280px;font-family:system-ui,-apple-system,sans-serif;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #e5e7eb;">
                  <span style="font-weight:600;font-size:14px;">${vehicle.plate}</span>
                  <span style="font-size:11px;padding:2px 8px;border-radius:9999px;background:${vehicle.status === 'moving' ? '#10b981' : vehicle.status === 'idle' ? '#f59e0b' : vehicle.status === 'stopped' ? '#6b7280' : '#ef4444'};color:white;">${vehicle.status}</span>
                </div>
                <div style="font-size:12px;color:#374151;margin-bottom:10px;">
                  <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                    <span style="color:#6b7280;">Latitude & Longitude:</span>
                  </div>
                  <div style="font-weight:500;margin-bottom:8px;">${vehicle.lat.toFixed(6)}, ${vehicle.lng.toFixed(6)}</div>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 12px;">
                    <div><span style="color:#6b7280;">ACC:</span> <span style="font-weight:500;">${vehicle.engine_on ? 'On' : 'Off'}</span></div>
                    <div><span style="color:#6b7280;">Speed:</span> <span style="font-weight:500;">${vehicle.speed} km/h</span></div>
                    <div><span style="color:#6b7280;">Fuel:</span> <span style="font-weight:500;">${vehicle.fuel}%</span></div>
                    <div><span style="color:#6b7280;">GPS:</span> <span style="font-weight:500;">${gpsSignalLabel}</span></div>
                  </div>
                </div>
                ${vehicle.driverName ? `<div style="font-size:12px;margin-bottom:6px;"><span style="color:#6b7280;">👤 Driver:</span> <span style="font-weight:500;">${vehicle.driverName}</span>${vehicle.driverPhone ? ` <span style="color:#6b7280;">(${vehicle.driverPhone})</span>` : ''}</div>` : '<div style="font-size:12px;color:#9ca3af;margin-bottom:6px;">No driver assigned</div>'}
                ${isOverspeeding ? `<div style="font-size:12px;color:#ef4444;font-weight:500;margin-bottom:6px;">⚠️ Overspeeding: ${vehicle.speed} km/h (limit: ${speedLimit})</div>` : ''}
                <div style="font-size:11px;color:#6b7280;margin-top:8px;padding-top:8px;border-top:1px solid #e5e7eb;">
                  <div style="margin-bottom:4px;"><span>🕐 Report Time:</span> <span style="color:#374151;">${reportTime}</span></div>
                  <div><span>📍 Address:</span> <span style="color:#374151;">${latestAddr}</span></div>
                </div>
              </div>
            `);
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
  }, [vehicles, mapLoaded, selectedVehicleId, onVehicleClick, vehicleAddresses]);

  // Helper to generate popup HTML - moved outside useEffect for reuse
  const generatePopupHTML = useCallback((addr: string, v: Vehicle) => {
    const gpsStrength = v.gps_signal_strength ?? 0;
    const gpsSignalLabel = gpsStrength >= 80 ? 'Strong' : gpsStrength >= 50 ? 'Moderate' : gpsStrength > 0 ? 'Weak' : 'No signal';
    const reportTime = v.lastSeen ? new Date(v.lastSeen).toLocaleString() : 'N/A';
    const speedLimit = v.speed_limit || 80;
    const isOverspeeding = v.speed > speedLimit;
    
    return `
      <div class="vehicle-popup-content" style="min-width:280px;font-family:system-ui,-apple-system,sans-serif;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #e5e7eb;">
          <span style="font-weight:600;font-size:14px;">${v.plate}</span>
          <span style="font-size:11px;padding:2px 8px;border-radius:9999px;background:${v.status === 'moving' ? '#10b981' : v.status === 'idle' ? '#f59e0b' : v.status === 'stopped' ? '#6b7280' : '#ef4444'};color:white;">${v.status}</span>
        </div>
        <div style="font-size:12px;color:#374151;margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
            <span style="color:#6b7280;">Latitude & Longitude:</span>
          </div>
          <div style="font-weight:500;margin-bottom:8px;">${v.lat.toFixed(6)}, ${v.lng.toFixed(6)}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 12px;">
            <div><span style="color:#6b7280;">ACC:</span> <span style="font-weight:500;">${v.engine_on ? 'On' : 'Off'}</span></div>
            <div><span style="color:#6b7280;">Speed:</span> <span style="font-weight:500;">${v.speed} km/h</span></div>
            <div><span style="color:#6b7280;">Fuel:</span> <span style="font-weight:500;">${v.fuel}%</span></div>
            <div><span style="color:#6b7280;">GPS:</span> <span style="font-weight:500;">${gpsSignalLabel}</span></div>
          </div>
        </div>
        ${v.driverName ? `<div style="font-size:12px;margin-bottom:6px;"><span style="color:#6b7280;">👤 Driver:</span> <span style="font-weight:500;">${v.driverName}</span>${v.driverPhone ? ` <span style="color:#6b7280;">(${v.driverPhone})</span>` : ''}</div>` : '<div style="font-size:12px;color:#9ca3af;margin-bottom:6px;">No driver assigned</div>'}
        ${isOverspeeding ? `<div style="font-size:12px;color:#ef4444;font-weight:500;margin-bottom:6px;">⚠️ Overspeeding: ${v.speed} km/h (limit: ${speedLimit})</div>` : ''}
        <div style="font-size:11px;color:#6b7280;margin-top:8px;padding-top:8px;border-top:1px solid #e5e7eb;">
          <div style="margin-bottom:4px;"><span>🕐 Report Time:</span> <span style="color:#374151;">${reportTime}</span></div>
          <div><span>📍 Address:</span> <span style="color:#374151;">${addr}</span></div>
        </div>
      </div>
    `;
  }, []);

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

  // Draw vehicle trails on the map
  useEffect(() => {
    if (!map.current || !mapLoaded || !showTrails) return;

    trails.forEach((points, vehicleId) => {
      if (points.length < 2) return;

      const sourceId = `trail-${vehicleId}`;
      const layerId = `trail-line-${vehicleId}`;
      const coordinates = points.map(p => [p.lng, p.lat] as [number, number]);

      const geojsonData: GeoJSON.Feature<GeoJSON.LineString> = {
        type: 'Feature',
        properties: { vehicleId },
        geometry: {
          type: 'LineString',
          coordinates,
        },
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
            'line-color': vehicleId === selectedVehicleId ? '#22c55e' : '#3b82f6',
            'line-width': 8,
            'line-opacity': 0.3,
            'line-blur': 3,
          },
        });

        // Add main trail line
        map.current!.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': vehicleId === selectedVehicleId ? '#22c55e' : '#3b82f6',
            'line-width': 3,
            'line-opacity': 0.9,
          },
        });

        trailSourcesAdded.current.add(vehicleId);
      }

      // Update colors based on selection
      if (map.current!.getLayer(layerId)) {
        const color = vehicleId === selectedVehicleId ? '#22c55e' : '#3b82f6';
        map.current!.setPaintProperty(layerId, 'line-color', color);
        map.current!.setPaintProperty(`${layerId}-glow`, 'line-color', color);
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
