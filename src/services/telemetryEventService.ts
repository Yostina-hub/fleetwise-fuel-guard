import { supabase } from "@/integrations/supabase/client";

function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Generates an idempotency key from device IMEI + event timestamp.
 * Prevents duplicate inserts from retried or duplicate GPS pings.
 */
export function generateEventId(deviceImei: string, eventTime: string): string {
  return `${deviceImei}:${new Date(eventTime).toISOString()}`;
}

export interface TelemetryEventInput {
  organizationId: string;
  vehicleId?: string;
  deviceId?: string;
  eventType: string;
  eventTime?: string;
  payload: Record<string, any>;
  lat?: number;
  lng?: number;
  speedKmh?: number;
  heading?: number;
  source?: string;
  eventId?: string; // custom idempotency key
}

/**
 * Insert a single telemetry event into the time-series table.
 * Uses ON CONFLICT to enforce idempotency via event_id + event_time.
 */
export async function insertTelemetryEvent(input: TelemetryEventInput) {
  const eventTime = input.eventTime ?? new Date().toISOString();
  const eventId = input.eventId ?? `evt_${generateUUID()}`;

  const { data, error } = await supabase
    .from("telemetry_events")
    .insert({
      event_id: eventId,
      organization_id: input.organizationId,
      vehicle_id: input.vehicleId ?? null,
      device_id: input.deviceId ?? null,
      event_type: input.eventType,
      event_time: eventTime,
      payload: input.payload,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      speed_kmh: input.speedKmh ?? null,
      heading: input.heading ?? null,
      source: input.source ?? "device",
    })
    .select()
    .single();

  if (error) {
    // Duplicate event — idempotency key match, safe to ignore
    if (error.code === "23505") {
      return { data: null, duplicate: true, error: null };
    }
    throw error;
  }

  return { data, duplicate: false, error: null };
}

/**
 * Batch insert telemetry events. Duplicates are silently skipped.
 */
export async function batchInsertTelemetryEvents(events: TelemetryEventInput[]) {
  const rows = events.map((input) => ({
    event_id: input.eventId ?? `evt_${generateUUID()}`,
    organization_id: input.organizationId,
    vehicle_id: input.vehicleId ?? null,
    device_id: input.deviceId ?? null,
    event_type: input.eventType,
    event_time: input.eventTime ?? new Date().toISOString(),
    payload: input.payload,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    speed_kmh: input.speedKmh ?? null,
    heading: input.heading ?? null,
    source: input.source ?? "device",
  }));

  const { data, error } = await supabase
    .from("telemetry_events")
    .upsert(rows, { onConflict: "event_id,event_time", ignoreDuplicates: true })
    .select();

  if (error) throw error;
  return { data, insertedCount: data?.length ?? 0 };
}
