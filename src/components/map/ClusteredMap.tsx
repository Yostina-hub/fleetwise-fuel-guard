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
}

interface ClusteredMapProps {
  vehicles: VehiclePoint[];
  onVehicleClick?: (vehicle: VehiclePoint) => void;
  selectedVehicleId?: string;
  mapStyle?: "streets" | "satellite";
}

type VehicleFeature = GeoJSON.Feature<GeoJSON.Point, VehiclePoint>;

const ClusteredMap = ({
  vehicles,
  onVehicleClick,
  selectedVehicleId,
  mapStyle = "satellite",
}: ClusteredMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const clusterMarkers = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const previousPositions = useRef<Map<string, { lng: number; lat: number }>>(new Map());
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

    map.current.on("load", () => setMapLoaded(true));
    map.current.on("zoom", () => updateClusters());
    map.current.on("move", () => updateClusters());

    return () => {
      clusterMarkers.current.forEach((m) => m.remove());
      clusterMarkers.current.clear();
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken, mapStyle]);

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

        markerElement = createAnimatedMarkerElement(
          vehicle.status,
          isSelected,
          vehicle.engine_on,
          vehicle.heading
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
          marker.setPopup(
            new mapboxgl.Popup({ offset: 25, closeButton: true }).setHTML(`
              <div style="padding:12px; min-width:180px;">
                <strong style="font-size:14px;">${vehicle.plate}</strong><br/>
                <div style="margin-top:8px;">
                  <small style="display:block; margin:4px 0;">⚡ Speed: ${vehicle.speed} km/h</small>
                  <small style="display:block; margin:4px 0;">⛽ Fuel: ${vehicle.fuel}%</small>
                  <small style="display:block; margin:4px 0;">📍 Status: ${vehicle.status}</small>
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

  // Fit bounds to show all vehicles
  useEffect(() => {
    if (!map.current || !mapLoaded || vehicles.length === 0) return;

    const validVehicles = vehicles.filter((v) => v.lat && v.lng);
    if (validVehicles.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();
    validVehicles.forEach((v) => bounds.extend([v.lng, v.lat]));

    map.current.fitBounds(bounds, {
      padding: 50,
      maxZoom: 15,
      duration: 1000,
    });
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
