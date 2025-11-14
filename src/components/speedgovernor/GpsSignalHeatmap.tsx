import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, TrendingDown, TrendingUp } from "lucide-react";
import mapboxgl from "mapbox-gl";

interface GpsSignalHeatmapProps {
  map: mapboxgl.Map | null;
  organizationId: string;
}

export const GpsSignalHeatmap = ({ map, organizationId }: GpsSignalHeatmapProps) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [timeRange, setTimeRange] = useState<string>("7");
  const [heatmapAdded, setHeatmapAdded] = useState(false);

  const { data: signalData, isLoading } = useQuery({
    queryKey: ["gps-signal-heatmap", organizationId, timeRange],
    queryFn: async () => {
      const startTime = new Date();
      startTime.setDate(startTime.getDate() - parseInt(timeRange));

      const { data, error } = await supabase
        .from("vehicle_telemetry")
        .select("latitude, longitude, gps_signal_strength, gps_satellites_count, created_at")
        .eq("organization_id", organizationId)
        .gte("created_at", startTime.toISOString())
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .not("gps_signal_strength", "is", null);

      if (error) throw error;

      // Process data: group by location and calculate average signal strength
      const locationMap = new Map<string, { 
        lat: number; 
        lng: number; 
        signals: number[];
        count: number;
      }>();

      data?.forEach((item) => {
        // Round coordinates to group nearby points (approximately 100m precision)
        const lat = Math.round(item.latitude! * 1000) / 1000;
        const lng = Math.round(item.longitude! * 1000) / 1000;
        const key = `${lat},${lng}`;

        if (!locationMap.has(key)) {
          locationMap.set(key, {
            lat: item.latitude!,
            lng: item.longitude!,
            signals: [],
            count: 0,
          });
        }

        const location = locationMap.get(key)!;
        location.signals.push(item.gps_signal_strength || 0);
        location.count++;
      });

      // Convert to GeoJSON format for heatmap
      const features = Array.from(locationMap.values()).map((location) => {
        const avgSignal = location.signals.reduce((a, b) => a + b, 0) / location.signals.length;
        return {
          type: "Feature" as const,
          properties: {
            signal: avgSignal,
            count: location.count,
          },
          geometry: {
            type: "Point" as const,
            coordinates: [location.lng, location.lat],
          },
        };
      });

      return {
        type: "FeatureCollection" as const,
        features,
      };
    },
    enabled: !!organizationId && isEnabled,
    refetchInterval: 60000, // Refresh every minute
  });

  // Add/remove heatmap layer when data or enabled state changes
  useEffect(() => {
    if (!map || !signalData || !isEnabled) {
      // Remove heatmap if it exists
      if (map && heatmapAdded) {
        if (map.getLayer("gps-signal-heatmap")) {
          map.removeLayer("gps-signal-heatmap");
        }
        if (map.getSource("gps-signal-data")) {
          map.removeSource("gps-signal-data");
        }
        setHeatmapAdded(false);
      }
      return;
    }

    // Wait for map to be loaded
    if (!map.isStyleLoaded()) {
      map.once("load", () => {
        addHeatmap();
      });
    } else {
      addHeatmap();
    }

    function addHeatmap() {
      if (!map || !signalData) return;

      // Remove existing layer and source if they exist
      if (map.getLayer("gps-signal-heatmap")) {
        map.removeLayer("gps-signal-heatmap");
      }
      if (map.getSource("gps-signal-data")) {
        map.removeSource("gps-signal-data");
      }

      // Add source
      map.addSource("gps-signal-data", {
        type: "geojson",
        data: signalData as any,
      });

      // Add heatmap layer
      map.addLayer({
        id: "gps-signal-heatmap",
        type: "heatmap",
        source: "gps-signal-data",
        paint: {
          // Heatmap weight based on signal strength (0-100)
          "heatmap-weight": [
            "interpolate",
            ["linear"],
            ["get", "signal"],
            0, 0,
            100, 1
          ],
          // Heatmap intensity increases with zoom
          "heatmap-intensity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0, 1,
            15, 3
          ],
          // Color gradient from red (weak) to green (strong)
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0, "rgba(0, 0, 0, 0)",
            0.2, "rgb(239, 68, 68)", // red - weak signal
            0.4, "rgb(251, 146, 60)", // orange
            0.6, "rgb(250, 204, 21)", // yellow
            0.8, "rgb(132, 204, 22)", // lime
            1, "rgb(34, 197, 94)" // green - strong signal
          ],
          // Radius of each heatmap point
          "heatmap-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0, 10,
            15, 30
          ],
          // Opacity
          "heatmap-opacity": 0.7
        },
      });

      setHeatmapAdded(true);
    }

    return () => {
      if (map && heatmapAdded) {
        if (map.getLayer("gps-signal-heatmap")) {
          map.removeLayer("gps-signal-heatmap");
        }
        if (map.getSource("gps-signal-data")) {
          map.removeSource("gps-signal-data");
        }
      }
    };
  }, [map, signalData, isEnabled]);

  const stats = signalData?.features
    ? {
        totalPoints: signalData.features.length,
        avgSignal: Math.round(
          signalData.features.reduce((sum, f) => sum + f.properties.signal, 0) /
            signalData.features.length
        ),
        weakSignalAreas: signalData.features.filter((f) => f.properties.signal < 30).length,
        strongSignalAreas: signalData.features.filter((f) => f.properties.signal > 70).length,
      }
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          GPS Signal Heatmap
        </CardTitle>
        <CardDescription>
          Visualize GPS signal strength across different locations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="heatmap-toggle">Enable Heatmap</Label>
            <p className="text-xs text-muted-foreground">
              Show GPS signal strength overlay on map
            </p>
          </div>
          <Switch
            id="heatmap-toggle"
            checked={isEnabled}
            onCheckedChange={setIsEnabled}
          />
        </div>

        {isEnabled && (
          <>
            <div className="space-y-2">
              <Label htmlFor="time-range">Time Range</Label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger id="time-range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Last 24 hours</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading && (
              <div className="text-sm text-muted-foreground">
                Loading heatmap data...
              </div>
            )}

            {stats && (
              <div className="space-y-3 pt-2 border-t">
                <div className="text-sm font-medium">Signal Statistics</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Total Data Points</div>
                    <div className="text-lg font-semibold">{stats.totalPoints}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Avg Signal</div>
                    <div className="text-lg font-semibold">{stats.avgSignal}%</div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-destructive">
                      <TrendingDown className="h-3 w-3" />
                      Weak Signal Areas
                    </div>
                    <div className="text-lg font-semibold">{stats.weakSignalAreas}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-success">
                      <TrendingUp className="h-3 w-3" />
                      Strong Signal Areas
                    </div>
                    <div className="text-lg font-semibold">{stats.strongSignalAreas}</div>
                  </div>
                </div>
                
                <div className="pt-2 space-y-1">
                  <div className="text-xs font-medium">Signal Legend</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-3 rounded-full bg-gradient-to-r from-destructive via-warning to-success"></div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Weak (0%)</span>
                    <span>Strong (100%)</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
