import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Supercluster from 'supercluster';
import {
  createLeafletMarkerIcon,
  createLeafletClusterIcon,
  animateLeafletPosition,
  injectLeafletMarkerAnimations,
} from './LeafletAnimatedMarker';

interface VehiclePoint {
  id: string;
  plate: string;
  status: 'moving' | 'idle' | 'stopped' | 'offline';
  lat: number;
  lng: number;
  speed: number;
  fuel: number;
  heading?: number;
  engine_on?: boolean;
  speedLimit?: number;
  driverName?: string;
  driverPhone?: string;
}

interface ClusteredMapOSMProps {
  vehicles: VehiclePoint[];
  onVehicleClick?: (vehicle: VehiclePoint) => void;
  selectedVehicleId?: string;
  mapStyle?: 'streets' | 'satellite';
}

type VehicleFeature = GeoJSON.Feature<GeoJSON.Point, VehiclePoint>;

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

const ClusteredMapOSM = ({
  vehicles,
  onVehicleClick,
  selectedVehicleId,
  mapStyle = 'satellite',
}: ClusteredMapOSMProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const clusterMarkers = useRef<Map<string, L.Marker>>(new Map());
  const previousPositions = useRef<Map<string, { lng: number; lat: number }>>(new Map());
  const tileLayer = useRef<L.TileLayer | null>(null);
  const hasFitBounds = useRef(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Inject marker animations on mount
  useEffect(() => {
    injectLeafletMarkerAnimations();
  }, []);

  // Create supercluster index
  const supercluster = useMemo(() => {
    const cluster = new Supercluster({
      radius: 60,
      maxZoom: 16,
      minZoom: 0,
    });

    const points: VehicleFeature[] = vehicles
      .filter((v) => v.lat && v.lng)
      .map((v) => ({
        type: 'Feature',
        properties: v,
        geometry: {
          type: 'Point',
          coordinates: [v.lng, v.lat],
        },
      }));

    cluster.load(points);
    return cluster;
  }, [vehicles]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = L.map(mapContainer.current, {
      center: [9.02, 38.75],
      zoom: 10,
      zoomControl: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(map.current);

    const layer = TILE_LAYERS[mapStyle];
    tileLayer.current = L.tileLayer(layer.url, {
      attribution: layer.attribution,
      maxZoom: 19,
    }).addTo(map.current);

    map.current.on('moveend', () => updateClusters());
    map.current.on('zoomend', () => updateClusters());

    setMapLoaded(true);

    return () => {
      clusterMarkers.current.forEach((m) => m.remove());
      clusterMarkers.current.clear();
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

  // Update clusters on map interaction
  const updateClusters = useCallback(() => {
    if (!map.current || !mapLoaded) return;

    const bounds = map.current.getBounds();
    const zoom = Math.floor(map.current.getZoom());

    const bbox: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ];

    const clusters = supercluster.getClusters(bbox, zoom);
    const activeIds = new Set<string>();

    clusters.forEach((cluster) => {
      const [lng, lat] = cluster.geometry.coordinates;
      const isCluster = cluster.properties.cluster;

      let markerId: string;

      if (isCluster) {
        markerId = `cluster-${cluster.id}`;
        const pointCount = cluster.properties.point_count;

        if (!clusterMarkers.current.has(markerId)) {
          const icon = createLeafletClusterIcon(pointCount);
          const marker = L.marker([lat, lng], { icon }).addTo(map.current!);

          marker.on('click', () => {
            const expansionZoom = Math.min(
              supercluster.getClusterExpansionZoom(cluster.id as number),
              20
            );
            map.current?.flyTo([lat, lng], expansionZoom, { duration: 0.8 });
          });

          clusterMarkers.current.set(markerId, marker);
          previousPositions.current.set(markerId, { lng, lat });
        } else {
          const marker = clusterMarkers.current.get(markerId)!;
          marker.setLatLng([lat, lng]);
        }
      } else {
        const vehicle = cluster.properties as VehiclePoint;
        markerId = `vehicle-${vehicle.id}`;
        const isSelected = vehicle.id === selectedVehicleId;
        const isOverspeeding = vehicle.speedLimit && vehicle.speed > vehicle.speedLimit;

        if (!clusterMarkers.current.has(markerId)) {
          const icon = createLeafletMarkerIcon(
            vehicle.status,
            isSelected,
            vehicle.engine_on,
            vehicle.heading,
            isOverspeeding
          );

          const popupContent = `
            <div class="vehicle-popup-content">
              <div class="popup-header">
                <span class="popup-plate">${vehicle.plate}</span>
                <span class="popup-status popup-status-${vehicle.status}">${vehicle.status}</span>
              </div>
              ${vehicle.driverName ? `<div class="popup-driver"><span class="popup-driver-icon">👤</span> ${vehicle.driverName}${vehicle.driverPhone ? ` <span class="popup-driver-phone">(${vehicle.driverPhone})</span>` : ''}</div>` : '<div class="popup-driver popup-no-driver">No driver assigned</div>'}
              ${isOverspeeding ? `<div class="popup-overspeeding">⚠️ Overspeeding (limit: ${vehicle.speedLimit} km/h)</div>` : ''}
              <div class="popup-stats">
                <div class="popup-stat">
                  <span class="popup-stat-value ${isOverspeeding ? 'text-destructive' : ''}">${vehicle.speed}</span>
                  <span class="popup-stat-label">km/h</span>
                </div>
                <div class="popup-stat">
                  <span class="popup-stat-value">${vehicle.fuel}</span>
                  <span class="popup-stat-label">% fuel</span>
                </div>
              </div>
            </div>
          `;

          const marker = L.marker([lat, lng], { icon })
            .addTo(map.current!)
            .bindPopup(popupContent, { maxWidth: 300, closeButton: false });

          marker.on('click', () => {
            onVehicleClick?.(vehicle);
            map.current?.flyTo([lat, lng], 16, { duration: 1 });
          });

          clusterMarkers.current.set(markerId, marker);
          previousPositions.current.set(markerId, { lng, lat });
        } else {
          const marker = clusterMarkers.current.get(markerId)!;
          const prevPos = previousPositions.current.get(markerId);

          if (prevPos && (Math.abs(prevPos.lng - lng) > 0.00001 || Math.abs(prevPos.lat - lat) > 0.00001)) {
            animateLeafletPosition(marker, prevPos.lng, prevPos.lat, lng, lat, 1000);
          } else {
            marker.setLatLng([lat, lng]);
          }

          previousPositions.current.set(markerId, { lng, lat });
        }
      }

      activeIds.add(markerId);
    });

    // Remove inactive markers
    clusterMarkers.current.forEach((marker, id) => {
      if (!activeIds.has(id)) {
        marker.remove();
        clusterMarkers.current.delete(id);
      }
    });
  }, [supercluster, mapLoaded, selectedVehicleId, onVehicleClick]);

  // Update clusters when vehicles change
  useEffect(() => {
    updateClusters();
  }, [vehicles, updateClusters]);

  // Fit bounds to show all vehicles - only on initial load
  useEffect(() => {
    if (!map.current || !mapLoaded || vehicles.length === 0 || hasFitBounds.current) return;

    const validVehicles = vehicles.filter((v) => v.lat && v.lng);
    if (validVehicles.length === 0) return;

    const bounds = L.latLngBounds(validVehicles.map((v) => [v.lat, v.lng] as [number, number]));
    map.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });

    hasFitBounds.current = true;
  }, [vehicles, mapLoaded]);

  return <div ref={mapContainer} className="h-full w-full" />;
};

export default ClusteredMapOSM;
