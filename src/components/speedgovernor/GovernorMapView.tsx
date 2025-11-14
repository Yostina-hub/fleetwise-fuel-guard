import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { VehicleTelemetry } from "@/hooks/useVehicleTelemetry";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

export const GovernorMapView = ({ vehicles, telemetry, isVehicleOnline }: GovernorMapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<Record<string, mapboxgl.Marker>>({});
  const [mapboxToken, setMapboxToken] = useState<string>("");

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

      // Create custom marker HTML
      const el = document.createElement("div");
      el.className = "governor-marker";
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
        font-size: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
      `;
      el.innerHTML = isOverSpeed ? "⚠️" : "🚗";

      // Pulse animation for overspeeding vehicles
      if (isOverSpeed) {
        el.style.animation = "pulse 1.5s infinite";
      }

      // Create or update marker
      if (markers.current[vehicle.id]) {
        // Update existing marker
        markers.current[vehicle.id]
          .setLngLat([vehicleTelemetry.longitude, vehicleTelemetry.latitude])
          .getElement().innerHTML = el.innerHTML;
        markers.current[vehicle.id].getElement().style.backgroundColor = markerColor;
        markers.current[vehicle.id].getElement().style.animation = isOverSpeed ? "pulse 1.5s infinite" : "";
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
              ${isOverSpeed ? '<div style="margin-top: 8px; padding: 6px; background: #fef2f2; border-radius: 4px; color: #ef4444; font-weight: 600; text-align: center;">⚠️ OVERSPEEDING!</div>' : ''}
            </div>
          </div>
        `);

        marker.setPopup(popup);
        markers.current[vehicle.id] = marker;
      }
    });

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

  // Add CSS for pulse animation
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.8; }
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

      {/* Map Container */}
      <Card className="overflow-hidden">
        <div ref={mapContainer} className="w-full h-[600px]" />
      </Card>

      {/* Status Summary */}
      <Card className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">
              {vehicles.filter(v => isVehicleOnline(v.id) && v.governorActive).length}
            </div>
            <div className="text-sm text-muted-foreground">Active Governors</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">
              {vehicles.filter(v => {
                const t = telemetry[v.id];
                return t && (t.speed_kmh || 0) > v.maxSpeed;
              }).length}
            </div>
            <div className="text-sm text-muted-foreground">Overspeeding Now</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {vehicles.filter(v => isVehicleOnline(v.id)).length}
            </div>
            <div className="text-sm text-muted-foreground">Vehicles Online</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-600">
              {vehicles.filter(v => !isVehicleOnline(v.id)).length}
            </div>
            <div className="text-sm text-muted-foreground">Vehicles Offline</div>
          </div>
        </div>
      </Card>
    </div>
  );
};
