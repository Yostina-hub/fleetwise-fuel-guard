import { Activity, Pause, PowerOff, WifiOff, Square, type LucideIcon } from "lucide-react";
import type { FleetLiveStatus } from "./fleetLiveStatus";

/**
 * Extended live-status type used in the UI. Mirrors `FleetLiveStatus` but adds
 * a synthetic "stopped" — vehicles that are connected, speed=0, engine off,
 * but were moving very recently. We don't get a separate signal for it from
 * telemetry, so for now the table shows the 4 canonical states.
 */
export type VehicleLiveStatusKey = FleetLiveStatus | "stopped";

export interface VehicleLiveStatusMeta {
  /** Short label shown in the badge */
  label: string;
  /** Slightly longer description for tooltips */
  description: string;
  /** Lucide icon used in the badge & lists */
  icon: LucideIcon;
  /** Tailwind class set for the badge container (background + text + border) */
  className: string;
  /** Tailwind class for the small status dot */
  dotClass: string;
}

export const VEHICLE_LIVE_STATUS_META: Record<VehicleLiveStatusKey, VehicleLiveStatusMeta> = {
  moving: {
    label: "Driving",
    description: "Engine on, moving above 3 km/h",
    icon: Activity,
    className: "bg-success/10 text-success border-success/30",
    dotClass: "bg-success animate-pulse",
  },
  idle_engine_on: {
    label: "Idle (Engine On)",
    description: "Stationary with engine running — burning fuel while idling",
    icon: Pause,
    className: "bg-warning/10 text-warning border-warning/30",
    dotClass: "bg-warning",
  },
  idle_engine_off: {
    label: "Idle (Engine Off)",
    description: "Stationary with engine off — parked",
    icon: PowerOff,
    className: "bg-primary/10 text-primary border-primary/30",
    dotClass: "bg-primary",
  },
  stopped: {
    label: "Stopped",
    description: "Recently stopped, engine off",
    icon: Square,
    className: "bg-muted text-muted-foreground border-border",
    dotClass: "bg-muted-foreground",
  },
  offline: {
    label: "Offline",
    description: "No telemetry — device not communicating",
    icon: WifiOff,
    className: "bg-destructive/10 text-destructive border-destructive/30",
    dotClass: "bg-destructive",
  },
};

export const getVehicleLiveStatusMeta = (
  key: VehicleLiveStatusKey | string | null | undefined,
): VehicleLiveStatusMeta => {
  if (!key) return VEHICLE_LIVE_STATUS_META.offline;
  return VEHICLE_LIVE_STATUS_META[key as VehicleLiveStatusKey] ?? VEHICLE_LIVE_STATUS_META.offline;
};
