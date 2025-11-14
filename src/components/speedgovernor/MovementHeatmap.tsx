import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Clock, MapPin } from "lucide-react";
import mapboxgl from "mapbox-gl";

interface MovementHeatmapProps {
  map: mapboxgl.Map | null;
  organizationId: string;
}

interface MovementPoint {
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: string;
}

export const MovementHeatmap = ({ map, organizationId }: MovementHeatmapProps) => {
  const [enabled, setEnabled] = useState(false);
  const [timeRange, setTimeRange] = useState("24"); // hours
  const [speedFilter, setSpeedFilter] = useState("all"); // all, moving, stationary
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalPoints: 0,
    movingPoints: 0,
    stationaryPoints: 0,
    hotspots: 0
  });

  useEffect(() => {
    if (!map || !enabled) {
      // Remove heatmap layer if disabled
      if (map?.getLayer('movement-heatmap')) {
        map.removeLayer('movement-heatmap');
      }
      if (map?.getSource('movement-data')) {
        map.removeSource('movement-data');
      }
      return;
    }

    const fetchMovementData = async () => {
      setLoading(true);
      try {
        const hoursAgo = parseInt(timeRange);
        const cutoffTime = new Date();
        cutoffTime.setHours(cutoffTime.getHours() - hoursAgo);

        let query = supabase
          .from("vehicle_telemetry")
          .select("latitude, longitude, speed_kmh, engine_on, created_at")
          .eq("organization_id", organizationId)
          .gte("created_at", cutoffTime.toISOString())
          .not("latitude", "is", null)
          .not("longitude", "is", null)
          .order("created_at", { ascending: false });

        // Apply speed filter
        if (speedFilter === "moving") {
          query = query.gt("speed_kmh", 5).eq("engine_on", true);
        } else if (speedFilter === "stationary") {
          query = query.lte("speed_kmh", 5);
        }

        const { data, error } = await query;

        if (error) throw error;

        const movementPoints: MovementPoint[] = (data || []).map((point: any) => ({
          latitude: point.latitude,
          longitude: point.longitude,
          speed: point.speed_kmh || 0,
          timestamp: point.created_at
        }));

        // Calculate stats
        const totalPoints = movementPoints.length;
        const movingPoints = movementPoints.filter(p => p.speed > 5).length;
        const stationaryPoints = totalPoints - movingPoints;

        // Calculate hotspots (areas with more than 10 points in 100m radius)
        const hotspotClusters = new Set<string>();
        movementPoints.forEach((point, i) => {
          const nearbyPoints = movementPoints.filter((p, j) => {
            if (i === j) return false;
            const distance = Math.sqrt(
              Math.pow(p.longitude - point.longitude, 2) + 
              Math.pow(p.latitude - point.latitude, 2)
            ) * 111320; // Convert to meters
            return distance < 100;
          });
          
          if (nearbyPoints.length >= 10) {
            const clusterKey = `${Math.round(point.latitude * 1000)},${Math.round(point.longitude * 1000)}`;
            hotspotClusters.add(clusterKey);
          }
        });

        setStats({
          totalPoints,
          movingPoints,
          stationaryPoints,
          hotspots: hotspotClusters.size
        });

        // Create GeoJSON features for heatmap
        const features = movementPoints.map(point => ({
          type: 'Feature',
          properties: {
            speed: point.speed,
            weight: point.speed > 5 ? 2 : 1 // Higher weight for moving vehicles
          },
          geometry: {
            type: 'Point',
            coordinates: [point.longitude, point.latitude]
          }
        }));

        const geojsonData: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: features as any
        };

        // Add or update heatmap source and layer
        if (!map.getSource('movement-data')) {
          map.addSource('movement-data', {
            type: 'geojson',
            data: geojsonData
          });

          map.addLayer({
            id: 'movement-heatmap',
            type: 'heatmap',
            source: 'movement-data',
            maxzoom: 18,
            paint: {
              // Increase weight as speed increases
              'heatmap-weight': [
                'interpolate',
                ['linear'],
                ['get', 'speed'],
                0, 0.1,
                50, 0.5,
                100, 1
              ],
              // Increase intensity as zoom level increases
              'heatmap-intensity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0, 0.5,
                18, 1.5
              ],
              // Color ramp for heatmap - blue (low) to red (high)
              'heatmap-color': [
                'interpolate',
                ['linear'],
                ['heatmap-density'],
                0, 'rgba(33,102,172,0)',
                0.2, 'rgb(103,169,207)',
                0.4, 'rgb(209,229,240)',
                0.6, 'rgb(253,219,199)',
                0.8, 'rgb(239,138,98)',
                1, 'rgb(178,24,43)'
              ],
              // Adjust heatmap radius by zoom level
              'heatmap-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0, 2,
                18, 30
              ],
              // Transition from heatmap to circle layer by zoom level
              'heatmap-opacity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                7, 1,
                18, 0.3
              ]
            }
          }, 'waterway-label');
        } else {
          (map.getSource('movement-data') as mapboxgl.GeoJSONSource).setData(geojsonData);
        }
      } catch (error) {
        console.error("Error fetching movement data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMovementData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchMovementData, 30000);
    return () => clearInterval(interval);
  }, [map, enabled, organizationId, timeRange, speedFilter]);

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Movement Heatmap</h3>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
            disabled={loading}
          />
        </div>

        {enabled && (
          <>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Time Range
                </Label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Last Hour</SelectItem>
                    <SelectItem value="6">Last 6 Hours</SelectItem>
                    <SelectItem value="24">Last 24 Hours</SelectItem>
                    <SelectItem value="72">Last 3 Days</SelectItem>
                    <SelectItem value="168">Last Week</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Activity Filter
                </Label>
                <Select value={speedFilter} onValueChange={setSpeedFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Activity</SelectItem>
                    <SelectItem value="moving">Moving Only (&gt;5 km/h)</SelectItem>
                    <SelectItem value="stationary">Stationary Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">Statistics</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Total Points</div>
                  <Badge variant="secondary" className="w-full justify-center">
                    {loading ? "..." : stats.totalPoints.toLocaleString()}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Hotspots</div>
                  <Badge variant="default" className="w-full justify-center">
                    {loading ? "..." : stats.hotspots}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Moving</div>
                  <Badge variant="outline" className="w-full justify-center text-green-600 border-green-600">
                    {loading ? "..." : stats.movingPoints.toLocaleString()}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Stationary</div>
                  <Badge variant="outline" className="w-full justify-center text-blue-600 border-blue-600">
                    {loading ? "..." : stats.stationaryPoints.toLocaleString()}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">Heatmap Legend</h4>
              <div className="flex items-center gap-1 h-6 rounded overflow-hidden">
                <div className="flex-1 h-full bg-gradient-to-r from-[rgb(33,102,172)] via-[rgb(209,229,240)] to-[rgb(178,24,43)]" />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Low Activity</span>
                <span>High Activity</span>
              </div>
            </div>

            {loading && (
              <div className="text-xs text-muted-foreground text-center">
                Loading movement data...
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
};
