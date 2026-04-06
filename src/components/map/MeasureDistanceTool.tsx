import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { Ruler, X, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MeasureDistanceToolProps {
  map: maplibregl.Map | null;
  mapLoaded: boolean;
  initialPoint?: [number, number] | null;
  onClearInitialPoint?: () => void;
}

const SOURCE_ID = "measure-points";
const LINE_SOURCE_ID = "measure-lines";
const POINTS_LAYER_ID = "measure-points-layer";
const LINE_LAYER_ID = "measure-line-layer";

function haversineDistance(
  [lng1, lat1]: [number, number],
  [lng2, lat2]: [number, number]
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

export const MeasureDistanceTool = ({
  map,
  mapLoaded,
  initialPoint,
  onClearInitialPoint,
}: MeasureDistanceToolProps) => {
  const [active, setActive] = useState(false);
  const [points, setPoints] = useState<[number, number][]>([]);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  // When the context menu triggers "Measure from here", activate and add that point
  useEffect(() => {
    if (initialPoint) {
      setActive(true);
      setPoints([initialPoint]);
      onClearInitialPoint?.();
    }
  }, [initialPoint, onClearInitialPoint]);

  const totalDistance = points.reduce((acc, pt, i) => {
    if (i === 0) return 0;
    return acc + haversineDistance(points[i - 1], pt);
  }, 0);

  // Manage GeoJSON source & layers
  useEffect(() => {
    if (!map || !mapLoaded) return;

    const ensureSources = () => {
      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
      }
      if (!map.getSource(LINE_SOURCE_ID)) {
        map.addSource(LINE_SOURCE_ID, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
      }
      if (!map.getLayer(LINE_LAYER_ID)) {
        map.addLayer({
          id: LINE_LAYER_ID,
          type: "line",
          source: LINE_SOURCE_ID,
          paint: {
            "line-color": "#ef4444",
            "line-width": 2.5,
            "line-dasharray": [3, 2],
            "line-opacity": 0.85,
          },
          layout: { "line-cap": "round", "line-join": "round" },
        });
      }
      if (!map.getLayer(POINTS_LAYER_ID)) {
        map.addLayer({
          id: POINTS_LAYER_ID,
          type: "circle",
          source: SOURCE_ID,
          paint: {
            "circle-radius": 5,
            "circle-color": "#ef4444",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });
      }
    };

    // Re-add sources after style changes
    map.on("style.load", ensureSources);
    ensureSources();

    return () => {
      map.off("style.load", ensureSources);
    };
  }, [map, mapLoaded]);

  // Update GeoJSON data when points change
  useEffect(() => {
    if (!map || !mapLoaded) return;

    const pointFeatures: GeoJSON.Feature[] = points.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: p },
      properties: {},
    }));

    const lineFeature: GeoJSON.Feature[] =
      points.length >= 2
        ? [
            {
              type: "Feature",
              geometry: { type: "LineString", coordinates: points },
              properties: {},
            },
          ]
        : [];

    try {
      (map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource)?.setData({
        type: "FeatureCollection",
        features: pointFeatures,
      });
      (map.getSource(LINE_SOURCE_ID) as maplibregl.GeoJSONSource)?.setData({
        type: "FeatureCollection",
        features: lineFeature,
      });
    } catch {}

    // Update distance label markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (points.length >= 2) {
      // Add distance label at midpoint of last segment
      const lastIdx = points.length - 1;
      const midLng = (points[lastIdx - 1][0] + points[lastIdx][0]) / 2;
      const midLat = (points[lastIdx - 1][1] + points[lastIdx][1]) / 2;
      const segDist = haversineDistance(points[lastIdx - 1], points[lastIdx]);

      const el = document.createElement("div");
      el.className = "measure-label";
      el.style.cssText =
        "background: hsl(var(--background)); color: hsl(var(--foreground)); border: 1px solid hsl(var(--border)); padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; box-shadow: 0 2px 6px rgba(0,0,0,0.15); white-space: nowrap; pointer-events: none;";
      el.textContent = formatDist(segDist);

      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([midLng, midLat])
        .addTo(map);
      markersRef.current.push(marker);
    }
  }, [map, mapLoaded, points]);

  // Map click handler when tool is active
  useEffect(() => {
    if (!map || !active) return;

    map.getCanvas().style.cursor = "crosshair";

    const handleClick = (e: maplibregl.MapMouseEvent) => {
      setPoints((prev) => [...prev, [e.lngLat.lng, e.lngLat.lat]]);
    };

    map.on("click", handleClick);

    return () => {
      map.off("click", handleClick);
      map.getCanvas().style.cursor = "";
    };
  }, [map, active]);

  const handleClear = useCallback(() => {
    setPoints([]);
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
  }, []);

  const handleUndo = useCallback(() => {
    setPoints((prev) => prev.slice(0, -1));
  }, []);

  const handleToggle = useCallback(() => {
    if (active) {
      handleClear();
      setActive(false);
    } else {
      setActive(true);
    }
  }, [active, handleClear]);

  return (
    <>
      {/* Toggle button */}
      <Button
        size="sm"
        variant={active ? "default" : "outline"}
        onClick={handleToggle}
        className={cn(
          "gap-1.5 text-xs shadow-sm",
          active && "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
        )}
      >
        <Ruler className="w-3.5 h-3.5" />
        {active ? "Stop Measuring" : "Measure"}
      </Button>

      {/* Distance display panel */}
      {active && points.length > 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[900] bg-background/95 backdrop-blur-sm border border-border rounded-xl shadow-xl px-4 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2">
            <Ruler className="w-4 h-4 text-destructive" />
            <span className="text-sm font-semibold">{formatDist(totalDistance)}</span>
            <Badge variant="secondary" className="text-[10px]">
              {points.length} pts
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={handleUndo}
              disabled={points.length < 1}
              title="Undo last point"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={handleClear}
              title="Clear all"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
