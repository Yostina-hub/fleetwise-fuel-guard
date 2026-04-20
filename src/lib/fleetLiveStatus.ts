export type FleetLiveStatus = "moving" | "idle_engine_on" | "idle_engine_off" | "offline";

interface FleetLiveStatusInput {
  device_connected?: boolean | null;
  engine_on?: boolean | null;
  ignition_on?: boolean | null;
  speed_kmh?: number | null;
  last_communication_at?: string | null;
}

interface FleetLiveStatusOptions {
  requireFreshTelemetry?: boolean;
  freshnessWindowMs?: number;
}

export const isTelemetryFresh = (
  lastCommunicationAt?: string | null,
  freshnessWindowMs = 15 * 60 * 1000,
) => {
  if (!lastCommunicationAt) return false;
  return Date.now() - new Date(lastCommunicationAt).getTime() < freshnessWindowMs;
};

export const getFleetLiveStatus = (
  telemetry?: FleetLiveStatusInput | null,
  options: FleetLiveStatusOptions = {},
): FleetLiveStatus => {
  const {
    requireFreshTelemetry = false,
    freshnessWindowMs = 15 * 60 * 1000,
  } = options;

  if (!telemetry?.device_connected) {
    return "offline";
  }

  if (
    requireFreshTelemetry &&
    !isTelemetryFresh(telemetry.last_communication_at, freshnessWindowMs)
  ) {
    return "offline";
  }

  const speed = telemetry.speed_kmh ?? 0;
  const engineOn = Boolean(telemetry.engine_on || telemetry.ignition_on);

  if (speed > 3) {
    return "moving";
  }

  if (engineOn) {
    return "idle_engine_on";
  }

  return "idle_engine_off";
};
