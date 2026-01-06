import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { StopEvent, getEventColor, getEventIcon } from "./StopMarkers";

interface RouteHistoryEventMarkersProps {
  map: mapboxgl.Map | null;
  events: StopEvent[];
  visible: boolean;
}

export const RouteHistoryEventMarkers = ({ 
  map, 
  events, 
  visible 
}: RouteHistoryEventMarkersProps) => {
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    if (!map || !visible || events.length === 0) return;

    // Add markers for each event
    events.forEach(event => {
      const el = document.createElement("div");
      el.className = "event-marker";
      
      const color = getEventColor(event.type);
      const icon = getEventIcon(event.type);
      
      el.style.cssText = `
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: ${color};
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        cursor: pointer;
        font-size: 12px;
        transition: transform 0.2s ease;
      `;
      
      el.innerHTML = icon;
      el.title = event.description;
      
      el.addEventListener("mouseenter", () => {
        el.style.transform = "scale(1.2)";
      });
      
      el.addEventListener("mouseleave", () => {
        el.style.transform = "scale(1)";
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([event.longitude, event.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 15, closeButton: false })
            .setHTML(`
              <div style="padding: 8px; min-width: 150px;">
                <div style="font-weight: 600; margin-bottom: 4px; text-transform: capitalize;">${event.type} Event</div>
                <div style="color: #666; font-size: 12px;">${event.description}</div>
                ${event.durationMinutes ? `<div style="color: #888; font-size: 11px; margin-top: 4px;">Duration: ${event.durationMinutes} min</div>` : ""}
              </div>
            `)
        )
        .addTo(map);

      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
    };
  }, [map, events, visible]);

  return null;
};

export default RouteHistoryEventMarkers;
