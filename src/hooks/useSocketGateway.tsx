import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useOrganization } from "./useOrganization";

/**
 * Configuration for the Socket.io gateway connection.
 * The gateway URL should be set via environment variable.
 * Falls back gracefully if not configured (Supabase Realtime remains primary).
 */
const SOCKET_GATEWAY_URL = import.meta.env.VITE_SOCKET_GATEWAY_URL || "";

export interface SocketTelemetryEvent {
  vehicle_id: string;
  device_id?: string;
  latitude?: number;
  longitude?: number;
  speed_kmh?: number;
  heading?: number;
  fuel_level_percent?: number;
  engine_on?: boolean;
  ignition_on?: boolean;
  device_connected?: boolean;
  last_communication_at?: string;
  altitude_meters?: number;
  odometer_km?: number;
  gps_satellites_count?: number;
  gps_signal_strength?: number;
  gps_jamming_detected?: boolean;
  gps_spoofing_detected?: boolean;
  event_type?: string;
  payload?: Record<string, unknown>;
}

export interface SocketAlertEvent {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  vehicle_id?: string;
  driver_id?: string;
  lat?: number;
  lng?: number;
}

interface UseSocketGatewayOptions {
  /** Called when a telemetry update arrives */
  onTelemetry?: (data: SocketTelemetryEvent) => void;
  /** Called when a new alert arrives */
  onAlert?: (data: SocketAlertEvent) => void;
  /** Enable/disable the connection (default: true if URL is configured) */
  enabled?: boolean;
}

interface SocketGatewayState {
  connected: boolean;
  transport: string | null;
  error: string | null;
  lastEventAt: string | null;
  eventCount: number;
}

/**
 * Hook to connect to the TCP gateway's Socket.io real-time server.
 * 
 * This provides a SUPPLEMENTARY real-time channel alongside Supabase Realtime.
 * - Socket.io: Sub-second updates direct from the TCP gateway (Fast Lane)
 * - Supabase Realtime: Database-backed updates (Storage Lane, guaranteed delivery)
 * 
 * If VITE_SOCKET_GATEWAY_URL is not set, the hook is a no-op.
 */
export function useSocketGateway(options: UseSocketGatewayOptions = {}) {
  const { organizationId } = useOrganization();
  const { onTelemetry, onAlert, enabled = true } = options;
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<SocketGatewayState>({
    connected: false,
    transport: null,
    error: null,
    lastEventAt: null,
    eventCount: 0,
  });

  // Store callbacks in refs to avoid reconnection on callback changes
  const onTelemetryRef = useRef(onTelemetry);
  const onAlertRef = useRef(onAlert);
  useEffect(() => { onTelemetryRef.current = onTelemetry; }, [onTelemetry]);
  useEffect(() => { onAlertRef.current = onAlert; }, [onAlert]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
      setState(prev => ({ ...prev, connected: false, transport: null }));
    }
  }, []);

  useEffect(() => {
    // Guard: no URL configured or disabled
    if (!SOCKET_GATEWAY_URL || !enabled || !organizationId) {
      disconnect();
      return;
    }

    // Prevent duplicate connections
    if (socketRef.current?.connected) return;

    const socket = io(SOCKET_GATEWAY_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30000,
      timeout: 10000,
      query: {
        organization_id: organizationId,
      },
    });

    socketRef.current = socket;

    // ── Connection Events ──
    socket.on("connect", () => {
      console.log("[SocketGateway] Connected:", socket.id);
      setState(prev => ({
        ...prev,
        connected: true,
        transport: socket.io.engine?.transport?.name || "websocket",
        error: null,
      }));

      // Join org-scoped room
      socket.emit("join:organization", { organization_id: organizationId });
    });

    socket.on("disconnect", (reason) => {
      console.log("[SocketGateway] Disconnected:", reason);
      setState(prev => ({ ...prev, connected: false }));
    });

    socket.on("connect_error", (err) => {
      console.warn("[SocketGateway] Connection error:", err.message);
      setState(prev => ({ ...prev, error: err.message, connected: false }));
    });

    // ── Telemetry Events (Fast Lane) ──
    socket.on("telemetry:update", (data: SocketTelemetryEvent) => {
      setState(prev => ({
        ...prev,
        lastEventAt: new Date().toISOString(),
        eventCount: prev.eventCount + 1,
      }));
      onTelemetryRef.current?.(data);
    });

    // ── Alert Events ──
    socket.on("alert:new", (data: SocketAlertEvent) => {
      onAlertRef.current?.(data);
    });

    // ── Geofence Events ──
    socket.on("geofence:event", (data: unknown) => {
      // Geofence events are handled via Supabase Realtime primarily
      // Socket.io provides faster notification
      console.debug("[SocketGateway] Geofence event:", data);
    });

    return () => {
      disconnect();
    };
  }, [organizationId, enabled, SOCKET_GATEWAY_URL]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    ...state,
    isAvailable: !!SOCKET_GATEWAY_URL,
    socket: socketRef.current,
    disconnect,
  };
}
