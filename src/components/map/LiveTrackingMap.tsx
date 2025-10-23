import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

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
}

interface LiveTrackingMapProps {
  vehicles: Vehicle[];
  onVehicleClick?: (vehicle: Vehicle) => void;
  selectedVehicleId?: string;
  token?: string;
  mapStyle?: 'streets' | 'satellite';
}

const LiveTrackingMap = ({ vehicles, onVehicleClick, selectedVehicleId, token, mapStyle = 'satellite' }: LiveTrackingMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const mapboxToken = token || localStorage.getItem('mapbox_token') || import.meta.env.VITE_MAPBOX_TOKEN;
    if (!mapboxToken) {
      console.error('Mapbox token not found');
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

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      markers.current.forEach(marker => marker.remove());
      markers.current.clear();
      map.current?.remove();
    };
  }, []);

  // Update map style when setting changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const targetStyle = mapStyle === 'satellite' ? 'mapbox://styles/mapbox/satellite-streets-v12' : 'mapbox://styles/mapbox/streets-v12';
    map.current.setStyle(targetStyle);
  }, [mapStyle, mapLoaded]);

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
              <div style="padding:8px;">
                <strong>${vehicle.plate}</strong><br/>
                <small>Speed: ${vehicle.speed} km/h</small><br/>
                <small>Fuel: ${vehicle.fuel}%</small><br/>
                <small>Status: ${vehicle.status}</small>
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

    // Auto-fit bounds to show all vehicles
    if (vehicles.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      vehicles.forEach(v => bounds.extend([v.lng, v.lat]));
      map.current!.fitBounds(bounds, { padding: 50, maxZoom: 15 });
    }
  }, [vehicles, mapLoaded, selectedVehicleId, onVehicleClick]);

  return (
    <div ref={mapContainer} className="absolute inset-0" />
  );
};

export default LiveTrackingMap;
