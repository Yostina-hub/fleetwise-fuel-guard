import { useMemo } from "react";
import { format, parseISO, differenceInMinutes } from "date-fns";

interface TelemetryPoint {
  id: string;
  latitude: number | null;
  longitude: number | null;
  speed_kmh: number | null;
  fuel_level_percent: number | null;
  heading: number | null;
  last_communication_at: string;
  engine_on: boolean | null;
}

export interface StopEvent {
  id: string;
  type: "stop" | "speeding" | "idle";
  latitude: number;
  longitude: number;
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  speed?: number;
  description: string;
}

interface UseStopMarkersProps {
  routeData: TelemetryPoint[];
  speedLimit?: number;
}

export const useStopMarkers = ({ routeData, speedLimit = 100 }: UseStopMarkersProps): StopEvent[] => {
  return useMemo(() => {
    if (!routeData || routeData.length < 2) return [];

    const events: StopEvent[] = [];
    let stopStart: TelemetryPoint | null = null;
    let idleStart: TelemetryPoint | null = null;

    for (let i = 0; i < routeData.length; i++) {
      const point = routeData[i];
      const speed = point.speed_kmh || 0;
      const isMoving = speed > 3;
      const isIdle = speed <= 3 && point.engine_on === true;
      const isStopped = speed <= 3 && point.engine_on === false;

      // Detect stop events (engine off, not moving)
      if (isStopped && !stopStart) {
        stopStart = point;
      } else if (!isStopped && stopStart) {
        const duration = differenceInMinutes(
          parseISO(point.last_communication_at),
          parseISO(stopStart.last_communication_at)
        );
        
        if (duration >= 2) { // Only show stops longer than 2 minutes
          events.push({
            id: `stop-${stopStart.id}`,
            type: "stop",
            latitude: stopStart.latitude || 0,
            longitude: stopStart.longitude || 0,
            startTime: stopStart.last_communication_at,
            endTime: point.last_communication_at,
            durationMinutes: duration,
            description: `Stopped for ${formatDuration(duration)}`
          });
        }
        stopStart = null;
      }

      // Detect idle events (engine on, not moving)
      if (isIdle && !idleStart) {
        idleStart = point;
      } else if (!isIdle && idleStart) {
        const duration = differenceInMinutes(
          parseISO(point.last_communication_at),
          parseISO(idleStart.last_communication_at)
        );
        
        if (duration >= 5) { // Only show idles longer than 5 minutes
          events.push({
            id: `idle-${idleStart.id}`,
            type: "idle",
            latitude: idleStart.latitude || 0,
            longitude: idleStart.longitude || 0,
            startTime: idleStart.last_communication_at,
            endTime: point.last_communication_at,
            durationMinutes: duration,
            description: `Idling for ${formatDuration(duration)}`
          });
        }
        idleStart = null;
      }

      // Detect speeding events
      if (speed > speedLimit) {
        // Check if this is a new speeding event
        const lastEvent = events[events.length - 1];
        if (!lastEvent || lastEvent.type !== "speeding" || 
            differenceInMinutes(parseISO(point.last_communication_at), parseISO(lastEvent.startTime)) > 2) {
          events.push({
            id: `speed-${point.id}`,
            type: "speeding",
            latitude: point.latitude || 0,
            longitude: point.longitude || 0,
            startTime: point.last_communication_at,
            speed: speed,
            description: `Speeding: ${speed} km/h (limit: ${speedLimit} km/h)`
          });
        }
      }
    }

    // Handle ongoing stop/idle at end of route
    if (stopStart) {
      const lastPoint = routeData[routeData.length - 1];
      const duration = differenceInMinutes(
        parseISO(lastPoint.last_communication_at),
        parseISO(stopStart.last_communication_at)
      );
      if (duration >= 2) {
        events.push({
          id: `stop-${stopStart.id}`,
          type: "stop",
          latitude: stopStart.latitude || 0,
          longitude: stopStart.longitude || 0,
          startTime: stopStart.last_communication_at,
          endTime: lastPoint.last_communication_at,
          durationMinutes: duration,
          description: `Stopped for ${formatDuration(duration)}`
        });
      }
    }

    if (idleStart) {
      const lastPoint = routeData[routeData.length - 1];
      const duration = differenceInMinutes(
        parseISO(lastPoint.last_communication_at),
        parseISO(idleStart.last_communication_at)
      );
      if (duration >= 5) {
        events.push({
          id: `idle-${idleStart.id}`,
          type: "idle",
          latitude: idleStart.latitude || 0,
          longitude: idleStart.longitude || 0,
          startTime: idleStart.last_communication_at,
          endTime: lastPoint.last_communication_at,
          durationMinutes: duration,
          description: `Idling for ${formatDuration(duration)}`
        });
      }
    }

    return events.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [routeData, speedLimit]);
};

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

export const getEventColor = (type: StopEvent["type"]): string => {
  switch (type) {
    case "stop":
      return "#ef4444"; // red
    case "idle":
      return "#f59e0b"; // amber
    case "speeding":
      return "#dc2626"; // red-600
    default:
      return "#6b7280"; // gray
  }
};

export const getEventIcon = (type: StopEvent["type"]): string => {
  switch (type) {
    case "stop":
      return "🛑";
    case "idle":
      return "⏸️";
    case "speeding":
      return "⚡";
    default:
      return "📍";
  }
};
