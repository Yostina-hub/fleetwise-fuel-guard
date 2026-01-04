import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  createLeafletMarkerIcon,
  animateLeafletPosition,
  injectLeafletMarkerAnimations,
} from './LeafletAnimatedMarker';

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

interface LiveTrackingMapOSMProps {
  vehicles: Vehicle[];
  onVehicleClick?: (vehicle: Vehicle) => void;
  selectedVehicleId?: string;
  mapStyle?: 'streets' | 'satellite';
  onMapReady?: (map: L.Map) => void;
  showTrails?: boolean;
  trails?: Map<string, TrailPoint[]>;
  openPopupVehicleId?: string | null;
  onPopupOpened?: () => void;
}

// Tile layer URLs for different styles
const TILE_LAYERS = {
  streets: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  },
};

const LiveTrackingMapOSM = ({
  vehicles,
  onVehicleClick,
  selectedVehicleId,
  mapStyle = 'satellite',
  onMapReady,
  showTrails = true,
  trails = new Map(),
  openPopupVehicleId,
  onPopupOpened,
}: LiveTrackingMapOSMProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<Map<string, L.Marker>>(new Map());
  const previousPositions = useRef<Map<string, { lng: number; lat: number }>>(new Map());
  const trailLayers = useRef<Map<string, L.Polyline>>(new Map());
  const tileLayer = useRef<L.TileLayer | null>(null);
  const initialBoundsFitted = useRef(false);
  const addressFetchTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);
  const [vehicleAddresses, setVehicleAddresses] = useState<Map<string, string>>(new Map());

  // Inject marker animations on mount
  useEffect(() => {
    injectLeafletMarkerAnimations();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = L.map(mapContainer.current, {
      center: [9.02, 38.75], // Addis Ababa
      zoom: 12,
      zoomControl: false,
    });

    // Add zoom control to top-right
    L.control.zoom({ position: 'topright' }).addTo(map.current);

    // Add initial tile layer
    const layer = TILE_LAYERS[mapStyle];
    tileLayer.current = L.tileLayer(layer.url, {
      attribution: layer.attribution,
      maxZoom: 19,
    }).addTo(map.current);

    setMapLoaded(true);
    onMapReady?.(map.current);

    return () => {
      markers.current.forEach((marker) => marker.remove());
      markers.current.clear();
      trailLayers.current.forEach((layer) => layer.remove());
      trailLayers.current.clear();
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update tile layer when style changes
  useEffect(() => {
    if (!map.current || !tileLayer.current) return;

    const layer = TILE_LAYERS[mapStyle];
    tileLayer.current.setUrl(layer.url);
  }, [mapStyle]);

  // Debounced address fetching using Nominatim (free OSM geocoding)
  const fetchAddressDebounced = useCallback((lng: number, lat: number, vehicleId: string) => {
    const existingTimeout = addressFetchTimeouts.current.get(vehicleId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
          {
            headers: {
              'Accept-Language': 'en',
              'User-Agent': 'FleetTracker/1.0',
            },
          }
        );
        
        if (!response.ok) {
          setVehicleAddresses((prev) => new Map(prev).set(vehicleId, `${lat.toFixed(6)}, ${lng.toFixed(6)}`));
          return;
        }

        const data = await response.json();
        
        if (data.display_name) {
          // Create a shorter, cleaner address
          const addr = data.address || {};
          const parts = [
            addr.road || addr.pedestrian || addr.footway,
            addr.neighbourhood || addr.suburb || addr.quarter,
            addr.city || addr.town || addr.village || addr.municipality,
          ].filter(Boolean);
          
          const address = parts.length > 0 ? parts.join(', ') : data.display_name.split(',').slice(0, 3).join(',');
          setVehicleAddresses((prev) => new Map(prev).set(vehicleId, address));
        } else {
          setVehicleAddresses((prev) => new Map(prev).set(vehicleId, `${lat.toFixed(6)}, ${lng.toFixed(6)}`));
        }
      } catch (error) {
        console.error('Error fetching address:', error);
        setVehicleAddresses((prev) => new Map(prev).set(vehicleId, `${lat.toFixed(6)}, ${lng.toFixed(6)}`));
      }
      addressFetchTimeouts.current.delete(vehicleId);
    }, 600); // Slightly longer debounce for Nominatim rate limits

    addressFetchTimeouts.current.set(vehicleId, timeout);
  }, []);

  // Generate popup HTML
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

  // Update vehicle markers
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const currentVehicleIds = new Set(vehicles.map((v) => v.id));

    // Remove markers for vehicles no longer in the list
    markers.current.forEach((marker, id) => {
      if (!currentVehicleIds.has(id)) {
        marker.remove();
        markers.current.delete(id);
      }
    });

    // Add or update markers
    vehicles.forEach((vehicle) => {
      // Fetch address if not already cached
      if (!vehicleAddresses.has(vehicle.id)) {
        fetchAddressDebounced(vehicle.lng, vehicle.lat, vehicle.id);
      }

      const address = vehicleAddresses.get(vehicle.id) || 'Loading address...';
      const existingMarker = markers.current.get(vehicle.id);
      const previousPos = previousPositions.current.get(vehicle.id);

      const speedLimit = vehicle.speed_limit || 80;
      const isOverspeeding = vehicle.speed > speedLimit;

      if (existingMarker && previousPos) {
        // Animate to new position
        const hasPositionChanged =
          Math.abs(previousPos.lng - vehicle.lng) > 0.00001 ||
          Math.abs(previousPos.lat - vehicle.lat) > 0.00001;

        if (hasPositionChanged) {
          animateLeafletPosition(
            existingMarker,
            previousPos.lng,
            previousPos.lat,
            vehicle.lng,
            vehicle.lat,
            1200
          );
        }

        // Update marker icon if status changed
        const currentIcon = existingMarker.getIcon() as L.DivIcon;
        const newIcon = createLeafletMarkerIcon(
          vehicle.status,
          vehicle.id === selectedVehicleId,
          vehicle.engine_on,
          vehicle.heading,
          isOverspeeding
        );
        existingMarker.setIcon(newIcon);

        // Update popup content
        existingMarker.setPopupContent(generatePopupHTML(address, vehicle));
      } else if (!markers.current.has(vehicle.id)) {
        // Create new marker
        const icon = createLeafletMarkerIcon(
          vehicle.status,
          vehicle.id === selectedVehicleId,
          vehicle.engine_on,
          vehicle.heading,
          isOverspeeding
        );

        const marker = L.marker([vehicle.lat, vehicle.lng], { icon })
          .addTo(map.current!)
          .bindPopup(generatePopupHTML(address, vehicle), {
            maxWidth: 320,
            closeButton: true,
          });

        marker.on('click', () => {
          onVehicleClick?.(vehicle);
          map.current?.flyTo([vehicle.lat, vehicle.lng], 16, { duration: 1.2 });
        });

        markers.current.set(vehicle.id, marker);
      }

      // Store current position for next animation
      previousPositions.current.set(vehicle.id, { lng: vehicle.lng, lat: vehicle.lat });
    });

    // Center on selected vehicle
    if (selectedVehicleId && vehicles.length > 0) {
      const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
      if (selectedVehicle) {
        map.current.flyTo([selectedVehicle.lat, selectedVehicle.lng], 15, { duration: 1.5 });
      }
    } else if (vehicles.length > 0 && !initialBoundsFitted.current) {
      // Auto-fit bounds only on initial load
      const bounds = L.latLngBounds(vehicles.map((v) => [v.lat, v.lng] as [number, number]));
      map.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      initialBoundsFitted.current = true;
    }
  }, [vehicles, mapLoaded, selectedVehicleId, onVehicleClick, vehicleAddresses, generatePopupHTML, fetchAddressDebounced]);

  // Open popup for a specific vehicle when requested from sidebar
  useEffect(() => {
    if (!openPopupVehicleId || !mapLoaded || !map.current) return;

    const marker = markers.current.get(openPopupVehicleId);
    const vehicle = vehicles.find((v) => v.id === openPopupVehicleId);

    if (marker && vehicle) {
      // Close all other popups first
      markers.current.forEach((m, id) => {
        if (id !== openPopupVehicleId) {
          m.closePopup();
        }
      });

      // Fly to the vehicle
      map.current.flyTo([vehicle.lat, vehicle.lng], 16, { duration: 1.2 });

      // Trigger address fetch if not already cached
      if (!vehicleAddresses.has(vehicle.id)) {
        fetchAddressDebounced(vehicle.lng, vehicle.lat, vehicle.id);
      }

      // Update popup content and open it
      const latestAddr = vehicleAddresses.get(vehicle.id) || 'Fetching address...';
      marker.setPopupContent(generatePopupHTML(latestAddr, vehicle));
      marker.openPopup();

      onPopupOpened?.();
    }
  }, [openPopupVehicleId, mapLoaded, vehicles, onPopupOpened, generatePopupHTML, vehicleAddresses, fetchAddressDebounced]);

  // Update popups when addresses change
  useEffect(() => {
    if (!mapLoaded) return;

    markers.current.forEach((marker, vehicleId) => {
      if (marker.isPopupOpen()) {
        const vehicle = vehicles.find((v) => v.id === vehicleId);
        const address = vehicleAddresses.get(vehicleId);
        if (vehicle && address) {
          marker.setPopupContent(generatePopupHTML(address, vehicle));
        }
      }
    });
  }, [vehicleAddresses, mapLoaded, vehicles, generatePopupHTML]);

  // Draw vehicle trails on the map
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    if (!showTrails) {
      // Remove all trail layers when trails are hidden
      trailLayers.current.forEach((layer) => layer.remove());
      trailLayers.current.clear();
      return;
    }

    trails.forEach((points, vehicleId) => {
      if (points.length < 2) return;

      const coordinates: L.LatLngExpression[] = points.map((p) => [p.lat, p.lng]);
      const color = vehicleId === selectedVehicleId ? '#22c55e' : '#3b82f6';

      const existingLayer = trailLayers.current.get(vehicleId);
      if (existingLayer) {
        existingLayer.setLatLngs(coordinates);
        existingLayer.setStyle({ color });
      } else {
        const polyline = L.polyline(coordinates, {
          color,
          weight: 3,
          opacity: 0.8,
          smoothFactor: 1,
        }).addTo(map.current!);

        trailLayers.current.set(vehicleId, polyline);
      }
    });

    // Remove trails for vehicles no longer tracked
    trailLayers.current.forEach((layer, vehicleId) => {
      if (!trails.has(vehicleId)) {
        layer.remove();
        trailLayers.current.delete(vehicleId);
      }
    });
  }, [trails, mapLoaded, showTrails, selectedVehicleId]);

  return <div ref={mapContainer} className="h-full w-full" />;
};

export default LiveTrackingMapOSM;
