import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useMapboxToken } from "@/hooks/useMapboxToken";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Loader2, Droplet, AlertTriangle, Fuel } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface FuelEvent {
  id: string;
  vehicle_id: string;
  event_type: string;
  event_time: string;
  fuel_change_liters: number;
  fuel_change_percent: number;
  location_name?: string | null;
  status?: string | null;
  lat?: number | null;
  lng?: number | null;
}

interface FuelEventsMapViewProps {
  events: FuelEvent[];
  getVehiclePlate: (vehicleId: string) => string;
  formatFuel: (liters: number) => string;
  selectedEventId?: string | null;
  onEventSelect?: (event: FuelEvent) => void;
}

const getEventColor = (type: string): string => {
  switch (type) {
    case "refuel":
      return "#22c55e"; // green
    case "theft":
      return "#ef4444"; // red
    case "drain":
      return "#f97316"; // orange
    case "leak":
      return "#eab308"; // yellow
    default:
      return "#6b7280"; // gray
  }
};

const getEventIcon = (type: string): string => {
  switch (type) {
    case "refuel":
      return "⛽";
    case "theft":
      return "🚨";
    case "drain":
      return "⚠️";
    case "leak":
      return "💧";
    default:
      return "📍";
  }
};

const FuelEventsMapView = ({
  events,
  getVehiclePlate,
  formatFuel,
  selectedEventId,
  onEventSelect,
}: FuelEventsMapViewProps) => {
  const { token: mapboxToken, loading: tokenLoading } = useMapboxToken();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);

  // Filter events with valid coordinates
  const eventsWithCoords = events.filter(
    (e) =>
      e.lat != null &&
      e.lng != null &&
      isFinite(e.lat) &&
      isFinite(e.lng) &&
      e.lat >= -90 &&
      e.lat <= 90 &&
      e.lng >= -180 &&
      e.lng <= 180
  );

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || map.current) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [38.7578, 9.0054], // Default to Addis Ababa
      zoom: 10,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.current.on("load", () => {
      setMapLoaded(true);
    });

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken]);

  // Update markers when events change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    if (eventsWithCoords.length === 0) return;

    // Add markers for each event
    eventsWithCoords.forEach((event) => {
      const el = document.createElement("div");
      el.className = "fuel-event-marker";

      const color = getEventColor(event.event_type);
      const icon = getEventIcon(event.event_type);
      const isSelected = event.id === selectedEventId;

      el.style.cssText = `
        width: ${isSelected ? "36px" : "30px"};
        height: ${isSelected ? "36px" : "30px"};
        display: flex;
        align-items: center;
        justify-content: center;
        background: ${color};
        border-radius: 50%;
        border: ${isSelected ? "3px" : "2px"} solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        cursor: pointer;
        font-size: ${isSelected ? "16px" : "14px"};
        transition: all 0.2s ease;
        z-index: ${isSelected ? 100 : 10};
      `;

      el.innerHTML = icon;

      el.addEventListener("mouseenter", () => {
        el.style.transform = "scale(1.2)";
        el.style.zIndex = "100";
      });

      el.addEventListener("mouseleave", () => {
        if (event.id !== selectedEventId) {
          el.style.transform = "scale(1)";
          el.style.zIndex = "10";
        }
      });

      el.addEventListener("click", () => {
        onEventSelect?.(event);
      });

      const popupContent = `
        <div style="padding: 8px; min-width: 180px; font-family: system-ui, sans-serif;">
          <div style="font-weight: 600; font-size: 14px; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
            <span>${icon}</span>
            <span style="text-transform: capitalize;">${event.event_type}</span>
          </div>
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
            <strong>${getVehiclePlate(event.vehicle_id)}</strong>
          </div>
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
            ${format(new Date(event.event_time), "dd MMM yyyy, HH:mm")}
          </div>
          <div style="font-size: 14px; font-weight: 600; color: ${event.fuel_change_liters > 0 ? "#22c55e" : "#ef4444"};">
            ${event.fuel_change_liters > 0 ? "+" : ""}${formatFuel(event.fuel_change_liters)}
          </div>
          ${event.location_name ? `<div style="font-size: 11px; color: #888; margin-top: 4px;">${event.location_name}</div>` : ""}
        </div>
      `;

      const popup = new mapboxgl.Popup({
        offset: 20,
        closeButton: false,
        closeOnClick: false,
      }).setHTML(popupContent);

      const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([event.lng!, event.lat!])
        .setPopup(popup)
        .addTo(map.current!);

      // Show popup on hover
      el.addEventListener("mouseenter", () => popup.addTo(map.current!));
      el.addEventListener("mouseleave", () => popup.remove());

      markersRef.current.set(event.id, marker);
    });

    // Fit bounds to show all markers
    if (eventsWithCoords.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      eventsWithCoords.forEach((event) => {
        bounds.extend([event.lng!, event.lat!]);
      });
      map.current.fitBounds(bounds, {
        padding: 60,
        maxZoom: 14,
      });
    }
  }, [eventsWithCoords, mapLoaded, selectedEventId, getVehiclePlate, formatFuel, onEventSelect]);

  // Focus on selected event
  useEffect(() => {
    if (!map.current || !selectedEventId) return;

    const event = eventsWithCoords.find((e) => e.id === selectedEventId);
    if (event?.lat && event?.lng) {
      map.current.flyTo({
        center: [event.lng, event.lat],
        zoom: 15,
        duration: 1000,
      });

      // Open popup
      const marker = markersRef.current.get(selectedEventId);
      if (marker) {
        marker.togglePopup();
      }
    }
  }, [selectedEventId, eventsWithCoords]);

  if (tokenLoading) {
    return (
      <Card className="h-[500px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </Card>
    );
  }

  if (!mapboxToken) {
    return (
      <Card className="h-[500px] flex items-center justify-center">
        <CardContent className="text-center text-muted-foreground">
          <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Map token not available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Map container */}
      <Card className="overflow-hidden">
        <div ref={mapContainer} className="h-[500px] w-full" />
      </Card>

      {/* Legend & Stats */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full bg-success" />
          <span className="text-muted-foreground">Refuel</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full bg-destructive" />
          <span className="text-muted-foreground">Theft</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full bg-warning" />
          <span className="text-muted-foreground">Drain</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full bg-warning/70" />
          <span className="text-muted-foreground">Leak</span>
        </div>
        <div className="ml-auto text-muted-foreground">
          {eventsWithCoords.length} of {events.length} events have location data
        </div>
      </div>

      {/* Events without location */}
      {events.length > 0 && eventsWithCoords.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium text-muted-foreground">No Location Data</h3>
            <p className="text-sm text-muted-foreground/70 mt-1">
              None of the fuel events have GPS coordinates recorded
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FuelEventsMapView;
