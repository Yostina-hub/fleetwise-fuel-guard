import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import Supercluster from "supercluster";
import { supabase } from "@/integrations/supabase/client";
import {
  createAnimatedMarkerElement,
  createAnimatedClusterElement,
  animatePosition,
  injectMarkerAnimations,
  getSpeedColor,
} from "./AnimatedMarker";


interface VehiclePoint {
  id: string;
  plate: string;
  status: "moving" | "idle" | "stopped" | "offline";
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

interface TrailPoint {
  lat: number;
  lng: number;
  timestamp: string;
  speed: number;
}

interface ClusteredMapProps {
  vehicles: VehiclePoint[];
  onVehicleClick?: (vehicle: VehiclePoint) => void;
  selectedVehicleId?: string;
  mapStyle?: "streets" | "satellite";
  onMapReady?: (map: mapboxgl.Map) => void;
  showTrails?: boolean;
  trails?: Map<string, TrailPoint[]>;
}


type VehicleFeature = GeoJSON.Feature<GeoJSON.Point, VehiclePoint>;

const ClusteredMap = ({
  vehicles,
  onVehicleClick,
  selectedVehicleId,
  mapStyle = "satellite",
  onMapReady,
  showTrails = true,
  trails = new Map(),
}: ClusteredMapProps) => {

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const clusterMarkers = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const previousPositions = useRef<Map<string, { lng: number; lat: number }>>(new Map());
  const hasFitBounds = useRef(false);
  const trailSourcesAdded = useRef<Set<string>>(new Set());
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string>("");


  // Inject marker animations on mount
  useEffect(() => {
    injectMarkerAnimations();
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
        type: "Feature",
        properties: v,
        geometry: {
          type: "Point",
          coordinates: [v.lng, v.lat],
        },
      }));

    cluster.load(points);
    return cluster;
  }, [vehicles]);

  // Fetch token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const localToken =
          localStorage.getItem("mapbox_token") ||
          import.meta.env.VITE_MAPBOX_TOKEN;
        if (localToken) {
          setMapboxToken(localToken);
          return;
        }

        const { data, error } = await supabase.functions.invoke(
          "get-mapbox-token"
        );
        if (!error && data?.token) {
          setMapboxToken(data.token);
          localStorage.setItem("mapbox_token", data.token);
        }
      } catch (err) {
        console.error("Failed to fetch Mapbox token:", err);
      }
    };
    fetchToken();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || map.current) return;

    // Ensure dependent effects (like trails) wait for the new style to load
    setMapLoaded(false);

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style:
        mapStyle === "satellite"
          ? "mapbox://styles/mapbox/satellite-streets-v12"
          : "mapbox://styles/mapbox/streets-v12",
      center: [38.75, 9.02],
      zoom: 10,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.current.addControl(new mapboxgl.FullscreenControl(), "top-right");

    map.current.on("load", () => {
      setMapLoaded(true);
      try {
        onMapReady?.(map.current!);
      } catch {}
    });
    map.current.on("zoom", () => updateClusters());
    map.current.on("move", () => updateClusters());

    return () => {
      setMapLoaded(false);

      // Cleanup clusters
      clusterMarkers.current.forEach((m) => m.remove());
      clusterMarkers.current.clear();

      // Cleanup trails (optional; map.remove() will also clear)
      trailSourcesAdded.current.clear();

      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken, mapStyle]);
  // Draw vehicle trails (works in clustered mode too)
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // If trails are disabled, remove all existing trail layers
    if (!showTrails) {
      trailSourcesAdded.current.forEach((vehicleId) => {
        const sourceId = `trail-${vehicleId}`;
        const layerId = `trail-line-${vehicleId}`;

        if (map.current!.getLayer(layerId)) map.current!.removeLayer(layerId);
        if (map.current!.getLayer(`${layerId}-glow`)) map.current!.removeLayer(`${layerId}-glow`);
        if (map.current!.getSource(sourceId)) map.current!.removeSource(sourceId);
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
          type: "Feature",
          properties: {
            speed: avgSpeed,
            color: getSpeedColor(avgSpeed, 120),
          },
          geometry: {
            type: "LineString",
            coordinates: [
              [p1.lng, p1.lat],
              [p2.lng, p2.lat],
            ],
          },
        });
      }

      const geojsonData: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features,
      };

      const existingSource = map.current!.getSource(sourceId) as mapboxgl.GeoJSONSource;
      if (existingSource) {
        existingSource.setData(geojsonData);
      } else {
        map.current!.addSource(sourceId, {
          type: "geojson",
          data: geojsonData,
        });

        // Glow
        map.current!.addLayer({
          id: `${layerId}-glow`,
          type: "line",
          source: sourceId,
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": isSelected ? ["get", "color"] : "#3b82f6",
            "line-width": 10,
            "line-opacity": 0.25,
            "line-blur": 4,
          },
        });

        // Main line
        map.current!.addLayer({
          id: layerId,
          type: "line",
          source: sourceId,
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": isSelected ? ["get", "color"] : "#3b82f6",
            "line-width": isSelected ? 4 : 3,
            "line-opacity": 0.95,
          },
        });

        trailSourcesAdded.current.add(vehicleId);
      }

      // Update selection styling
      if (map.current!.getLayer(layerId)) {
        if (isSelected) {
          map.current!.setPaintProperty(layerId, "line-color", ["get", "color"]);
          map.current!.setPaintProperty(`${layerId}-glow`, "line-color", ["get", "color"]);
          map.current!.setPaintProperty(layerId, "line-width", 4);
        } else {
          map.current!.setPaintProperty(layerId, "line-color", "#3b82f6");
          map.current!.setPaintProperty(`${layerId}-glow`, "line-color", "#3b82f6");
          map.current!.setPaintProperty(layerId, "line-width", 3);
        }
      }
    });

    // Remove trails for vehicles no longer tracked
    trailSourcesAdded.current.forEach((vehicleId) => {
      if (!trails.has(vehicleId)) {
        const sourceId = `trail-${vehicleId}`;
        const layerId = `trail-line-${vehicleId}`;

        if (map.current!.getLayer(layerId)) map.current!.removeLayer(layerId);
        if (map.current!.getLayer(`${layerId}-glow`)) map.current!.removeLayer(`${layerId}-glow`);
        if (map.current!.getSource(sourceId)) map.current!.removeSource(sourceId);
        trailSourcesAdded.current.delete(vehicleId);
      }
    });
  }, [trails, mapLoaded, showTrails, selectedVehicleId]);

  // Update clusters on map interaction

  const updateClusters = useCallback(() => {
    if (!map.current || !mapLoaded) return;

    const bounds = map.current.getBounds();
    const zoom = Math.floor(map.current.getZoom());

    if (!bounds) return;

    const bbox: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ];

    const clusters = supercluster.getClusters(bbox, zoom);

    // Track which markers to keep
    const activeIds = new Set<string>();

    clusters.forEach((cluster) => {
      const [lng, lat] = cluster.geometry.coordinates;
      const isCluster = cluster.properties.cluster;

      let markerId: string;
      let markerElement: HTMLDivElement;

      if (isCluster) {
        markerId = `cluster-${cluster.id}`;
        const pointCount = cluster.properties.point_count;

        // Use animated cluster element
        markerElement = createAnimatedClusterElement(pointCount, () => {
          const expansionZoom = Math.min(
            supercluster.getClusterExpansionZoom(cluster.id as number),
            20
          );
          map.current?.flyTo({
            center: [lng, lat],
            zoom: expansionZoom,
            duration: 800,
          });
        });
      } else {
        // Individual vehicle marker with animations
        const vehicle = cluster.properties as VehiclePoint;
        markerId = `vehicle-${vehicle.id}`;
        const isSelected = vehicle.id === selectedVehicleId;
        const isOverspeeding = vehicle.speedLimit && vehicle.speed > vehicle.speedLimit;

        markerElement = createAnimatedMarkerElement(
          vehicle.status,
          isSelected,
          vehicle.engine_on,
          vehicle.heading,
          isOverspeeding
        );

        markerElement.addEventListener("click", () => {
          onVehicleClick?.(vehicle);
          map.current?.flyTo({
            center: [lng, lat],
            zoom: 16,
            duration: 1000,
          });
        });
      }

      activeIds.add(markerId);

      // Create or update marker with smooth position animation
      if (!clusterMarkers.current.has(markerId)) {
        const marker = new mapboxgl.Marker({
          element: markerElement,
          anchor: "center",
        })
          .setLngLat([lng, lat])
          .addTo(map.current!);

        if (!isCluster) {
          const vehicle = cluster.properties as VehiclePoint;
          const isOverspeeding = vehicle.speedLimit && vehicle.speed > vehicle.speedLimit;
          marker.setPopup(
            new mapboxgl.Popup({ offset: 25, closeButton: false, closeOnClick: true, className: 'vehicle-popup' }).setHTML(`
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
            `)
          );
        }

        clusterMarkers.current.set(markerId, marker);
        previousPositions.current.set(markerId, { lng, lat });
      } else {
        const marker = clusterMarkers.current.get(markerId)!;
        const prevPos = previousPositions.current.get(markerId);

        // Animate to new position if it changed
        if (prevPos && (Math.abs(prevPos.lng - lng) > 0.00001 || Math.abs(prevPos.lat - lat) > 0.00001)) {
          animatePosition(marker, prevPos.lng, prevPos.lat, lng, lat, 1000);
        } else {
          marker.setLngLat([lng, lat]);
        }

        previousPositions.current.set(markerId, { lng, lat });
      }
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

    const bounds = new mapboxgl.LngLatBounds();
    validVehicles.forEach((v) => bounds.extend([v.lng, v.lat]));

    map.current.fitBounds(bounds, {
      padding: 50,
      maxZoom: 15,
      duration: 1000,
    });
    
    hasFitBounds.current = true;
  }, [vehicles, mapLoaded]);

  if (!mapboxToken) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-muted">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  return <div ref={mapContainer} className="h-full w-full" />;
};

export default ClusteredMap;
