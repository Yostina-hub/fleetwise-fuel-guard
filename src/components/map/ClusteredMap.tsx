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
import { useMapMatching } from "@/hooks/useMapMatching";


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
  const trailAnimationMarkers = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const trailAnimationFrames = useRef<Map<string, number>>(new Map());
  const matchedTrailsCache = useRef<Map<string, [number, number][] | string>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string>("");
  
  const { matchTrailToRoads } = useMapMatching(mapboxToken);


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
  // Draw vehicle trails with map matching (snap to roads)
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
      matchedTrailsCache.current.clear();
      return;
    }

    const processTrail = async (vehicleId: string, points: TrailPoint[]) => {
      if (points.length < 2) return;

      const sourceId = `trail-${vehicleId}`;
      const layerId = `trail-line-${vehicleId}`;
      const isSelected = vehicleId === selectedVehicleId;

      // Try to get map-matched coordinates
      let matchedCoordinates: [number, number][] | null = null;
      
      // Create cache key to detect if we need to re-match
      const cacheKey = `${points.length}-${points[0]?.lat.toFixed(4)}-${points[points.length - 1]?.lat.toFixed(4)}`;
      const cachedCoords = matchedTrailsCache.current.get(vehicleId);
      const existingCacheKey = matchedTrailsCache.current.get(`${vehicleId}-key`);
      
      if (cachedCoords && Array.isArray(cachedCoords) && existingCacheKey === cacheKey) {
        matchedCoordinates = cachedCoords as [number, number][];
      } else {
        matchedCoordinates = await matchTrailToRoads(vehicleId, points);
        if (matchedCoordinates) {
          matchedTrailsCache.current.set(vehicleId, matchedCoordinates);
          matchedTrailsCache.current.set(`${vehicleId}-key`, cacheKey as any);
        }
      }

      // Use matched coordinates if available, otherwise fall back to raw GPS
      const useCoordinates = matchedCoordinates || points.map(p => [p.lng, p.lat] as [number, number]);

      // Create line segments with speed data for gradient coloring
      const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];
      
      if (matchedCoordinates && matchedCoordinates.length > 1) {
        // For matched routes, distribute speed data along the matched path
        const speedStep = points.length / matchedCoordinates.length;
        
        for (let i = 0; i < matchedCoordinates.length - 1; i++) {
          const speedIndex = Math.min(Math.floor(i * speedStep), points.length - 1);
          const nextSpeedIndex = Math.min(Math.floor((i + 1) * speedStep), points.length - 1);
          const avgSpeed = (points[speedIndex].speed + points[nextSpeedIndex].speed) / 2;

          features.push({
            type: "Feature",
            properties: {
              speed: avgSpeed,
              color: getSpeedColor(avgSpeed, 120),
            },
            geometry: {
              type: "LineString",
              coordinates: [matchedCoordinates[i], matchedCoordinates[i + 1]],
            },
          });
        }
      } else {
        // Fallback to raw GPS points
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
      }

      const geojsonData: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features,
      };

      if (!map.current) return;

      const existingSource = map.current.getSource(sourceId) as mapboxgl.GeoJSONSource;
      if (existingSource) {
        existingSource.setData(geojsonData);
      } else {
        map.current.addSource(sourceId, {
          type: "geojson",
          data: geojsonData,
        });

        // Glow
        map.current.addLayer({
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
        map.current.addLayer({
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
      if (map.current.getLayer(layerId)) {
        if (isSelected) {
          map.current.setPaintProperty(layerId, "line-color", ["get", "color"]);
          map.current.setPaintProperty(`${layerId}-glow`, "line-color", ["get", "color"]);
          map.current.setPaintProperty(layerId, "line-width", 4);
        } else {
          map.current.setPaintProperty(layerId, "line-color", "#3b82f6");
          map.current.setPaintProperty(`${layerId}-glow`, "line-color", "#3b82f6");
          map.current.setPaintProperty(layerId, "line-width", 3);
        }
      }
    };

    // Process all trails
    trails.forEach((points, vehicleId) => {
      processTrail(vehicleId, points);
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
        matchedTrailsCache.current.delete(vehicleId);
      }
    });
  }, [trails, mapLoaded, showTrails, selectedVehicleId, matchTrailToRoads]);

  // Animate car icon along the trail (follows road-matched path)
  useEffect(() => {
    if (!map.current || !mapLoaded || !showTrails) {
      // Cleanup animation markers when trails are disabled
      trailAnimationMarkers.current.forEach((marker) => marker.remove());
      trailAnimationMarkers.current.clear();
      trailAnimationFrames.current.forEach((frameId) => cancelAnimationFrame(frameId));
      trailAnimationFrames.current.clear();
      return;
    }

    trails.forEach((points, vehicleId) => {
      if (points.length < 2) return;

      const isSelected = vehicleId === selectedVehicleId;
      if (!isSelected) {
        // Remove animation marker for non-selected vehicles
        const existingMarker = trailAnimationMarkers.current.get(vehicleId);
        if (existingMarker) {
          existingMarker.remove();
          trailAnimationMarkers.current.delete(vehicleId);
        }
        const existingFrame = trailAnimationFrames.current.get(vehicleId);
        if (existingFrame) {
          cancelAnimationFrame(existingFrame);
          trailAnimationFrames.current.delete(vehicleId);
        }
        return;
      }

      // Create car marker element
      const createCarElement = (heading: number = 0): HTMLDivElement => {
        const el = document.createElement("div");
        el.className = "trail-car-marker";
        el.innerHTML = `
          <div style="
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(34, 197, 94, 0.5), 0 0 20px rgba(34, 197, 94, 0.3);
            border: 3px solid white;
            transform: rotate(${heading}deg);
            transition: transform 0.1s ease-out;
          ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
            </svg>
          </div>
        `;
        return el;
      };

      // Use matched road coordinates if available, otherwise fall back to raw GPS
      const cachedCoords = matchedTrailsCache.current.get(vehicleId);
      const animationCoords: [number, number][] = (cachedCoords && Array.isArray(cachedCoords) && cachedCoords.length > 0 && typeof cachedCoords[0] !== 'string')
        ? cachedCoords as [number, number][]
        : points.map(p => [p.lng, p.lat] as [number, number]);

      // Calculate total distance and segment info using animation coordinates
      const segments: { start: [number, number]; end: [number, number]; distance: number }[] = [];
      let totalDistance = 0;

      for (let i = 0; i < animationCoords.length - 1; i++) {
        const start = animationCoords[i];
        const end = animationCoords[i + 1];
        const dx = end[0] - start[0];
        const dy = end[1] - start[1];
        const distance = Math.sqrt(dx * dx + dy * dy);
        segments.push({ start, end, distance });
        totalDistance += distance;
      }

      if (totalDistance === 0) return;

      // Get or create marker
      let marker = trailAnimationMarkers.current.get(vehicleId);
      if (!marker) {
        marker = new mapboxgl.Marker({
          element: createCarElement(),
          anchor: "center",
        })
          .setLngLat(animationCoords[0])
          .addTo(map.current!);
        trailAnimationMarkers.current.set(vehicleId, marker);
      }

      // Animation loop
      const animationDuration = Math.min(15000, Math.max(8000, animationCoords.length * 50)); // 8-15 seconds for smoother animation
      let startTime: number | null = null;

      const animate = (currentTime: number) => {
        if (!startTime) startTime = currentTime;
        const elapsed = currentTime - startTime;
        const progress = (elapsed % animationDuration) / animationDuration;

        // Find current position along trail
        const targetDistance = progress * totalDistance;
        let accumulatedDistance = 0;
        let currentLng = animationCoords[0][0];
        let currentLat = animationCoords[0][1];
        let heading = 0;

        for (const segment of segments) {
          if (accumulatedDistance + segment.distance >= targetDistance) {
            const segmentProgress = (targetDistance - accumulatedDistance) / segment.distance;
            currentLng = segment.start[0] + (segment.end[0] - segment.start[0]) * segmentProgress;
            currentLat = segment.start[1] + (segment.end[1] - segment.start[1]) * segmentProgress;
            
            // Calculate heading
            const dx = segment.end[0] - segment.start[0];
            const dy = segment.end[1] - segment.start[1];
            heading = (Math.atan2(dx, dy) * 180) / Math.PI;
            break;
          }
          accumulatedDistance += segment.distance;
        }

        // Update marker position and rotation
        marker!.setLngLat([currentLng, currentLat]);
        const markerEl = marker!.getElement();
        const innerDiv = markerEl.querySelector("div") as HTMLElement;
        if (innerDiv) {
          innerDiv.style.transform = `rotate(${heading}deg)`;
        }

        // Continue animation
        const frameId = requestAnimationFrame(animate);
        trailAnimationFrames.current.set(vehicleId, frameId);
      };

      // Cancel existing animation and start new one
      const existingFrame = trailAnimationFrames.current.get(vehicleId);
      if (existingFrame) {
        cancelAnimationFrame(existingFrame);
      }
      const frameId = requestAnimationFrame(animate);
      trailAnimationFrames.current.set(vehicleId, frameId);
    });

    // Cleanup markers for vehicles no longer in trails
    trailAnimationMarkers.current.forEach((marker, vehicleId) => {
      if (!trails.has(vehicleId) || vehicleId !== selectedVehicleId) {
        marker.remove();
        trailAnimationMarkers.current.delete(vehicleId);
        const frameId = trailAnimationFrames.current.get(vehicleId);
        if (frameId) {
          cancelAnimationFrame(frameId);
          trailAnimationFrames.current.delete(vehicleId);
        }
      }
    });

    return () => {
      trailAnimationFrames.current.forEach((frameId) => cancelAnimationFrame(frameId));
    };
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
