import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { VehicleTelemetry } from "@/hooks/useVehicleTelemetry";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GpsSignalHeatmap } from "./GpsSignalHeatmap";
import { MovementHeatmap } from "./MovementHeatmap";
import { useOrganization } from "@/hooks/useOrganization";

interface Vehicle {
  id: string;
  plate: string;
  maxSpeed: number;
  governorActive: boolean;
}

interface GovernorMapViewProps {
  vehicles: Vehicle[];
  telemetry: Record<string, VehicleTelemetry>;
  isVehicleOnline: (vehicleId: string) => boolean;
}

interface VehicleTrail {
  coordinates: [number, number][];
  lastUpdate: number;
}

export const GovernorMapView = ({ vehicles, telemetry, isVehicleOnline }: GovernorMapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<Record<string, mapboxgl.Marker>>({});
  const trails = useRef<Record<string, VehicleTrail>>({});
  const [mapboxToken, setMapboxToken] = useState<string>("");
  const { organizationId } = useOrganization();

  // Fetch Mapbox token from edge function
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const response = await fetch(
          "https://kkmjwmyqakprqdhrlsoz.supabase.co/functions/v1/get-mapbox-token"
        );
        const data = await response.json();
        setMapboxToken(data.token);
      } catch (error) {
        console.error("Error fetching Mapbox token:", error);
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
      style: "mapbox://styles/mapbox/streets-v12",
      center: [38.7578, 9.03], // Addis Ababa, Ethiopia
      zoom: 11,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.current.addControl(new mapboxgl.FullscreenControl(), "top-right");

    // Initialize map with trail source when loaded
    map.current.on('load', () => {
      if (!map.current) return;
      
      // Add source for vehicle trails
      map.current.addSource('vehicle-trails', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });

      // Add trail lines layer
      map.current.addLayer({
        id: 'vehicle-trails-layer',
        type: 'line',
        source: 'vehicle-trails',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 3,
          'line-opacity': 0.6
        }
      });
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken]);

  // Update markers when vehicles or telemetry changes
  useEffect(() => {
    if (!map.current) return;

    // Remove markers for vehicles that no longer exist
    Object.keys(markers.current).forEach((vehicleId) => {
      if (!vehicles.find((v) => v.id === vehicleId)) {
        markers.current[vehicleId].remove();
        delete markers.current[vehicleId];
      }
    });

    // Add or update markers for each vehicle
    vehicles.forEach((vehicle) => {
      const vehicleTelemetry = telemetry[vehicle.id];
      const isOnline = isVehicleOnline(vehicle.id);

      if (!vehicleTelemetry?.latitude || !vehicleTelemetry?.longitude) return;

      const currentSpeed = vehicleTelemetry.speed_kmh || 0;
      const isOverSpeed = currentSpeed > vehicle.maxSpeed;
      const isMoving = vehicleTelemetry.engine_on && currentSpeed > 5;

      // Determine marker color based on status
      let markerColor = "#6b7280"; // gray - offline
      if (isOnline) {
        if (isOverSpeed) {
          markerColor = "#ef4444"; // red - overspeeding
        } else if (!vehicle.governorActive) {
          markerColor = "#f59e0b"; // orange - governor inactive
        } else if (isMoving) {
          markerColor = "#22c55e"; // green - moving normally
        } else {
          markerColor = "#3b82f6"; // blue - stopped/idle
        }
      }

      // Create custom marker HTML with directional arrow
      const el = document.createElement("div");
      el.className = "governor-marker";
      const rotation = vehicleTelemetry.heading || 0;
      el.style.cssText = `
        width: 40px;
        height: 40px;
        background-color: ${markerColor};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 16px;
        cursor: pointer;
        transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        transform: rotate(${rotation}deg);
      `;
      
      // Use arrow for moving vehicles, warning for overspeeding, car for stationary
      if (isOverSpeed) {
        el.innerHTML = "⚠️";
      } else if (isMoving) {
        el.innerHTML = "▲"; // Arrow pointing up, rotated by heading
      } else {
        el.innerHTML = "🚗";
      }

      // Pulse animation for moving or overspeeding vehicles
      if (isOverSpeed || isMoving) {
        el.style.animation = isOverSpeed ? "pulse 1.5s infinite" : "pulse-subtle 2s infinite";
      }

      // Update vehicle trail
      const currentPos: [number, number] = [vehicleTelemetry.longitude, vehicleTelemetry.latitude];
      const now = Date.now();
      
      if (!trails.current[vehicle.id]) {
        trails.current[vehicle.id] = {
          coordinates: [currentPos],
          lastUpdate: now
        };
      } else {
        const trail = trails.current[vehicle.id];
        const lastPos = trail.coordinates[trail.coordinates.length - 1];
        
        // Only add to trail if vehicle has moved significantly (> 5 meters)
        const distance = Math.sqrt(
          Math.pow(currentPos[0] - lastPos[0], 2) + 
          Math.pow(currentPos[1] - lastPos[1], 2)
        ) * 111320; // Convert to meters
        
        if (distance > 5 && isMoving) {
          trail.coordinates.push(currentPos);
          trail.lastUpdate = now;
          
          // Keep only last 50 points (about 5 minutes at 6 second intervals)
          if (trail.coordinates.length > 50) {
            trail.coordinates.shift();
          }
        }
        
        // Clear old trails (older than 10 minutes)
        if (now - trail.lastUpdate > 600000 || !isMoving) {
          trail.coordinates = [currentPos];
        }
      }

      // Create or update marker
      if (markers.current[vehicle.id]) {
        // Smoothly animate marker to new position
        const marker = markers.current[vehicle.id];
        const markerEl = marker.getElement();
        
        // Update position with smooth transition
        marker.setLngLat([vehicleTelemetry.longitude, vehicleTelemetry.latitude]);
        
        // Update appearance
        markerEl.innerHTML = el.innerHTML;
        markerEl.style.backgroundColor = markerColor;
        markerEl.style.transform = `rotate(${rotation}deg)`;
        markerEl.style.animation = (isOverSpeed || isMoving) ? 
          (isOverSpeed ? "pulse 1.5s infinite" : "pulse-subtle 2s infinite") : "";
      } else {
        // Create new marker
        const marker = new mapboxgl.Marker(el)
          .setLngLat([vehicleTelemetry.longitude, vehicleTelemetry.latitude])
          .addTo(map.current!);

        // Create popup with vehicle info
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 8px; font-family: system-ui;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">🚗 ${vehicle.plate}</h3>
            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 13px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #6b7280;">Speed:</span>
                <strong style="color: ${isOverSpeed ? '#ef4444' : '#22c55e'};">${currentSpeed.toFixed(0)} km/h</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #6b7280;">Limit:</span>
                <strong>${vehicle.maxSpeed} km/h</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #6b7280;">Governor:</span>
                <span style="color: ${vehicle.governorActive ? '#22c55e' : '#ef4444'}; font-weight: 600;">
                  ${vehicle.governorActive ? "✓ Active" : "✗ Inactive"}
                </span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #6b7280;">Engine:</span>
                <strong>${vehicleTelemetry.engine_on ? "On" : "Off"}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #6b7280;">Status:</span>
                <span style="color: ${isOnline ? '#22c55e' : '#6b7280'}; font-weight: 600;">
                  ${isOnline ? "● Online" : "○ Offline"}
                </span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #6b7280;">GPS Signal:</span>
                <span style="color: ${vehicleTelemetry.gps_signal_strength > 50 ? '#22c55e' : vehicleTelemetry.gps_signal_strength > 0 ? '#f59e0b' : '#ef4444'}; font-weight: 600;">
                  ${vehicleTelemetry.gps_signal_strength || 0}% (${vehicleTelemetry.gps_satellites_count || 0} sats)
                </span>
              </div>
              ${isOverSpeed ? '<div style="margin-top: 8px; padding: 6px; background: #fef2f2; border-radius: 4px; color: #ef4444; font-weight: 600; text-align: center;">⚠️ OVERSPEEDING!</div>' : ''}
              ${!vehicleTelemetry.gps_signal_strength || vehicleTelemetry.gps_signal_strength === 0 ? '<div style="margin-top: 8px; padding: 6px; background: #fef2f2; border-radius: 4px; color: #ef4444; text-align: center; font-size: 12px;">⚠️ No GPS Signal</div>' : ''}
            </div>
          </div>
        `);

        marker.setPopup(popup);
        markers.current[vehicle.id] = marker;
      }
    });

    // Update trail lines on map
    if (map.current && map.current.getSource('vehicle-trails')) {
      const features = vehicles
        .filter(v => trails.current[v.id] && trails.current[v.id].coordinates.length > 1)
        .map(v => {
          const vehicleTelemetry = telemetry[v.id];
          const isOnline = isVehicleOnline(v.id);
          const currentSpeed = vehicleTelemetry?.speed_kmh || 0;
          const isOverSpeed = currentSpeed > v.maxSpeed;
          const isMoving = vehicleTelemetry?.engine_on && currentSpeed > 5;
          
          // Determine trail color
          let trailColor = "#6b7280";
          if (isOnline && isMoving) {
            if (isOverSpeed) {
              trailColor = "#ef4444";
            } else {
              trailColor = "#22c55e";
            }
          }
          
          return {
            type: 'Feature',
            properties: {
              vehicleId: v.id,
              color: trailColor
            },
            geometry: {
              type: 'LineString',
              coordinates: trails.current[v.id].coordinates
            }
          };
        });

      (map.current.getSource('vehicle-trails') as mapboxgl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: features as any
      });
    }

    // Fit map to show all markers
    if (vehicles.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      vehicles.forEach((vehicle) => {
        const vehicleTelemetry = telemetry[vehicle.id];
        if (vehicleTelemetry?.latitude && vehicleTelemetry?.longitude) {
          bounds.extend([vehicleTelemetry.longitude, vehicleTelemetry.latitude]);
        }
      });
      if (!bounds.isEmpty()) {
        map.current?.fitBounds(bounds, { padding: 50, maxZoom: 14 });
      }
    }
  }, [vehicles, telemetry, isVehicleOnline]);

  // Add CSS for pulse animations
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes pulse {
        0%, 100% { 
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          opacity: 1;
        }
        50% { 
          box-shadow: 0 2px 20px rgba(239, 68, 68, 0.6);
          opacity: 0.8;
        }
      }
      
      @keyframes pulse-subtle {
        0%, 100% { 
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        50% { 
          box-shadow: 0 2px 15px rgba(34, 197, 94, 0.5);
        }
      }
      
      .governor-marker {
        transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Legend */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Map Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow" />
            <span>Moving (Normal)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow" />
            <span>Stopped/Idle</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow" />
            <span>Overspeeding ⚠️</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-orange-500 border-2 border-white shadow" />
            <span>Governor Inactive</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gray-500 border-2 border-white shadow" />
            <span>Offline</span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Map Container */}
        <div className="lg:col-span-3">
          <Card className="overflow-hidden">
            <div ref={mapContainer} className="w-full h-[600px]" />
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Movement Heatmap Control */}
          {organizationId && (
            <MovementHeatmap 
              map={map.current} 
              organizationId={organizationId}
            />
          )}

          {/* GPS Signal Heatmap Control */}
          {organizationId && (
            <GpsSignalHeatmap 
              map={map.current} 
              organizationId={organizationId}
            />
          )}

          {/* Status Summary */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Live Statistics</h3>
            <div className="space-y-4">
              <div>
                <div className="text-2xl font-bold text-success">
                  {vehicles.filter(v => isVehicleOnline(v.id) && v.governorActive).length}
                </div>
                <div className="text-sm text-muted-foreground">Active Governors</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-destructive">
                  {vehicles.filter(v => {
                    const t = telemetry[v.id];
                    return t && (t.speed_kmh || 0) > v.maxSpeed;
                  }).length}
                </div>
                <div className="text-sm text-muted-foreground">Overspeeding Now</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {vehicles.filter(v => isVehicleOnline(v.id)).length}
                </div>
                <div className="text-sm text-muted-foreground">Vehicles Online</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-muted-foreground">
                  {vehicles.filter(v => !isVehicleOnline(v.id)).length}
                </div>
                <div className="text-sm text-muted-foreground">Vehicles Offline</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
