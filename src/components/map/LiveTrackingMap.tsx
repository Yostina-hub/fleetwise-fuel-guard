import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useLematApiKey } from "@/hooks/useLematApiKey";
import { createLematTransformRequest, fetchLematMapStyle, getPreviewSafeMapStyle } from "@/lib/lemat";
import { getActiveProvider, getProviderStyle } from "@/lib/mapProviders";
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
  mapStyle?: 'streets' | 'satellite' | 'dark';
  onMapReady?: (map: maplibregl.Map) => void;
  showTrails?: boolean;
  trails?: Map<string, TrailPoint[]>;
  openPopupVehicleId?: string | null;
  onPopupOpened?: () => void;
  onTripReplay?: (vehicleId: string, plate: string) => void;
  onManageAsset?: (vehicleId: string, plate: string) => void;
  disablePopups?: boolean;
  autoLocate?: boolean;
}

const LiveTrackingMap = ({ 
  vehicles, 
  onVehicleClick, 
  selectedVehicleId, 
  token, 
  mapStyle = 'streets', 
  onMapReady,
  showTrails = true,
  trails = new Map(),
  openPopupVehicleId,
  onPopupOpened,
  onTripReplay,
  onManageAsset,
  disablePopups = false,
  autoLocate = true
}: LiveTrackingMapProps) => {
const { organizationId } = useOrganization();
const { apiKey: lematApiKey, ready: lematKeyReady } = useLematApiKey();
const mapContainer = useRef<HTMLDivElement>(null);
const map = useRef<maplibregl.Map | null>(null);
const markers = useRef<Map<string, maplibregl.Marker>>(new Map());
const previousPositions = useRef<Map<string, { lng: number; lat: number }>>(new Map());
const resizeObserver = useRef<ResizeObserver | null>(null);
const addressFetchTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
const initialBoundsFitted = useRef(false);
const trailSourcesAdded = useRef<Set<string>>(new Set());
const trailAnimationMarkers = useRef<Map<string, maplibregl.Marker>>(new Map());
const trailAnimationFrames = useRef<Map<string, number>>(new Map());
const [mapLoaded, setMapLoaded] = useState(false);
const [tokenError, setTokenError] = useState<string | null>(null);
const [currentProvider, setCurrentProvider] = useState(getActiveProvider());
const fallbackTriedRef = useRef(false);
const retriedInvalidRef = useRef(false);
const [vehicleAddresses, setVehicleAddresses] = useState<Map<string, string>>(new Map());
const [vehicleRoadInfo, setVehicleRoadInfo] = useState<Map<string, { road: string; distance: number; direction: string }>>(new Map());

// Refs to avoid stale closures in marker click handlers
const vehiclesByIdRef = useRef<Map<string, Vehicle>>(new Map());
const vehicleAddressesRef = useRef<Map<string, string>>(new Map());
const vehicleRoadInfoRef = useRef<Map<string, { road: string; distance: number; direction: string }>>(new Map());

// HTML-escape helper to prevent XSS injection in popup templates
const escapeHtml = useCallback((str: string): string => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}, []);

useEffect(() => {
  vehiclesByIdRef.current = new Map(vehicles.map(v => [v.id, v]));
}, [vehicles]);

useEffect(() => {
  vehicleAddressesRef.current = vehicleAddresses;
}, [vehicleAddresses]);

useEffect(() => {
  vehicleRoadInfoRef.current = vehicleRoadInfo;
}, [vehicleRoadInfo]);

// Listen for provider changes from MapProviderSettings
useEffect(() => {
  const handler = () => {
    const newProvider = getActiveProvider();
    setCurrentProvider(newProvider);
  };
  window.addEventListener('map-provider-changed', handler);
  return () => window.removeEventListener('map-provider-changed', handler);
}, []);

// Inject marker animations on mount
useEffect(() => {
  injectMarkerAnimations();
}, []);

// Listen for popup action events (Trip Replay, Manage Asset)
useEffect(() => {
  const handleTripReplay = (e: CustomEvent<{ vehicleId: string; plate: string }>) => {
    if (onTripReplay) {
      onTripReplay(e.detail.vehicleId, e.detail.plate);
    }
  };

  const handleManageAsset = (e: CustomEvent<{ vehicleId: string; plate: string }>) => {
    if (onManageAsset) {
      onManageAsset(e.detail.vehicleId, e.detail.plate);
    }
  };

  window.addEventListener('openTripReplay', handleTripReplay as EventListener);
  window.addEventListener('manageAsset', handleManageAsset as EventListener);

  return () => {
    window.removeEventListener('openTripReplay', handleTripReplay as EventListener);
    window.removeEventListener('manageAsset', handleManageAsset as EventListener);
  };
}, [onTripReplay, onManageAsset]);

  // Initialize map — don't block on API key (tiles are public, key is only for data endpoints)
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const initMap = async () => {
      if (!mapContainer.current || map.current) return;

      try {
        const activeProvider = getActiveProvider();
        const initialStyle = await getProviderStyle(activeProvider, mapStyle);

        if (!mapContainer.current || map.current) return;

        map.current = new maplibregl.Map({
          container: mapContainer.current,
          style: initialStyle,
          center: [38.75, 9.02],
          zoom: 12,
          transformRequest: createLematTransformRequest(lematApiKey),
        });

        map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

        // Center on user's current location if available
        if (autoLocate && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              if (map.current) {
                map.current.flyTo({
                  center: [position.coords.longitude, position.coords.latitude],
                  zoom: 13,
                  duration: 1500,
                });
              }
            },
            () => { /* geolocation denied or unavailable, keep default center */ },
            { enableHighAccuracy: true, timeout: 5000 }
          );
        }

        map.current.on('load', () => {
          fallbackTriedRef.current = false;
          setTokenError(null);
          setMapLoaded(true);
          try {
            onMapReady?.(map.current!);
          } catch {}
          try {
            if (mapContainer.current) {
              resizeObserver.current = new ResizeObserver(() => {
                try {
                  map.current?.resize();
                } catch {}
              });
              resizeObserver.current.observe(mapContainer.current);
            }
          } catch {}
        });

        map.current.on('style.load', () => {
          setTokenError(null);
          setMapLoaded(true);
        });

        map.current.on('error', (event) => {
          const failedUrl = (event?.error as { url?: string } | undefined)?.url || '';
          const isStyleFailure = failedUrl.includes('/tiles/style') || failedUrl.includes('/tiles/');

          if (isStyleFailure && !fallbackTriedRef.current) {
            fallbackTriedRef.current = true;
            setMapLoaded(false);
            getProviderStyle(getActiveProvider(), mapStyle).then((s) => {
              try { map.current?.setStyle(s); } catch {}
            }).catch(() => {});
            return;
          }

          if (isStyleFailure && fallbackTriedRef.current) {
            setTokenError('style');
          }
        });
      } catch (e) {
        console.error('Map initialization failed:', e);
        setTokenError('webgl');
        try {
          map.current?.remove();
        } catch {}
        map.current = null;
      }
    };

    initMap();

    return () => {
      try {
        try { resizeObserver.current?.disconnect(); } catch {}
        resizeObserver.current = null;

        // Clear all pending address fetch timeouts to prevent memory leaks
        addressFetchTimeouts.current.forEach((timeout) => clearTimeout(timeout));
        addressFetchTimeouts.current.clear();

        trailAnimationFrames.current.forEach((frameId) => cancelAnimationFrame(frameId));
        trailAnimationFrames.current.clear();
        trailAnimationMarkers.current.forEach((marker) => marker.remove());
        trailAnimationMarkers.current.clear();

        markers.current.forEach(marker => marker.remove());
        markers.current.clear();
        map.current?.remove();
        map.current = null;
      } catch (e) {
        console.warn('Map cleanup error (ignored):', e);
        map.current = null;
      }
    };
  }, [mapStyle, onMapReady, currentProvider, autoLocate]);

  // Track previous style to only react to actual user-driven changes
  const prevMapStyleRef = useRef(mapStyle);
  useEffect(() => {
    if (!map.current) return;
    // Skip if mapStyle hasn't changed from last applied value
    if (prevMapStyleRef.current === mapStyle) return;
    prevMapStyleRef.current = mapStyle;

    const applyStyle = async () => {
      if (!map.current) return;
      try {
        const activeProvider = getActiveProvider();
        const targetStyle = await getProviderStyle(activeProvider, mapStyle);
        setMapLoaded(false);
        setTokenError(null);
        // Clear trail source tracking so they get re-added after style loads
        trailSourcesAdded.current.clear();

        // Remove existing style.load listener to avoid stacking
        const onStyleLoad = () => {
          setMapLoaded(true);
        };
        map.current.once('style.load', onStyleLoad);
        map.current.setStyle(targetStyle);
      } catch (err) {
        console.error('Failed to apply map style:', err);
        // Force fallback
        try {
          const fallback = getPreviewSafeMapStyle(mapStyle);
          map.current?.setStyle(fallback);
        } catch {}
      }
    };

    // Wait for current style to finish loading before switching
    if (map.current.isStyleLoaded()) {
      applyStyle();
    } else {
      map.current.once('style.load', applyStyle);
    }
  }, [lematApiKey, mapStyle]);

  // Debounced address fetching to avoid API spam - gets detailed street-level address
  const fetchAddressDebounced = (lng: number, lat: number, vehicleId: string) => {
    // Clear existing timeout for this vehicle
    const existingTimeout = addressFetchTimeouts.current.get(vehicleId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Helper to calculate distance between two points in meters
    const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
      const R = 6371000; // Earth's radius in meters
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    // Helper to get direction from vehicle to road
    const getDirectionFromBearing = (bearing: number): string => {
      const directions = ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'];
      const index = Math.round(((bearing + 360) % 360) / 45) % 8;
      return directions[index];
    };

    // Calculate bearing between two points
    const calculateBearing = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const lat1Rad = lat1 * Math.PI / 180;
      const lat2Rad = lat2 * Math.PI / 180;
      const y = Math.sin(dLng) * Math.cos(lat2Rad);
      const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
      return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    };

    // Set new debounced fetch
    const timeout = setTimeout(async () => {
      try {
        // Validate coordinates before making API call
        if (!isFinite(lat) || !isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          console.warn('Invalid coordinates for geocoding:', { lat, lng });
          setVehicleAddresses(prev => new Map(prev).set(vehicleId, 'Location unavailable'));
          return;
        }

        // Use backend proxy for reverse geocoding (preview sandbox blocks direct external fetch)
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setVehicleAddresses(prev => new Map(prev).set(vehicleId, `${lat.toFixed(6)}, ${lng.toFixed(6)}`));
          return;
        }

        const proxyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lemat-reverse-geocode?lat=${lat.toFixed(6)}&lon=${lng.toFixed(6)}`;
        const res = await fetch(proxyUrl, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          }
        });
        if (!res.ok) {
          console.warn('Geocoding API error:', res.status);
          setVehicleAddresses(prev => new Map(prev).set(vehicleId, `${lat.toFixed(6)}, ${lng.toFixed(6)}`));
          return;
        }
        
        const json = await res.json();
        const features = json?.display_name ? [json] : [];

        if (features.length === 0) {
          // No features found - use place_name from first result if available
          setVehicleAddresses(prev => new Map(prev).set(vehicleId, `Near ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`));
          return;
        }

        // Lemat returns Nominatim-style: { display_name, address: { road, city, ... } }
        const result = features[0];
        const finalAddress = result.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        setVehicleAddresses(prev => new Map(prev).set(vehicleId, finalAddress));

        const addr = result.address || {};
        const roadName = addr.road || addr.pedestrian || addr.neighbourhood || 'Unknown Road';
        setVehicleRoadInfo(prev => new Map(prev).set(vehicleId, {
          road: roadName,
          distance: 0,
          direction: 'North'
        }));
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

  // Helper to get direction arrow SVG
  const getDirectionArrow = (direction: string): string => {
    const rotations: Record<string, number> = {
      'North': 0, 'Northeast': 45, 'East': 90, 'Southeast': 135,
      'South': 180, 'Southwest': 225, 'West': 270, 'Northwest': 315
    };
    const rotation = rotations[direction] || 0;
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(${rotation}deg);flex-shrink:0;"><path d="M12 19V5M5 12l7-7 7 7"/></svg>`;
  };

  // Helper to format distance
  const formatDistance = (meters: number): string => {
    if (meters < 1000) return `${meters}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  // Helper to generate popup HTML
  const generatePopupHTML = useCallback((addr: string, v: Vehicle, roadInfo?: { road: string; distance: number; direction: string }) => {
    const safePlate = escapeHtml(v.plate);
    const safeAddr = escapeHtml(addr);
    const safeDriverName = v.driverName ? escapeHtml(v.driverName) : '';
    const safeDriverPhone = v.driverPhone ? escapeHtml(v.driverPhone) : '';
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
        <div class="vehicle-popup-drag-handle" title="Drag to move popup">
          <div class="vehicle-popup-drag-grip"></div>
          <span style="font-size:9px;color:#9ca3af;margin-left:8px;pointer-events:none;">Drag to move</span>
        </div>
        <!-- Header with plate, status, and timestamp -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #e5e7eb;">
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
              <span style="font-weight:700;font-size:18px;color:#111827;">${safePlate}</span>
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
          ${safeDriverName ? `
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div style="display:flex;align-items:center;gap:8px;">
                <div style="width:32px;height:32px;background:linear-gradient(135deg, #8DC63F 0%, #6ba02f 100%);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:600;font-size:13px;">
                  ${safeDriverName.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <div>
                  <div style="font-weight:600;font-size:14px;color:#111827;">${safeDriverName}</div>
                  ${safeDriverPhone ? `<div style="color:#6b7280;font-size:12px;">📞 ${safeDriverPhone}</div>` : ''}
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
        <div style="background:linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);border-radius:10px;padding:12px;margin-bottom:12px;border:1px solid #bbf7d0;">
          <div style="display:flex;align-items:flex-start;gap:8px;">
            <span style="font-size:16px;">📍</span>
            <div style="flex:1;">
              <div style="font-size:10px;color:#166534;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Current Location</div>
              <div style="font-size:13px;color:#166534;line-height:1.5;font-weight:500;">${safeAddr}</div>
            </div>
          </div>
        </div>

        <!-- Road proximity info with direction arrow - Always show when roadInfo exists -->
        ${roadInfo ? `
          <div style="background:linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);border-radius:10px;padding:12px;border:1px solid #93c5fd;">
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;background:white;border-radius:8px;border:1px solid #bfdbfe;">
                ${getDirectionArrow(roadInfo.direction)}
              </div>
              <div style="flex:1;">
                <div style="font-size:10px;color:#1d4ed8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Distance from Reference</div>
                <div style="font-size:14px;color:#1e40af;font-weight:600;line-height:1.4;">
                  ${roadInfo.distance < 10 ? 'At' : formatDistance(roadInfo.distance) + ' ' + roadInfo.direction + ' of'} 
                  <span style="color:#3b82f6;">${roadInfo.road}</span>
                </div>
              </div>
              <div style="display:flex;flex-direction:column;align-items:center;padding:8px 12px;background:white;border-radius:8px;border:1px solid #bfdbfe;min-width:60px;">
                <div style="font-size:16px;font-weight:700;color:#1d4ed8;">${roadInfo.distance < 10 ? '0' : formatDistance(roadInfo.distance)}</div>
                <div style="font-size:9px;color:#6b7280;font-weight:500;">away</div>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Quick Actions Toolbar -->
        <div style="display:flex;justify-content:center;gap:8px;margin-top:14px;padding-top:14px;border-top:1px solid #e5e7eb;">
          <button 
            onclick="window.dispatchEvent(new CustomEvent('openStreetView', { detail: { lat: ${v.lat}, lng: ${v.lng}, plate: '${safePlate}' } }))"
            style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 14px;background:linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);border:1px solid #e5e7eb;border-radius:10px;cursor:pointer;transition:all 0.2s;"
            onmouseover="this.style.background='linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)';this.style.borderColor='#93c5fd'"
            onmouseout="this.style.background='linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)';this.style.borderColor='#e5e7eb'"
            title="Street View"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="10" r="3"/>
              <path d="M12 2a8 8 0 0 0-8 8c0 1.892.402 3.13 1.5 4.5L12 22l6.5-7.5c1.098-1.37 1.5-2.608 1.5-4.5a8 8 0 0 0-8-8z"/>
            </svg>
            <span style="font-size:10px;color:#374151;font-weight:500;">Street View</span>
          </button>
          <button 
            onclick="window.dispatchEvent(new CustomEvent('openDirections', { detail: { lat: ${v.lat}, lng: ${v.lng}, plate: '${safePlate}' } }))"
            style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 14px;background:linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);border:1px solid #e5e7eb;border-radius:10px;cursor:pointer;transition:all 0.2s;"
            onmouseover="this.style.background='linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)';this.style.borderColor='#86efac'"
            onmouseout="this.style.background='linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)';this.style.borderColor='#e5e7eb'"
            title="Get Directions"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m3 11 18-5v12L3 14v-3z"/>
              <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
            </svg>
            <span style="font-size:10px;color:#374151;font-weight:500;">Directions</span>
          </button>
          <button 
            onclick="window.dispatchEvent(new CustomEvent('openTripReplay', { detail: { vehicleId: '${v.id}', plate: '${safePlate}' } }))"
            style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 14px;background:linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);border:1px solid #e5e7eb;border-radius:10px;cursor:pointer;transition:all 0.2s;"
            onmouseover="this.style.background='linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)';this.style.borderColor='#d8b4fe'"
            onmouseout="this.style.background='linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)';this.style.borderColor='#e5e7eb'"
            title="Trip Replay"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            <span style="font-size:10px;color:#374151;font-weight:500;">Trip Replay</span>
          </button>
          <button 
            onclick="window.dispatchEvent(new CustomEvent('manageAsset', { detail: { vehicleId: '${v.id}', plate: '${safePlate}' } }))"
            style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 14px;background:linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);border:1px solid #e5e7eb;border-radius:10px;cursor:pointer;transition:all 0.2s;"
            onmouseover="this.style.background='linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)';this.style.borderColor='#fdba74'"
            onmouseout="this.style.background='linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)';this.style.borderColor='#e5e7eb'"
            title="Manage Asset"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            <span style="font-size:10px;color:#374151;font-weight:500;">Manage</span>
          </button>
        </div>
      </div>
    `;
  }, [escapeHtml]);

  // Keep popup "up / centered" by moving the marker slightly below center before opening.
  const focusMapForPopup = useCallback((vehicleLngLat: [number, number]) => {
    if (!map.current) return;
    const container = map.current.getContainer();
    const height = container.clientHeight || 0;

    // Push the marker down a bit so the popup (anchored above) sits closer to center.
    const offsetY = Math.round(Math.min(height * 0.22, 180));
    map.current.easeTo({
      center: vehicleLngLat,
      offset: [0, offsetY],
      duration: 350,
      essential: true,
    });
  }, []);

  const ensurePopupInView = useCallback((popup: maplibregl.Popup) => {
    if (!map.current) return;

    const popupEl = popup.getElement();
    const mapEl = map.current.getContainer();
    if (!popupEl || !mapEl) return;

    requestAnimationFrame(() => {
      const popupRect = popupEl.getBoundingClientRect();
      const mapRect = mapEl.getBoundingClientRect();
      const padding = 16;

      const leftOverflow = mapRect.left + padding - popupRect.left;
      const rightOverflow = popupRect.right - (mapRect.right - padding);
      const topOverflow = mapRect.top + padding - popupRect.top;
      const bottomOverflow = popupRect.bottom - (mapRect.bottom - padding);

      const dx = leftOverflow > 0 ? leftOverflow : rightOverflow > 0 ? -rightOverflow : 0;
      const dy = topOverflow > 0 ? topOverflow : bottomOverflow > 0 ? -bottomOverflow : 0;

      if (dx !== 0 || dy !== 0) {
        map.current?.panBy([dx, dy], { duration: 250 });
      }
    });
  }, []);

  const enhancePopup = useCallback(
    (popup: maplibregl.Popup) => {
      if (!map.current) return;

      const popupEl = popup.getElement();
      if (!popupEl) return;

      const content = popupEl.querySelector('.maplibregl-popup-content') as HTMLElement | null;
      if (content && content.dataset.scrollBound !== '1') {
        content.dataset.scrollBound = '1';

        // Ensure wheel/touch scroll stays inside popup (doesn't zoom/pan map).
        content.addEventListener('wheel', (e) => e.stopPropagation(), { capture: true });
        content.addEventListener('touchmove', (e) => e.stopPropagation(), { capture: true, passive: true });

        content.addEventListener('mouseenter', () => map.current?.scrollZoom.disable());
        content.addEventListener('mouseleave', () => map.current?.scrollZoom.enable());
        content.addEventListener('touchstart', () => map.current?.scrollZoom.disable(), { passive: true });
        content.addEventListener('touchend', () => map.current?.scrollZoom.enable(), { passive: true });
      }

      const handle = popupEl.querySelector('.vehicle-popup-drag-handle') as HTMLElement | null;
      if (handle && handle.dataset.dragBound !== '1') {
        handle.dataset.dragBound = '1';

        handle.addEventListener('pointerdown', (e) => {
          if (!map.current) return;
          e.preventDefault();
          e.stopPropagation();

          const startClientX = e.clientX;
          const startClientY = e.clientY;
          const startLngLat = popup.getLngLat();
          const startPoint = map.current.project(startLngLat);

          map.current.dragPan.disable();
          map.current.scrollZoom.disable();

          const move = (ev: PointerEvent) => {
            if (!map.current) return;
            const dx = ev.clientX - startClientX;
            const dy = ev.clientY - startClientY;
            popup.setLngLat(map.current.unproject([startPoint.x + dx, startPoint.y + dy]));
          };

          const up = () => {
            document.removeEventListener('pointermove', move);
            document.removeEventListener('pointerup', up);
            document.removeEventListener('pointercancel', up);
            map.current?.dragPan.enable();
            map.current?.scrollZoom.enable();
            requestAnimationFrame(() => ensurePopupInView(popup));
          };

          document.addEventListener('pointermove', move);
          document.addEventListener('pointerup', up);
          document.addEventListener('pointercancel', up);
        });
      }
    },
    [ensurePopupInView]
  );

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
      // Get previous position to check if it changed significantly
      const prevPos = previousPositions.current.get(vehicle.id);
      const positionChanged = prevPos && (
        Math.abs(prevPos.lng - vehicle.lng) > 0.0001 || 
        Math.abs(prevPos.lat - vehicle.lat) > 0.0001
      );
      
      // For SUMO / simulated vehicles, prefer the provided road/address context
      const hasProvidedAddress = typeof vehicle.address === 'string' && vehicle.address.trim().length > 0;
      if (!hasProvidedAddress && (!vehicleAddressesRef.current.has(vehicle.id) || positionChanged)) {
        fetchAddressDebounced(vehicle.lng, vehicle.lat, vehicle.id);
      }
      
      const address = vehicleAddressesRef.current.get(vehicle.id) || vehicle.address || `Locating... (${vehicle.lat.toFixed(4)}, ${vehicle.lng.toFixed(4)})`;
      const existingMarker = markers.current.get(vehicle.id);
      const previousPos = previousPositions.current.get(vehicle.id);
      
      // Check if vehicle is overspeeding (speed > limit, default 80 km/h if no limit set)
      const speedLimit = vehicle.speed_limit || 80;
      const isOverspeeding = vehicle.speed > speedLimit;

      if (existingMarker && previousPos) {
        const hasPositionChanged = 
          Math.abs(previousPos.lng - vehicle.lng) > 0.00001 || 
          Math.abs(previousPos.lat - vehicle.lat) > 0.00001;
        const isSumoVehicle = vehicle.id.startsWith('sumo_v_');

        if (hasPositionChanged) {
          if (isSumoVehicle) {
            existingMarker.setLngLat([vehicle.lng, vehicle.lat]);
          } else {
            animatePosition(
              existingMarker,
              previousPos.lng,
              previousPos.lat,
              vehicle.lng,
              vehicle.lat,
              1200
            );
          }
        }

        // Update marker appearance - recreate if status, overspeeding, or speed changed significantly
        const el = existingMarker.getElement();
        const isSelected = vehicle.id === selectedVehicleId;
        const wasOverspeeding = el.dataset.overspeeding === 'true';
        const previousStatus = el.dataset.status;
        const previousSpeed = parseFloat(el.dataset.speed || '0');
        const previousHeading = parseFloat(el.dataset.heading || '0');
        const speedChanged = Math.abs(previousSpeed - vehicle.speed) >= 5; // Recreate if speed changed by 5+ km/h
        const currentHeading = vehicle.heading || 0;
        
        // Update heading rotation in real-time for smooth direction changes
        // IMPORTANT: rotate the inner `.marker-body`, never the root marker element.
        if (Math.abs(previousHeading - currentHeading) > 2) {
          const body = el.querySelector('.marker-body') as HTMLElement | null;
          if (body) {
            body.style.transition = 'transform 0.5s ease-out';
            body.style.transform = `rotate(${currentHeading}deg)${isSelected ? ' scale(1.15)' : ''}`;
          }
          el.dataset.heading = currentHeading.toString();
        }
        
        // Only recreate marker if critical visual state changed (not selection)
        // Preserve popup open state by not recreating unnecessarily
        const popupOpen = existingMarker.getPopup()?.isOpen();
        
        if (wasOverspeeding !== isOverspeeding || previousStatus !== vehicle.status || speedChanged) {
          // Only delete if popup is closed to avoid jarring UX
          if (!popupOpen) {
            existingMarker.remove();
            markers.current.delete(vehicle.id);
          } else {
            // Just update the data attributes for next check
            el.dataset.overspeeding = isOverspeeding.toString();
            el.dataset.status = vehicle.status;
            el.dataset.speed = vehicle.speed.toString();
          }
        }
        
        // Update selection styling without recreating
        const body = el.querySelector('.marker-body') as HTMLElement | null;
        if (body) {
          body.style.borderWidth = isSelected ? '3px' : '2.5px';
          body.style.transform = `rotate(${currentHeading}deg)${isSelected ? ' scale(1.15)' : ''}`;
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
          vehicle.speed,
          vehicle.plate
        );
        el.dataset.overspeeding = isOverspeeding.toString();
        el.dataset.status = vehicle.status;
        el.dataset.speed = vehicle.speed.toString();
        el.dataset.heading = (vehicle.heading || 0).toString();

        const marker = new maplibregl.Marker({
          element: el,
          anchor: 'center',
        })
          .setLngLat([vehicle.lng, vehicle.lat])
          .addTo(map.current!);

        // Store vehicle ID for reference
        (marker as any)._vehicleId = vehicle.id;

        // Create hover popup with vehicle info
        const popup = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: [0, -30],
          className: 'vehicle-hover-popup',
          maxWidth: '280px',
          anchor: 'bottom'
        });

        let hideTimeout: ReturnType<typeof setTimeout> | null = null;
        let isHoveringPopup = false;
        let isHoveringMarker = false;

        // Keep popup positioned on the vehicle during zoom/pan
        const updatePopupPosition = () => {
          if (!popup.isOpen()) return;
          const vNow = vehiclesByIdRef.current.get(vehicle.id);
          if (vNow) popup.setLngLat([vNow.lng, vNow.lat]);
        };

        const showPopup = () => {
          isHoveringMarker = true;
          if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
          }

          const vNow = vehiclesByIdRef.current.get(vehicle.id) ?? vehicle;

          // Guard: invalid coords make Mapbox position popups at (0,0) (top-left)
          const lng = vNow.lng;
          const lat = vNow.lat;
          const validCoords = Number.isFinite(lng) && Number.isFinite(lat) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
          if (!validCoords) {
            popup.remove();
            return;
          }

          const statusLabel = vNow.status.charAt(0).toUpperCase() + vNow.status.slice(1);
          const statusClass = `popup-status-${vNow.status}`;
          const currentAddress = vehicleAddressesRef.current.get(vNow.id) || vNow.address || 'Locating...';
          const driverName = vNow.driverName || 'No driver assigned';
          const speedInfo = vNow.speed > 0 ? `${Math.round(vNow.speed)} km/h` : 'Stationary';
          const isOverspeed = vNow.speed > (vNow.speed_limit || 80);

          popup
            .setLngLat([lng, lat])
            .setHTML(`
              <div class="vehicle-popup-content" data-vehicle-id="${vNow.id}">
                <div class="popup-header">
                  <span class="popup-plate">${vNow.plate}</span>
                  <span class="popup-status ${statusClass}">${statusLabel}</span>
                </div>
                <div class="popup-driver">
                  <span class="popup-driver-icon">👤</span>
                  <span>${driverName}</span>
                </div>
                <div class="popup-stats">
                  <div class="popup-stat">
                    <span class="popup-stat-value" style="${isOverspeed ? 'color: #dc2626;' : ''}">${speedInfo}</span>
                    <span class="popup-stat-label">Speed</span>
                  </div>
                  ${vNow.engine_on !== undefined ? `
                  <div class="popup-stat">
                    <span class="popup-stat-value">${vNow.engine_on ? '🟢 On' : '🔴 Off'}</span>
                    <span class="popup-stat-label">Engine</span>
                  </div>
                  ` : ''}
                </div>
                <div class="popup-address">📍 ${currentAddress}</div>
                <div class="popup-action-hint">
                  <button class="popup-view-btn" data-vehicle-id="${vNow.id}">View Details →</button>
                </div>
              </div>
            `)
            .addTo(map.current!);

          // Track zoom/pan to keep popup anchored to vehicle
          map.current?.on('move', updatePopupPosition);

          // Bind popup listeners ONCE (avoid stacking handlers on repeated hover)
          const popupEl = popup.getElement() as (HTMLElement & { __lovBound?: boolean }) | null;
          if (popupEl && !popupEl.__lovBound) {
            popupEl.__lovBound = true;

            popupEl.addEventListener('mouseenter', () => {
              isHoveringPopup = true;
              if (hideTimeout) {
                clearTimeout(hideTimeout);
                hideTimeout = null;
              }
            });

            popupEl.addEventListener('mouseleave', () => {
              isHoveringPopup = false;
              scheduleHide();
            });

            popupEl.addEventListener('click', (e) => {
              const target = e.target as HTMLElement | null;
              const btn = target?.closest?.('.popup-view-btn') as HTMLElement | null;
              if (!btn) return;

              e.stopPropagation();
              popup.remove();

              const vid = btn.getAttribute('data-vehicle-id') || vehicle.id;
              const v = vehiclesByIdRef.current.get(vid) ?? vNow;

              // Exact location
              map.current?.flyTo({
                center: [v.lng, v.lat],
                zoom: 18,
                duration: 1000,
                pitch: 45,
              });

              onVehicleClick?.(v);
            });
          }
        };

        const scheduleHide = () => {
          if (hideTimeout) clearTimeout(hideTimeout);
          hideTimeout = setTimeout(() => {
            if (!isHoveringPopup && !isHoveringMarker) {
              popup.remove();
              map.current?.off('move', updatePopupPosition);
            }
          }, 300);
        };

        // Hover to show info popup
        el.addEventListener('mouseenter', showPopup);

        el.addEventListener('mouseleave', () => {
          isHoveringMarker = false;
          scheduleHide();
        });

        // Click to zoom in and show details
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          if (hideTimeout) clearTimeout(hideTimeout);
          popup.remove();

          const vNow = vehiclesByIdRef.current.get(vehicle.id) ?? vehicle;

          // Fly to vehicle position with higher zoom for exact location
          map.current?.flyTo({
            center: [vNow.lng, vNow.lat],
            zoom: 18, // Higher zoom for exact location
            duration: 1000,
            pitch: 45, // Add perspective for better view
          });

          onVehicleClick?.(vNow);
        });

        markers.current.set(vehicle.id, marker);
      }

      // Store current position for next animation
      previousPositions.current.set(vehicle.id, { lng: vehicle.lng, lat: vehicle.lat });
    });

    // Auto-fit bounds only on initial load (never fight user zoom/pan)
    if (vehicles.length > 0 && !initialBoundsFitted.current) {
      const bounds = new maplibregl.LngLatBounds();
      vehicles.forEach(v => bounds.extend([v.lng, v.lat]));
      map.current!.fitBounds(bounds, { padding: 50, maxZoom: 15 });
      initialBoundsFitted.current = true;
    }
  }, [vehicles, mapLoaded, selectedVehicleId, onVehicleClick, generatePopupHTML]);

  // Fly to selected vehicle ONLY when selection changes (not on every data tick)
  const prevSelectedRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    if (selectedVehicleId === prevSelectedRef.current) return;
    prevSelectedRef.current = selectedVehicleId;
    if (!selectedVehicleId) return;

    const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
    if (selectedVehicle) {
      map.current.flyTo({
        center: [selectedVehicle.lng, selectedVehicle.lat],
        zoom: 15,
        duration: 1500,
        essential: true,
      });
    }
  }, [selectedVehicleId, mapLoaded]);

  // Draw vehicle trails on the map with speed-based coloring
  useEffect(() => {
    if (!map.current || !mapLoaded || !map.current.isStyleLoaded()) return;

    // If trails are disabled, remove all existing trail layers
    if (!showTrails) {
      trailSourcesAdded.current.forEach(vehicleId => {
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
      });
      trailSourcesAdded.current.clear();
      return;
    }

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
      const source = map.current!.getSource(sourceId) as maplibregl.GeoJSONSource;
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

  // Animate a car icon along the trail (selected vehicle, or the only trail)
  useEffect(() => {
    if (!map.current || !mapLoaded || !showTrails) {
      trailAnimationMarkers.current.forEach((marker) => marker.remove());
      trailAnimationMarkers.current.clear();
      trailAnimationFrames.current.forEach((frameId) => cancelAnimationFrame(frameId));
      trailAnimationFrames.current.clear();
      return;
    }

    const activeVehicleId = selectedVehicleId ?? (trails.size === 1 ? Array.from(trails.keys())[0] : undefined);
    if (!activeVehicleId) {
      trailAnimationMarkers.current.forEach((marker) => marker.remove());
      trailAnimationMarkers.current.clear();
      trailAnimationFrames.current.forEach((frameId) => cancelAnimationFrame(frameId));
      trailAnimationFrames.current.clear();
      return;
    }

    const rawPoints = trails.get(activeVehicleId) || [];
    const points = rawPoints.filter(
      (p) => Number.isFinite(p.lat) && Number.isFinite(p.lng),
    );
    if (points.length < 2) return;

    const createCarElement = (): HTMLDivElement => {
      const el = document.createElement('div');
      el.className = 'trail-car-marker';
      el.innerHTML = `
        <div class="trail-car" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
          </svg>
        </div>
      `;
      return el;
    };

    // Build segments (simple, stable on short distances)
    const segments: { start: TrailPoint; end: TrailPoint; distance: number }[] = [];
    let totalDistance = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i];
      const end = points[i + 1];
      const dx = end.lng - start.lng;
      const dy = end.lat - start.lat;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (!Number.isFinite(distance) || distance <= 0) continue;
      segments.push({ start, end, distance });
      totalDistance += distance;
    }
    if (segments.length === 0 || totalDistance === 0) return;

    let marker = trailAnimationMarkers.current.get(activeVehicleId);
    if (!marker) {
      marker = new maplibregl.Marker({ element: createCarElement(), anchor: 'center' })
        .setLngLat([points[0].lng, points[0].lat])
        .addTo(map.current!);
      trailAnimationMarkers.current.set(activeVehicleId, marker);
    }

    // Remove any other car markers/animations (only one active)
    trailAnimationMarkers.current.forEach((m, id) => {
      if (id !== activeVehicleId) {
        m.remove();
        trailAnimationMarkers.current.delete(id);
      }
    });
    trailAnimationFrames.current.forEach((frameId, id) => {
      if (id !== activeVehicleId) {
        cancelAnimationFrame(frameId);
        trailAnimationFrames.current.delete(id);
      }
    });

    const duration = Math.min(12000, Math.max(6000, points.length * 120));
    let startTime: number | null = null;

    const animate = (t: number) => {
      // Skip animation when tab is hidden to save CPU
      if (document.hidden) {
        const frameId = requestAnimationFrame(animate);
        trailAnimationFrames.current.set(activeVehicleId, frameId);
        return;
      }

      if (!startTime) startTime = t;
      const elapsed = t - startTime;
      const progress = (elapsed % duration) / duration;

      const targetDistance = progress * totalDistance;
      let acc = 0;
      let lng = points[0].lng;
      let lat = points[0].lat;
      let heading = 0;

      for (const seg of segments) {
        if (acc + seg.distance >= targetDistance) {
          const p = (targetDistance - acc) / seg.distance;
          lng = seg.start.lng + (seg.end.lng - seg.start.lng) * p;
          lat = seg.start.lat + (seg.end.lat - seg.start.lat) * p;

          const dx = seg.end.lng - seg.start.lng;
          const dy = seg.end.lat - seg.start.lat;
          heading = (Math.atan2(dx, dy) * 180) / Math.PI;
          break;
        }
        acc += seg.distance;
      }

      marker!.setLngLat([lng, lat]);
      const car = marker!.getElement().querySelector('.trail-car') as HTMLElement | null;
      if (car) car.style.transform = `rotate(${heading}deg)`;

      const frameId = requestAnimationFrame(animate);
      trailAnimationFrames.current.set(activeVehicleId, frameId);
    };

    const existing = trailAnimationFrames.current.get(activeVehicleId);
    if (existing) cancelAnimationFrame(existing);
    trailAnimationFrames.current.set(activeVehicleId, requestAnimationFrame(animate));

    return () => {
      const frameId = trailAnimationFrames.current.get(activeVehicleId);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [trails, mapLoaded, showTrails, selectedVehicleId]);

  if (tokenError === 'webgl') {
    return (
      <div className="h-full w-full flex items-center justify-center bg-muted/50">
        <div className="max-w-sm w-full bg-background border rounded-xl p-6 text-center space-y-4 shadow-lg">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <span className="text-2xl">🗺️</span>
          </div>
          <div>
            <h3 className="font-semibold text-lg">WebGL Required</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Enable hardware acceleration in your browser settings.
            </p>
          </div>
        </div>
      </div>
    );
  }


  if (tokenError === 'style') {
    return (
      <div className="h-full w-full flex items-center justify-center bg-muted/50">
        <div className="max-w-sm w-full bg-background border rounded-xl p-6 text-center space-y-3 shadow-lg">
          <h3 className="font-semibold text-lg">Map style unavailable</h3>
          <p className="text-sm text-muted-foreground">
            The map tiles could not be loaded from Lemat right now.
          </p>
        </div>
      </div>
    );
  }

  return (
<div ref={mapContainer} className="h-full w-full" />
  );
};

export default LiveTrackingMap;
