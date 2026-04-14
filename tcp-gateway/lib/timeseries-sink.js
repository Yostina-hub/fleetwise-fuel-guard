/**
 * Time-Series Data Sink
 * 
 * Dual-write strategy:
 *   1. Fast Lane: publish to Redis/event bus for WebSocket broadcasting
 *   2. Storage Lane: batch-insert into telemetry_events (partitioned table)
 * 
 * Uses the telemetry_events table with JSONB payload column.
 * Idempotency enforced via event_id unique constraint.
 */

const { eventBus } = require('./event-bus');
const { publish, isConnected, CHANNELS } = require('./redis-pubsub');
const { IdempotencyGuard } = require('./idempotency');

const idempotencyGuard = new IdempotencyGuard({ maxSize: 100000, ttlMs: 60000 });

// Batch buffer for time-series writes
const tsBuffer = [];
let flushTimer = null;
const TS_BATCH_SIZE = 100;
const TS_FLUSH_INTERVAL = 10000; // 10s

let pgPool = null;

function init(pool) {
  pgPool = pool;
  flushTimer = setInterval(flushTimeSeriesBatch, TS_FLUSH_INTERVAL);
  if (flushTimer.unref) flushTimer.unref();
}

/**
 * Ingest a telemetry event into the dual-write pipeline.
 * Called from the main gateway after parsing.
 */
function ingest(device, parsed, protocol) {
  if (!device || !parsed) return;

  const timestamp = parsed.timestamp || new Date().toISOString();
  const imei = parsed.imei || '';

  // ── Idempotency Check ──
  const dedupKey = IdempotencyGuard.generateKey(imei, timestamp);
  if (idempotencyGuard.isDuplicate(dedupKey)) {
    return; // Skip duplicate
  }

  const eventId = IdempotencyGuard.eventId(imei, timestamp, protocol);

  // Build event payload (flexible JSONB)
  const payload = {
    imei,
    protocol,
    gps_valid: parsed.gpsValid,
    satellites: parsed.satellites,
    hdop: parsed.hdop,
    altitude: parsed.altitude,
    fuel_level: parsed.fuelLevel,
    engine_on: parsed.ignition || (parsed.speed > 0),
    ignition_on: parsed.ignition,
    odometer_km: parsed.odometer,
    battery_voltage: parsed.batteryVoltage,
    external_voltage: parsed.externalVoltage,
    io_elements: parsed.ioElements,
    alarm_type: parsed.alarmType,
    speed_limit: parsed.speedLimit,
    governor_active: parsed.governorActive,
    raw_hex: parsed.raw?.slice(0, 200), // Truncate for storage
  };

  const event = {
    event_id: eventId,
    organization_id: device.organization_id,
    vehicle_id: device.vehicle_id,
    device_id: device.device_id,
    event_type: parsed.type === 'alarm' ? 'alarm' : (parsed.fuelLevel != null ? 'fuel' : 'gps'),
    event_time: timestamp,
    payload,
    lat: parsed.latitude || parsed.lat || null,
    lng: parsed.longitude || parsed.lng || null,
    speed_kmh: parsed.speed || 0,
    heading: parsed.course || 0,
    source: 'device',
  };

  // ── Fast Lane: Broadcast immediately ──
  const broadcastData = {
    vehicle_id: device.vehicle_id,
    organization_id: device.organization_id,
    device_id: device.device_id,
    latitude: event.lat,
    longitude: event.lng,
    speed_kmh: event.speed_kmh,
    heading: event.heading,
    fuel_level_percent: parsed.fuelLevel,
    engine_on: payload.engine_on,
    ignition_on: parsed.ignition,
    timestamp,
  };

  // Emit to internal event bus (always works)
  eventBus.safeEmit('telemetry.ingested', broadcastData);

  // Publish to Redis if available
  if (isConnected()) {
    publish(CHANNELS.telemetry(device.organization_id), broadcastData);
    if (parsed.type === 'alarm') {
      publish(CHANNELS.alerts(device.organization_id), { ...broadcastData, alarm_type: parsed.alarmType });
    }
    if (parsed.fuelLevel != null) {
      publish(CHANNELS.fuel(device.organization_id), broadcastData);
    }
  }

  // Emit alarm events
  if (parsed.type === 'alarm') {
    eventBus.safeEmit('telemetry.alarm', {
      ...broadcastData,
      alarm_type: parsed.alarmType,
    });
  }

  // ── Storage Lane: Buffer for batch insert ──
  tsBuffer.push(event);
  if (tsBuffer.length >= TS_BATCH_SIZE) {
    flushTimeSeriesBatch();
  }
}

/**
 * Batch-insert buffered events into telemetry_events table.
 * Uses ON CONFLICT to silently skip duplicates.
 */
async function flushTimeSeriesBatch() {
  if (tsBuffer.length === 0 || !pgPool) return;

  const batch = tsBuffer.splice(0);
  
  try {
    const values = [];
    const params = [];
    let idx = 1;

    for (const evt of batch) {
      values.push(`($${idx},$${idx+1},$${idx+2},$${idx+3},$${idx+4},$${idx+5},$${idx+6},$${idx+7},$${idx+8},$${idx+9},$${idx+10},$${idx+11})`);
      params.push(
        evt.event_id,
        evt.organization_id,
        evt.vehicle_id,
        evt.device_id,
        evt.event_type,
        evt.event_time,
        JSON.stringify(evt.payload),
        evt.lat,
        evt.lng,
        evt.speed_kmh,
        evt.heading,
        evt.source,
      );
      idx += 12;
    }

    if (values.length > 0) {
      await pgPool.query(
        `INSERT INTO public.telemetry_events 
         (event_id, organization_id, vehicle_id, device_id, event_type, event_time, payload, lat, lng, speed_kmh, heading, source)
         VALUES ${values.join(',')}
         ON CONFLICT (event_id, event_time) DO NOTHING`,
        params,
      );
    }
  } catch (err) {
    // On failure, try to re-enqueue (with cap)
    if (tsBuffer.length < 1000) {
      tsBuffer.unshift(...batch);
    }
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(), level: 'error', protocol: 'ts-sink',
      message: 'Time-series batch insert failed', error: err.message, batchSize: batch.length,
    }));
  }
}

function getStats() {
  return {
    bufferSize: tsBuffer.length,
    idempotency: idempotencyGuard.getStats(),
  };
}

async function shutdown() {
  clearInterval(flushTimer);
  await flushTimeSeriesBatch(); // Flush remaining
  idempotencyGuard.shutdown();
}

module.exports = { init, ingest, getStats, shutdown };
