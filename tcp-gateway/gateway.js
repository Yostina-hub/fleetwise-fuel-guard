/**
 * TCP/UDP Gateway for GPS Devices
 * 
 * Writes parsed telemetry DIRECTLY to PostgreSQL using connection pooling
 * and batch inserts. No edge function dependency - eliminates 503 errors.
 * 
 * Supported Protocols with FULL PARSING:
 * - GT06/Concox (Binary) - Port 5001 (TCP+UDP)
 * - TK103 (Text) - Port 5013 (TCP+UDP)
 * - H02/Sinotrack (Text) - Port 5023 (TCP+UDP)
 * - Teltonika Codec 8/8E (Binary) - Port 5027 (TCP)
 * - Queclink (Text) - Port 5030 (TCP)
 * - Ruptela (Binary) - Port 5031 (TCP)
 * - YTWL Speed Governor (Text) - Port 5032 (TCP)
 * 
 * Environment variables:
 *   DATABASE_URL - PostgreSQL connection string (required)
 *   GT06_PORT, TK103_PORT, H02_PORT, TELTONIKA_PORT, QUECLINK_PORT, RUPTELA_PORT, YTWL_PORT
 *   HEALTH_PORT - Health check HTTP port (default: 8080)
 *   LOG_LEVEL - debug, info, warn, error (default: info)
 *   BATCH_INTERVAL_MS - How often to flush batch (default: 5000)
 *   BATCH_SIZE - Max records before auto-flush (default: 50)
 */

const net = require('net');
const dgram = require('dgram');
const http = require('http');
const https = require('https');
const { Pool } = require('pg');

// Configuration from environment
const config = {
  databaseUrl: process.env.DATABASE_URL || '',
  gatewaySharedKey: process.env.GATEWAY_SHARED_KEY || '',
  logLevel: process.env.LOG_LEVEL || 'info',
  batchIntervalMs: parseInt(process.env.BATCH_INTERVAL_MS) || 5000,
  batchSize: parseInt(process.env.BATCH_SIZE) || 50,
  // NestJS Telemetry Gateway forwarding
  nestjsGatewayUrl: process.env.NESTJS_GATEWAY_URL || '',
  forwardToNestjs: process.env.FORWARD_TO_NESTJS === 'true',
  ports: {
    gt06: parseInt(process.env.GT06_PORT) || 5001,
    tk103: parseInt(process.env.TK103_PORT) || 5013,
    h02: parseInt(process.env.H02_PORT) || 5023,
    teltonika: parseInt(process.env.TELTONIKA_PORT) || 5027,
    queclink: parseInt(process.env.QUECLINK_PORT) || 5030,
    ruptela: parseInt(process.env.RUPTELA_PORT) || 5031,
    ytwl: parseInt(process.env.YTWL_PORT) || 5032,
    health: parseInt(process.env.HEALTH_PORT) || 8080
  }
};

// ==================== NESTJS GATEWAY FORWARDING ====================

const nestjsForwardQueue = []; // Buffer for async forwarding
let nestjsHealthy = true;
let nestjsFailCount = 0;
const NESTJS_CIRCUIT_BREAK_THRESHOLD = 5;
const NESTJS_CIRCUIT_BREAK_RESET_MS = 30000;

/**
 * Forward parsed telemetry to NestJS gateway for advanced processing
 * (fuel detection, geofence checks, event detection, analytics).
 * Fire-and-forget: does NOT block the main ingestion pipeline.
 */
function forwardToNestjs(device, parsed, protocol) {
  if (!config.forwardToNestjs || !config.nestjsGatewayUrl || !nestjsHealthy) return;

  const payload = JSON.stringify({
    imei: device.imei || '',
    vehicle_id: device.vehicle_id,
    organization_id: device.organization_id,
    latitude: parsed.lat,
    longitude: parsed.lng,
    speed_kmh: parsed.speed || 0,
    heading: parsed.course || 0,
    fuel_level_percent: parsed.fuelLevel,
    engine_on: parsed.ignition || (parsed.speed > 0),
    ignition_on: parsed.ignition,
    altitude_meters: parsed.altitude,
    odometer_km: parsed.odometer,
    gps_satellites_count: parsed.satellites,
    gps_hdop: parsed.hdop,
    gps_fix_type: parsed.gpsFix,
    protocol: protocol,
    timestamp: parsed.timestamp || new Date().toISOString(),
  });

  const url = new URL(`${config.nestjsGatewayUrl}/api/v1/gps/ingest`);
  const isHttps = url.protocol === 'https:';
  const reqModule = isHttps ? https : http;

  const req = reqModule.request({
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-gateway-key': config.gatewaySharedKey,
      'Content-Length': Buffer.byteLength(payload),
    },
    timeout: 5000,
  }, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        nestjsFailCount = 0;
        if (!nestjsHealthy) {
          nestjsHealthy = true;
          log('info', 'nestjs', 'NestJS gateway recovered');
        }
      } else {
        log('warn', 'nestjs', `NestJS forward returned ${res.statusCode}`, { body: body.slice(0, 200) });
        nestjsFailCount++;
      }
    });
  });

  req.on('error', (err) => {
    nestjsFailCount++;
    log('warn', 'nestjs', `NestJS forward error: ${err.message}`);
    if (nestjsFailCount >= NESTJS_CIRCUIT_BREAK_THRESHOLD) {
      nestjsHealthy = false;
      log('error', 'nestjs', `Circuit breaker OPEN after ${nestjsFailCount} failures. Pausing for ${NESTJS_CIRCUIT_BREAK_RESET_MS}ms`);
      setTimeout(() => {
        nestjsHealthy = true;
        nestjsFailCount = 0;
        log('info', 'nestjs', 'Circuit breaker CLOSED, retrying NestJS forwarding');
      }, NESTJS_CIRCUIT_BREAK_RESET_MS);
    }
  });

  req.on('timeout', () => {
    req.destroy();
    nestjsFailCount++;
  });

  req.write(payload);
  req.end();

  // Also forward fuel readings if present
  if (parsed.fuelLevel != null && device.vehicle_id) {
    forwardFuelToNestjs(device, parsed, protocol);
  }
}

function forwardFuelToNestjs(device, parsed, protocol) {
  if (!config.forwardToNestjs || !config.nestjsGatewayUrl || !nestjsHealthy) return;

  const payload = JSON.stringify({
    imei: device.imei || '',
    vehicle_id: device.vehicle_id,
    organization_id: device.organization_id,
    fuel_level_percent: parsed.fuelLevel,
    latitude: parsed.lat,
    longitude: parsed.lng,
    speed_kmh: parsed.speed || 0,
    engine_on: parsed.ignition || false,
    ignition_on: parsed.ignition,
    timestamp: parsed.timestamp || new Date().toISOString(),
  });

  const url = new URL(`${config.nestjsGatewayUrl}/api/v1/fuel/stream`);
  const isHttps = url.protocol === 'https:';
  const reqModule = isHttps ? https : http;

  const req = reqModule.request({
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-gateway-key': config.gatewaySharedKey,
      'Content-Length': Buffer.byteLength(payload),
    },
    timeout: 5000,
  }, () => {}); // fire-and-forget

  req.on('error', () => {}); // silent
  req.write(payload);
  req.end();
}

function forwardGeofenceToNestjs(device, parsed) {
  if (!config.forwardToNestjs || !config.nestjsGatewayUrl || !nestjsHealthy) return;
  if (!parsed.lat || !parsed.lng || !device.vehicle_id) return;

  const payload = JSON.stringify({
    vehicle_id: device.vehicle_id,
    organization_id: device.organization_id,
    latitude: parsed.lat,
    longitude: parsed.lng,
    speed_kmh: parsed.speed || 0,
    timestamp: parsed.timestamp || new Date().toISOString(),
  });

  const url = new URL(`${config.nestjsGatewayUrl}/api/v1/geofence/check`);
  const isHttps = url.protocol === 'https:';
  const reqModule = isHttps ? https : http;

  const req = reqModule.request({
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-gateway-key': config.gatewaySharedKey,
      'Content-Length': Buffer.byteLength(payload),
    },
    timeout: 5000,
  }, () => {});

  req.on('error', () => {});
  req.write(payload);
  req.end();
}

// ==================== DATABASE CONNECTION POOL ====================

const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,               // Max 10 connections (leaves room for app/realtime)
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: config.databaseUrl.includes('sslmode=') ? undefined : { rejectUnauthorized: false }
});

pool.on('error', (err) => {
  log('error', 'db', 'Pool error', { error: err.message });
});

// ==================== IMEI → DEVICE CACHE ====================
// Persists for the lifetime of the gateway process (no cold starts!)

const imeiCache = new Map(); // imei → { device_id, vehicle_id, organization_id, cachedAt }
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const NEGATIVE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 min for "not found"

// Auto-provision: if enabled, create device record on first IMEI contact
const AUTO_PROVISION = process.env.AUTO_PROVISION !== 'false'; // default: true
const DEFAULT_ORG_ID = process.env.DEFAULT_ORGANIZATION_ID || '';

// Map protocol ports to tracker model names for auto-provisioned devices
function getTrackerModelFromProtocol(protocol) {
  const models = {
    gt06: 'GT06/Concox', tk103: 'Coban TK103', h02: 'Sinotrack/H02',
    teltonika: 'Teltonika', queclink: 'Queclink', ruptela: 'Ruptela',
    ytwl: 'YTWL Speed Governor'
  };
  return models[protocol] || protocol || 'Unknown';
}

async function autoProvisionDevice(imei, protocol) {
  if (!AUTO_PROVISION || !DEFAULT_ORG_ID) {
    log('warn', 'provision', 'Auto-provision skipped (disabled or no DEFAULT_ORGANIZATION_ID)', { imei });
    return null;
  }

  try {
    const res = await pool.query(
      `INSERT INTO public.devices (imei, tracker_model, organization_id, status, notes)
       VALUES ($1, $2, $3, 'active', 'Auto-provisioned by gateway on first connect')
       ON CONFLICT (imei, organization_id) DO UPDATE SET status = 'active', last_heartbeat = now()
       RETURNING id AS device_id, vehicle_id, organization_id`,
      [imei, getTrackerModelFromProtocol(protocol), DEFAULT_ORG_ID]
    );

    if (res.rows.length > 0) {
      const row = res.rows[0];
      log('info', 'provision', `Auto-provisioned device: ${imei}`, { device_id: row.device_id, protocol });
      const entry = {
        device_id: row.device_id,
        vehicle_id: row.vehicle_id,
        organization_id: row.organization_id,
        cachedAt: Date.now()
      };
      imeiCache.set(imei, entry);
      return entry;
    }
  } catch (err) {
    log('error', 'provision', 'Auto-provision failed', { imei, error: err.message });
  }
  return null;
}

async function resolveDevice(imei, protocol) {
  const cached = imeiCache.get(imei);
  if (cached) {
    if (Date.now() - cached.cachedAt < (cached.notFound ? NEGATIVE_CACHE_TTL_MS : CACHE_TTL_MS)) {
      return cached.notFound ? null : cached;
    }
    imeiCache.delete(imei);
  }

  try {
    const res = await pool.query(
      `SELECT d.id AS device_id, d.vehicle_id, d.organization_id
       FROM public.devices d WHERE d.imei = $1 LIMIT 1`,
      [imei]
    );
    if (res.rows.length > 0) {
      const row = res.rows[0];
      const entry = {
        device_id: row.device_id,
        vehicle_id: row.vehicle_id,
        organization_id: row.organization_id,
        cachedAt: Date.now()
      };
      imeiCache.set(imei, entry);
      return entry;
    } else {
      // Auto-provision: register this new IMEI automatically
      const provisioned = await autoProvisionDevice(imei, protocol);
      if (provisioned) return provisioned;

      imeiCache.set(imei, { notFound: true, cachedAt: Date.now() });
      log('warn', 'db', 'Device not found and auto-provision unavailable', { imei });
      return null;
    }
  } catch (err) {
    log('error', 'db', 'IMEI lookup failed', { imei, error: err.message });
    return null;
  }
}

// Preload all devices on startup
async function preloadDeviceCache() {
  try {
    const res = await pool.query(
      `SELECT imei, id AS device_id, vehicle_id, organization_id FROM public.devices WHERE status = 'active'`
    );
    for (const row of res.rows) {
      imeiCache.set(row.imei, {
        device_id: row.device_id,
        vehicle_id: row.vehicle_id,
        organization_id: row.organization_id,
        cachedAt: Date.now()
      });
    }
    log('info', 'db', `Preloaded ${res.rows.length} devices into cache`);
  } catch (err) {
    log('error', 'db', 'Failed to preload cache', { error: err.message });
  }
}

// ==================== BATCH WRITE BUFFER ====================

const telemetryBuffer = [];       // { device, parsed, rawHex, protocol }
const heartbeatBuffer = new Map(); // device_id → timestamp (deduplicated)
let flushTimer = null;

function enqueueTelemetry(device, parsed, rawHex, protocol) {
  telemetryBuffer.push({ device, parsed, rawHex, protocol });
  if (telemetryBuffer.length >= config.batchSize) {
    flushBatch();
  }
  // Forward to NestJS for advanced processing (fire-and-forget)
  forwardToNestjs(device, parsed, protocol);
  forwardGeofenceToNestjs(device, parsed);
}

function enqueueHeartbeat(deviceId) {
  heartbeatBuffer.set(deviceId, new Date().toISOString());
}

async function flushBatch() {
  // Swap buffers atomically
  const batch = telemetryBuffer.splice(0);
  const heartbeats = new Map(heartbeatBuffer);
  heartbeatBuffer.clear();

  if (batch.length === 0 && heartbeats.size === 0) return;

  const client = await pool.connect().catch(err => {
    log('error', 'db', 'Cannot get connection for flush', { error: err.message });
    // Put items back
    telemetryBuffer.unshift(...batch);
    for (const [k, v] of heartbeats) heartbeatBuffer.set(k, v);
    return null;
  });
  if (!client) return;

  try {
    await client.query('BEGIN');

    // 1) Batch upsert vehicle_telemetry (one row per vehicle, latest wins)
    if (batch.length > 0) {
      // Group by vehicle_id, keep latest per vehicle
      const latestByVehicle = new Map();
      for (const item of batch) {
        if (!item.device.vehicle_id) continue;
        const existing = latestByVehicle.get(item.device.vehicle_id);
        if (!existing || (item.parsed.timestamp && (!existing.parsed.timestamp || item.parsed.timestamp > existing.parsed.timestamp))) {
          latestByVehicle.set(item.device.vehicle_id, item);
        }
      }

      for (const [vehicleId, item] of latestByVehicle) {
        const p = item.parsed;
        const d = item.device;
        const now = p.timestamp || new Date().toISOString();

        // Validate and clamp values
        const speedKmh = clamp(p.speed || 0, 0, 300);
        const heading = clamp(p.course || 0, 0, 360);
        const altitude = p.altitude != null ? clamp(p.altitude, -500, 9000) : null;
        const fuelLevel = p.fuelLevel != null ? clamp(p.fuelLevel, 0, 100) : null;
        const ignition = p.ignition != null ? p.ignition : (speedKmh > 0 ? true : null);
        const engineOn = ignition || speedKmh > 0;

        await client.query(
          `INSERT INTO public.vehicle_telemetry (
            vehicle_id, organization_id, latitude, longitude, speed_kmh, heading,
            fuel_level_percent, engine_on, ignition_on, device_connected,
            last_communication_at, altitude_meters, gps_satellites_count,
            gps_signal_strength, gps_hdop, battery_voltage, external_voltage,
            io_elements, updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,$10,$11,$12,$13,$14,$15,$16,$17,now())
          ON CONFLICT (vehicle_id) DO UPDATE SET
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            speed_kmh = EXCLUDED.speed_kmh,
            heading = EXCLUDED.heading,
            fuel_level_percent = COALESCE(EXCLUDED.fuel_level_percent, vehicle_telemetry.fuel_level_percent),
            engine_on = EXCLUDED.engine_on,
            ignition_on = COALESCE(EXCLUDED.ignition_on, vehicle_telemetry.ignition_on),
            device_connected = true,
            last_communication_at = EXCLUDED.last_communication_at,
            altitude_meters = COALESCE(EXCLUDED.altitude_meters, vehicle_telemetry.altitude_meters),
            gps_satellites_count = COALESCE(EXCLUDED.gps_satellites_count, vehicle_telemetry.gps_satellites_count),
            gps_signal_strength = COALESCE(EXCLUDED.gps_signal_strength, vehicle_telemetry.gps_signal_strength),
            gps_hdop = COALESCE(EXCLUDED.gps_hdop, vehicle_telemetry.gps_hdop),
            battery_voltage = COALESCE(EXCLUDED.battery_voltage, vehicle_telemetry.battery_voltage),
            external_voltage = COALESCE(EXCLUDED.external_voltage, vehicle_telemetry.external_voltage),
            io_elements = COALESCE(EXCLUDED.io_elements, vehicle_telemetry.io_elements),
            updated_at = now()`,
          [
            vehicleId, d.organization_id, p.latitude, p.longitude,
            speedKmh, heading, fuelLevel, engineOn, ignition,
            now, altitude, p.satellites || null, p.gsmSignal || null,
            p.hdop || null, p.batteryVoltage || null, p.externalVoltage || null,
            p.ioElements ? JSON.stringify(p.ioElements) : null
          ]
        );
      }

      // 2) Batch insert into telemetry_raw for audit trail
      if (batch.length <= 100) {
        const rawValues = [];
        const rawParams = [];
        let paramIdx = 1;
        for (const item of batch) {
          rawValues.push(`($${paramIdx},$${paramIdx+1},$${paramIdx+2},$${paramIdx+3},$${paramIdx+4},$${paramIdx+5},now(),'processed',now())`);
          rawParams.push(
            item.device.organization_id,
            item.device.device_id,
            item.protocol,
            item.rawHex,
            JSON.stringify(item.parsed),
            new Date().toISOString()
          );
          paramIdx += 6;
        }
        if (rawValues.length > 0) {
          await client.query(
            `INSERT INTO public.telemetry_raw (organization_id, device_id, protocol, raw_hex, parsed_payload, received_at, processing_status, processed_at)
             VALUES ${rawValues.join(',')}`,
            rawParams
          );
        }
      }

      stats.db.telemetryWrites += latestByVehicle.size;
      stats.db.rawWrites += batch.length;
      log('info', 'db', 'Batch flushed', { telemetry: latestByVehicle.size, raw: batch.length });
    }

    // 3) Batch heartbeat updates
    if (heartbeats.size > 0) {
      const ids = Array.from(heartbeats.keys());
      await client.query(
        `UPDATE public.devices SET last_heartbeat = now(), status = 'active', updated_at = now()
         WHERE id = ANY($1::uuid[])`,
        [ids]
      );
      stats.db.heartbeats += heartbeats.size;
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    log('error', 'db', 'Batch flush failed', { error: err.message, batchSize: batch.length });
    stats.db.errors++;
    // Re-enqueue on failure (with limit to prevent infinite growth)
    if (telemetryBuffer.length < 500) {
      telemetryBuffer.unshift(...batch);
    }
  } finally {
    client.release();
  }
}

function clamp(val, min, max) {
  if (val == null || isNaN(val)) return null;
  return Math.max(min, Math.min(max, val));
}

// Start periodic flush
flushTimer = setInterval(flushBatch, config.batchIntervalMs);

// Statistics per protocol
const stats = {
  gt06: { received: 0, forwarded: 0, errors: 0, parsed: 0 },
  tk103: { received: 0, forwarded: 0, errors: 0, parsed: 0 },
  h02: { received: 0, forwarded: 0, errors: 0, parsed: 0 },
  teltonika: { received: 0, forwarded: 0, errors: 0, parsed: 0 },
  queclink: { received: 0, forwarded: 0, errors: 0, parsed: 0 },
  ruptela: { received: 0, forwarded: 0, errors: 0, parsed: 0 },
  ytwl: { received: 0, forwarded: 0, errors: 0, parsed: 0 },
  db: { telemetryWrites: 0, rawWrites: 0, heartbeats: 0, errors: 0, cacheHits: 0, cacheMisses: 0 },
  startTime: new Date()
};

// Logging helper
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
function log(level, protocol, message, data = {}) {
  if (LOG_LEVELS[level] >= LOG_LEVELS[config.logLevel]) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      protocol,
      message,
      ...data
    }));
  }
}

// ==================== PROTOCOL PARSERS ====================

function parseGT06(buffer) {
  try {
    if (buffer.length < 5) return null;
    const startByte = buffer.readUInt16BE(0);
    if (startByte !== 0x7878 && startByte !== 0x7979) return null;
    const isExtended = startByte === 0x7979;
    const lengthOffset = 2;
    const length = isExtended ? buffer.readUInt16BE(lengthOffset) : buffer.readUInt8(lengthOffset);
    const protocolOffset = isExtended ? 4 : 3;
    const protocolNumber = buffer.readUInt8(protocolOffset);
    const result = { protocol: 'gt06', protocolNumber, raw: buffer.toString('hex') };
    if (protocolNumber === 0x01) {
      result.type = 'login';
      const imeiBytes = buffer.slice(protocolOffset + 1, protocolOffset + 9);
      result.imei = imeiBytes.toString('hex').replace(/^0+/, '');
      log('info', 'gt06', 'Login packet', { imei: result.imei });
    } else if (protocolNumber === 0x12 || protocolNumber === 0x22) {
      result.type = 'location';
      const d = protocolOffset + 1;
      result.timestamp = new Date(
        2000 + buffer.readUInt8(d), buffer.readUInt8(d + 1) - 1, buffer.readUInt8(d + 2),
        buffer.readUInt8(d + 3), buffer.readUInt8(d + 4), buffer.readUInt8(d + 5)
      ).toISOString();
      result.satellites = buffer.readUInt8(d + 6) & 0x0F;
      result.latitude = buffer.readUInt32BE(d + 7) / 30000 / 60;
      result.longitude = buffer.readUInt32BE(d + 11) / 30000 / 60;
      result.speed = buffer.readUInt8(d + 15);
      const courseFlags = buffer.readUInt16BE(d + 16);
      result.course = courseFlags & 0x03FF;
      result.gpsValid = !!(courseFlags & 0x1000);
      if (courseFlags & 0x0400) result.latitude = -result.latitude;
      if (!(courseFlags & 0x0800)) result.longitude = -result.longitude;
      log('info', 'gt06', 'Location', { lat: result.latitude, lng: result.longitude, speed: result.speed });
    } else if (protocolNumber === 0x13 || protocolNumber === 0x23) {
      result.type = 'heartbeat';
      const status = buffer.readUInt8(protocolOffset + 1);
      result.acc = !!(status & 0x02);
      result.charging = !!(status & 0x04);
    } else if (protocolNumber === 0x16) {
      result.type = 'alarm';
    }
    return result;
  } catch (e) {
    log('error', 'gt06', 'Parse error', { error: e.message });
    return null;
  }
}

function generateGT06Response(protocolNumber, serialNumber) {
  const resp = Buffer.alloc(10);
  resp.writeUInt16BE(0x7878, 0);
  resp.writeUInt8(0x05, 2);
  resp.writeUInt8(protocolNumber, 3);
  resp.writeUInt16BE(serialNumber || 0x0001, 4);
  resp.writeUInt16BE(0x0000, 6);
  resp.writeUInt16BE(0x0D0A, 8);
  return resp;
}

function parseTK103(data) {
  try {
    const text = data.toString().trim();
    const result = { protocol: 'tk103', raw: text };
    let match = text.match(/##,imei:(\d+),A;?/);
    if (match) { result.type = 'login'; result.imei = match[1]; log('info', 'tk103', '303FG Login', { imei: result.imei }); return result; }
    match = text.match(/^(\d{15});?$/);
    if (match) { result.type = 'heartbeat'; result.imei = match[1]; return result; }
    match = text.match(/imei:(\d+),help me[,!]?/i);
    if (match) { result.type = 'alarm'; result.alarmType = 'sos'; result.imei = match[1]; return result; }
    match = text.match(/imei:(\d+),low battery/i);
    if (match) { result.type = 'alarm'; result.alarmType = 'low_battery'; result.imei = match[1]; return result; }
    match = text.match(/imei:(\d+),ac alarm/i);
    if (match) { result.type = 'alarm'; result.alarmType = 'power_cut'; result.imei = match[1]; return result; }
    match = text.match(/imei:(\d+),speed[,:]?\s*([\d.]+)?/i);
    if (match && text.toLowerCase().includes('speed')) { result.type = 'alarm'; result.alarmType = 'overspeed'; result.imei = match[1]; if (match[2]) result.speed = parseFloat(match[2]); return result; }
    match = text.match(/imei:(\d+),[^,]*fuel[^,]*/i);
    if (match) { result.type = 'alarm'; result.alarmType = 'fuel_alert'; result.imei = match[1]; return result; }
    match = text.match(/imei:(\d+),(\w+),(\d+)\s+(\d+),,\w,(\d+),([AV]),([\d.]+),([NS]),([\d.]+),([EW]),([\d.]+),([\d.]+),?([\d.]*),?([^;]*);?/);
    if (match) {
      result.type = 'location'; result.imei = match[1]; result.messageType = match[2];
      const [, , msgType, dateStr, timeStr, , valid, lat, latDir, lng, lngDir, speed, course, alt, stateStr] = match;
      result.timestamp = new Date(2000 + parseInt(dateStr.substring(0, 2)), parseInt(dateStr.substring(2, 4)) - 1, parseInt(dateStr.substring(4, 6)), parseInt(timeStr.substring(0, 2)), parseInt(timeStr.substring(2, 4)), parseInt(timeStr.substring(4, 6))).toISOString();
      result.gpsValid = valid === 'A';
      let latVal = parseFloat(lat); result.latitude = Math.floor(latVal / 100) + (latVal % 100) / 60; if (latDir === 'S') result.latitude = -result.latitude;
      let lngVal = parseFloat(lng); result.longitude = Math.floor(lngVal / 100) + (lngVal % 100) / 60; if (lngDir === 'W') result.longitude = -result.longitude;
      result.speed = parseFloat(speed) * 1.852; result.course = parseFloat(course);
      if (alt && alt.length > 0) result.altitude = parseFloat(alt);
      if (stateStr && stateStr.length > 0) {
        result.ioState = stateStr;
        const accMatch = stateStr.match(/ACC[:\s]?([01])/i); if (accMatch) result.acc = accMatch[1] === '1';
        const relayMatch = stateStr.match(/RELAY[:\s]?([01])/i); if (relayMatch) result.relay = relayMatch[1] === '1';
        const fuelMatch = stateStr.match(/FUEL[:\s]?([\d.]+)/i); if (fuelMatch) result.fuelLevel = parseFloat(fuelMatch[1]);
        const battMatch = stateStr.match(/BATT?(?:ERY)?[:\s]?([\d.]+)/i); if (battMatch) result.batteryVoltage = parseFloat(battMatch[1]);
        const doorMatch = stateStr.match(/DOOR[:\s]?([01])/i); if (doorMatch) result.door = doorMatch[1] === '1';
        const hexState = stateStr.match(/^([0-9A-Fa-f]{2,8})$/);
        if (hexState) { const stateVal = parseInt(hexState[1], 16); result.acc = !!(stateVal & 0x01); result.relay = !!(stateVal & 0x02); result.door = !!(stateVal & 0x04); result.charging = !!(stateVal & 0x08); }
      }
      log('info', 'tk103', '303FG Location', { lat: result.latitude, lng: result.longitude, speed: result.speed, acc: result.acc, fuel: result.fuelLevel, relay: result.relay });
      return result;
    }
    match = text.match(/\((\d{15})([A-Z]+\d+)(.*)\)/);
    if (match) {
      result.imei = match[1]; const cmd = match[2]; result.commandCode = cmd;
      if (cmd === 'BP05') { result.type = 'login'; }
      else if (cmd.startsWith('BR')) {
        result.type = 'location'; const brData = match[3];
        const brMatch = brData.match(/(\d{6})([AV])([\d.]+)([NS])([\d.]+)([EW])([\d.]+)([\d.]+)(\d{6})/);
        if (brMatch) { const [, time, valid, lat, latDir, lng, lngDir, speed, course, date] = brMatch; result.gpsValid = valid === 'A'; let latVal = parseFloat(lat); result.latitude = Math.floor(latVal / 100) + (latVal % 100) / 60; if (latDir === 'S') result.latitude = -result.latitude; let lngVal = parseFloat(lng); result.longitude = Math.floor(lngVal / 100) + (lngVal % 100) / 60; if (lngDir === 'W') result.longitude = -result.longitude; result.speed = parseFloat(speed) * 1.852; result.course = parseFloat(course); }
      } else if (cmd === 'BO01') { result.type = 'alarm'; result.alarmType = 'sos'; }
      else if (cmd === 'BP00') { result.type = 'heartbeat'; }
      else { result.type = 'unknown'; }
      return result;
    }
    match = text.match(/imei:(\d+),[^,]*(relay|stop|resume)[^;]*;?/i);
    if (match) { result.type = 'command_response'; result.imei = match[1]; result.command = match[2].toLowerCase(); return result; }
    result.type = 'unknown'; return result;
  } catch (e) { log('error', 'tk103', 'Parse error', { error: e.message }); return null; }
}

function generateTK103Response(type, imei, socket) {
  if (type === 'login') {
    log('info', 'tk103', 'Sending LOAD response', { imei });
    if (imei && socket) {
      socket.write(Buffer.from('LOAD'));
      setTimeout(() => { if (!socket.destroyed) { const uploadCmd = `**,imei:${imei},C,10s`; socket.write(Buffer.from(uploadCmd)); log('info', 'tk103', 'Sent auto-upload command', { imei, command: uploadCmd }); } }, 100);
      return null;
    }
    return Buffer.from('LOAD');
  }
  if (type === 'heartbeat') return Buffer.from('ON');
  if (type === 'location') return null;
  if (type === 'relay_on' && imei) return Buffer.from(`**,imei:${imei},C;`);
  if (type === 'relay_off' && imei) return Buffer.from(`**,imei:${imei},D;`);
  return null;
}

function parseH02(data) {
  try {
    const text = data.toString().trim();
    const result = { protocol: 'h02', raw: text };
    const match = text.match(/\*(\w+),(\d+),(\w+),(\d+),([AV]),([\d.]+),([NS]),([\d.]+),([EW]),([\d.]+),([\d.]+),(\d+),([^#]*)#/);
    if (match) {
      const [, mfr, imei, cmd, time, valid, lat, latDir, lng, lngDir, speed, course, date, io] = match;
      result.imei = imei; result.manufacturer = mfr;
      if (['V1', 'V4', 'NBR'].includes(cmd)) {
        result.type = 'location';
        result.timestamp = new Date(2000 + parseInt(date.substring(4, 6)), parseInt(date.substring(2, 4)) - 1, parseInt(date.substring(0, 2)), parseInt(time.substring(0, 2)), parseInt(time.substring(2, 4)), parseInt(time.substring(4, 6))).toISOString();
        result.gpsValid = valid === 'A';
        let latVal = parseFloat(lat); result.latitude = Math.floor(latVal / 100) + (latVal % 100) / 60; if (latDir === 'S') result.latitude = -result.latitude;
        let lngVal = parseFloat(lng); result.longitude = Math.floor(lngVal / 100) + (lngVal % 100) / 60; if (lngDir === 'W') result.longitude = -result.longitude;
        result.speed = parseFloat(speed) * 1.852; result.course = parseFloat(course); result.ioStatus = io;
        log('info', 'h02', 'Location', { lat: result.latitude, lng: result.longitude });
      } else if (cmd === 'HTBT') { result.type = 'heartbeat'; }
      else if (['V0', 'XT'].includes(cmd)) { result.type = 'login'; }
      return result;
    }
    result.type = 'unknown'; return result;
  } catch (e) { log('error', 'h02', 'Parse error', { error: e.message }); return null; }
}

function parseTeltonika(buffer) {
  try {
    if (buffer.length < 2) return null;
    const result = { protocol: 'teltonika', raw: buffer.toString('hex') };
    const imeiLength = buffer.readUInt16BE(0);
    if (imeiLength === 15 || imeiLength === 17) {
      result.type = 'login'; result.imei = buffer.slice(2, 2 + imeiLength).toString();
      log('info', 'teltonika', 'IMEI received', { imei: result.imei }); return result;
    }
    if (buffer.length >= 12 && buffer.readUInt32BE(0) === 0) {
      const dataLength = buffer.readUInt32BE(4); const codecId = buffer.readUInt8(8); const numberOfRecords = buffer.readUInt8(9);
      result.type = 'location'; result.codecId = codecId; result.recordCount = numberOfRecords; result.records = [];
      let offset = 10;
      for (let i = 0; i < numberOfRecords && offset + 30 < buffer.length; i++) {
        const record = {};
        const ts = buffer.readBigUInt64BE(offset); record.timestamp = new Date(Number(ts)).toISOString(); offset += 8;
        record.priority = buffer.readUInt8(offset++);
        record.longitude = buffer.readInt32BE(offset) / 10000000; offset += 4;
        record.latitude = buffer.readInt32BE(offset) / 10000000; offset += 4;
        record.altitude = buffer.readInt16BE(offset); offset += 2;
        record.course = buffer.readUInt16BE(offset); offset += 2;
        record.satellites = buffer.readUInt8(offset++);
        record.speed = buffer.readUInt16BE(offset); offset += 2;
        record.ioElements = {};
        if (codecId === 0x08) {
          record.eventId = buffer.readUInt8(offset++); const totalIO = buffer.readUInt8(offset++);
          for (const byteSize of [1, 2, 4, 8]) { const count = buffer.readUInt8(offset++); for (let j = 0; j < count && offset + 1 + byteSize <= buffer.length; j++) { const ioId = buffer.readUInt8(offset++); let val; if (byteSize === 1) val = buffer.readUInt8(offset); else if (byteSize === 2) val = buffer.readUInt16BE(offset); else if (byteSize === 4) val = buffer.readUInt32BE(offset); else val = Number(buffer.readBigUInt64BE(offset)); offset += byteSize; record.ioElements[ioId] = val; } }
        } else if (codecId === 0x8E) {
          record.eventId = buffer.readUInt16BE(offset); offset += 2; const totalIO = buffer.readUInt16BE(offset); offset += 2;
          for (const byteSize of [1, 2, 4, 8]) { const count = buffer.readUInt16BE(offset); offset += 2; for (let j = 0; j < count && offset + 2 + byteSize <= buffer.length; j++) { const ioId = buffer.readUInt16BE(offset); offset += 2; let val; if (byteSize === 1) val = buffer.readUInt8(offset); else if (byteSize === 2) val = buffer.readUInt16BE(offset); else if (byteSize === 4) val = buffer.readUInt32BE(offset); else val = Number(buffer.readBigUInt64BE(offset)); offset += byteSize; record.ioElements[ioId] = val; } }
          if (offset + 2 <= buffer.length) { const varCount = buffer.readUInt16BE(offset); offset += 2; }
        }
        if (record.ioElements[239] !== undefined) record.ignition = record.ioElements[239] === 1;
        if (record.ioElements[240] !== undefined) record.movement = record.ioElements[240] === 1;
        if (record.ioElements[21] !== undefined) record.gsmSignal = record.ioElements[21];
        if (record.ioElements[66] !== undefined) record.externalVoltage = record.ioElements[66] / 1000;
        if (record.ioElements[67] !== undefined) record.batteryVoltage = record.ioElements[67] / 1000;
        if (record.ioElements[68] !== undefined) record.batteryLevel = record.ioElements[68];
        if (record.ioElements[69] !== undefined) record.gnssStatus = record.ioElements[69];
        result.records.push(record);
      }
      if (result.records.length > 0) {
        const r = result.records[0];
        Object.assign(result, { latitude: r.latitude, longitude: r.longitude, speed: r.speed, course: r.course, altitude: r.altitude, satellites: r.satellites, timestamp: r.timestamp, ignition: r.ignition, ioElements: r.ioElements });
      }
      log('info', 'teltonika', 'AVL data parsed', { codec: codecId, records: numberOfRecords, lat: result.latitude, lng: result.longitude });
      return result;
    }
    result.type = 'unknown'; return result;
  } catch (e) { log('error', 'teltonika', 'Parse error', { error: e.message }); return null; }
}

function generateTeltonikaResponse(type, recordCount) {
  if (type === 'login') return Buffer.from([0x01]);
  const resp = Buffer.alloc(4); resp.writeUInt32BE(recordCount || 1, 0); return resp;
}

function parseQueclink(data) {
  try {
    const text = data.toString().trim(); const result = { protocol: 'queclink', raw: text };
    if (text.startsWith('+RESP:') || text.startsWith('+BUFF:')) {
      const parts = text.split(','); const msgType = parts[0].split(':')[1];
      result.messageType = msgType; result.protocolVersion = parts[1]; result.imei = parts[2];
      if (msgType === 'GTFRI' || msgType === 'GTGEO' || msgType === 'GTSPD') {
        result.type = 'location';
        const gpsIdx = parts.findIndex((p, i) => i > 5 && /^-?\d+\.\d+$/.test(p));
        if (gpsIdx > 0 && gpsIdx + 1 < parts.length) { result.longitude = parseFloat(parts[gpsIdx]); result.latitude = parseFloat(parts[gpsIdx + 1]); result.altitude = parseFloat(parts[gpsIdx - 1]) || 0; result.course = parseFloat(parts[gpsIdx - 2]) || 0; result.speed = parseFloat(parts[gpsIdx - 3]) || 0; }
        if (parts.length > gpsIdx + 5) { result.odometer = parseFloat(parts[gpsIdx + 4]) || null; result.engineHours = parseFloat(parts[gpsIdx + 5]) || null; }
        log('info', 'queclink', 'Location', { lat: result.latitude, lng: result.longitude });
      } else if (msgType === 'GTHBD') { result.type = 'heartbeat'; }
      else if (msgType === 'GTINF') { result.type = 'info'; }
      return result;
    }
    if (text.startsWith('+ACK:')) { result.type = 'ack'; return result; }
    result.type = 'unknown'; return result;
  } catch (e) { log('error', 'queclink', 'Parse error', { error: e.message }); return null; }
}

function generateQueclinkResponse(type) { return Buffer.from('+SACK:GTHBD,,0001$'); }

function parseRuptela(buffer) {
  try {
    if (buffer.length < 10) return null;
    const result = { protocol: 'ruptela', raw: buffer.toString('hex') };
    const packetLength = buffer.readUInt16BE(0);
    if (buffer.length < packetLength + 2) return null;
    const imeiBcd = buffer.slice(2, 10); result.imei = imeiBcd.toString('hex').replace(/^0+/, '');
    const commandId = buffer.readUInt8(10);
    if (commandId === 0x01) {
      result.type = 'records'; const recordCount = buffer.readUInt8(11); result.recordCount = recordCount; result.records = [];
      let offset = 12;
      for (let i = 0; i < recordCount && offset + 21 < buffer.length; i++) {
        const record = {};
        record.timestamp = new Date(buffer.readUInt32BE(offset) * 1000).toISOString(); offset += 4;
        record.priority = buffer.readUInt8(offset++);
        record.longitude = buffer.readInt32BE(offset) / 10000000; offset += 4;
        record.latitude = buffer.readInt32BE(offset) / 10000000; offset += 4;
        record.altitude = buffer.readInt16BE(offset); offset += 2;
        record.course = buffer.readUInt16BE(offset); offset += 2;
        record.satellites = buffer.readUInt8(offset++);
        record.speed = buffer.readUInt16BE(offset); offset += 2;
        record.hdop = buffer.readUInt8(offset++) / 10;
        const ioCount = buffer.readUInt8(offset++); record.ioElements = {};
        for (let j = 0; j < ioCount && offset + 3 <= buffer.length; j++) { const ioId = buffer.readUInt8(offset++); const ioValue = buffer.readUInt16BE(offset); offset += 2; record.ioElements[ioId] = ioValue; }
        result.records.push(record);
      }
      if (result.records.length > 0) { const r = result.records[0]; Object.assign(result, { latitude: r.latitude, longitude: r.longitude, speed: r.speed, course: r.course, altitude: r.altitude, satellites: r.satellites, timestamp: r.timestamp, ioElements: r.ioElements }); result.type = 'location'; }
      log('info', 'ruptela', 'Records parsed', { count: recordCount, lat: result.latitude });
    } else if (commandId === 0x00) { result.type = 'heartbeat'; }
    return result;
  } catch (e) { log('error', 'ruptela', 'Parse error', { error: e.message }); return null; }
}

function generateRuptelaResponse(type, recordCount) { const resp = Buffer.alloc(5); resp.writeUInt16BE(2, 0); resp.writeUInt8(0x64, 2); resp.writeUInt8(recordCount || 0, 3); resp.writeUInt8(0x00, 4); return resp; }

function parseYTWL(data) {
  try {
    const text = data.toString().trim(); const result = { protocol: 'ytwl', raw: text };
    let match = text.match(/^\*(\d+),(\w+),(.*)#$/);
    if (match) {
      result.imei = match[1]; const cmd = match[2]; const dataStr = match[3];
      if (cmd === 'V1' || cmd === 'V2' || cmd === 'GPS') {
        result.type = 'location'; const parts = dataStr.split(',');
        if (parts.length >= 9) {
          result.gpsValid = parts[1] === 'A';
          let latVal = parseFloat(parts[2]); result.latitude = Math.floor(latVal / 100) + (latVal % 100) / 60; if (parts[3] === 'S') result.latitude = -result.latitude;
          let lngVal = parseFloat(parts[4]); result.longitude = Math.floor(lngVal / 100) + (lngVal % 100) / 60; if (parts[5] === 'W') result.longitude = -result.longitude;
          result.speed = parseFloat(parts[6]) || 0; result.course = parseFloat(parts[7]) || 0;
          if (parts[0] && parts[8]) { const time = parts[0]; const date = parts[8]; result.timestamp = new Date(2000 + parseInt(date.substring(4, 6)), parseInt(date.substring(2, 4)) - 1, parseInt(date.substring(0, 2)), parseInt(time.substring(0, 2)), parseInt(time.substring(2, 4)), parseInt(time.substring(4, 6))).toISOString(); }
          if (parts.length > 9) { result.speedLimit = parseFloat(parts[9]) || null; result.governorActive = parts[10] === '1'; }
        }
        log('info', 'ytwl', 'Location', { lat: result.latitude, lng: result.longitude, speed: result.speed });
      } else if (cmd === 'HB' || cmd === 'HEATBEAT') { result.type = 'heartbeat'; }
      else if (cmd === 'LK' || cmd === 'LOGIN') { result.type = 'login'; }
      else if (cmd === 'ALARM') { result.type = 'alarm'; result.alarmType = dataStr; }
      return result;
    }
    if (text.startsWith('{')) { try { const json = JSON.parse(text); result.type = 'location'; result.imei = json.imei || json.id; result.latitude = parseFloat(json.lat); result.longitude = parseFloat(json.lng || json.lon); result.speed = parseFloat(json.speed) || 0; result.course = parseFloat(json.heading || json.course) || 0; result.ignition = json.ignition === true || json.ignition === '1'; result.timestamp = json.timestamp || new Date().toISOString(); return result; } catch {} }
    result.type = 'unknown'; return result;
  } catch (e) { log('error', 'ytwl', 'Parse error', { error: e.message }); return null; }
}

// ==================== PROCESS PARSED DATA (replaces forwardToEdgeFunction) ====================

async function processParsedData(protocol, parsed, rawData) {
  if (!parsed || !parsed.imei) return;

  const device = await resolveDevice(parsed.imei, protocol);
  if (!device) {
    log('debug', protocol, 'Skipping - device not found/provisioned', { imei: parsed.imei });
    return;
  }
  if (!device.vehicle_id) {
    // Device exists but not assigned to vehicle - still update heartbeat
    enqueueHeartbeat(device.device_id);
    log('debug', protocol, 'Device exists but no vehicle assignment', { imei: parsed.imei });
    return;
  }

  const rawHex = typeof rawData === 'string' ? rawData : rawData.toString('hex');

  if (parsed.type === 'location' && parsed.latitude && parsed.longitude) {
    // Enqueue for batch write
    enqueueTelemetry(device, parsed, rawHex, protocol);
    stats[protocol].forwarded++;
  } else if (parsed.type === 'heartbeat' || parsed.type === 'login') {
    enqueueHeartbeat(device.device_id);
    stats[protocol].forwarded++;
  } else if (parsed.type === 'alarm') {
    // Alarms are written immediately (high priority)
    enqueueTelemetry(device, parsed, rawHex, protocol);
    stats[protocol].forwarded++;
  }
}

// ==================== TCP SERVER FACTORY ====================

const deviceSessions = new Map();

function createTCPServer(protocol, port, parser, responseGen) {
  const server = net.createServer((socket) => {
    const addr = `${socket.remoteAddress}:${socket.remotePort}`;
    let sessionImei = null;
    let buffer = Buffer.alloc(0);
    log('info', protocol, 'Connected', { remote: addr });

    socket.on('data', async (data) => {
      stats[protocol].received++;
      buffer = Buffer.concat([buffer, data]);
      log('debug', protocol, 'Raw data received', { hex: data.toString('hex'), ascii: data.toString().replace(/[\x00-\x1F\x7F-\xFF]/g, '.'), length: data.length, remote: addr });

      try {
        const parsed = parser(buffer);
        if (parsed) {
          stats[protocol].parsed++;
          if (parsed.imei) { sessionImei = parsed.imei; deviceSessions.set(addr, sessionImei); }
          else if (sessionImei) { parsed.imei = sessionImei; }

          // Send protocol response
          if (responseGen) {
            const resp = responseGen(parsed.type || parsed.protocolNumber, parsed.imei || parsed.recordCount, socket);
            if (resp) {
              socket.write(resp);
              log('debug', protocol, 'Response sent', { type: parsed.type || parsed.protocolNumber, imei: parsed.imei, hex: Buffer.isBuffer(resp) ? resp.toString('hex') : Buffer.from(String(resp)).toString('hex'), remote: addr });
            }
          }

          // Process data directly (no HTTP call!)
          await processParsedData(protocol, parsed, data);
          buffer = Buffer.alloc(0);
        }
      } catch (e) {
        log('error', protocol, 'Processing error', { error: e.message });
      }
    });

    socket.on('close', () => { log('info', protocol, 'Disconnected', { remote: addr }); deviceSessions.delete(addr); });
    socket.on('error', (e) => log('error', protocol, 'Socket error', { error: e.message }));
    socket.setKeepAlive(true, 60000);
    socket.setTimeout(300000);
    socket.on('timeout', () => socket.end());
  });

  server.listen(port, () => log('info', protocol, `Listening on port ${port}`));
  server.on('error', (e) => log('error', protocol, 'Server error', { error: e.message }));
  return server;
}

// ==================== UDP SERVER FACTORY ====================

function createUDPServer(protocol, port, parser) {
  const server = dgram.createSocket('udp4');
  server.on('message', async (msg, rinfo) => {
    stats[protocol].received++;
    log('debug', protocol, 'UDP received', { from: `${rinfo.address}:${rinfo.port}`, length: msg.length });
    try {
      const parsed = parser(msg);
      if (parsed && parsed.imei) {
        stats[protocol].parsed++;
        await processParsedData(protocol, parsed, msg);
      }
    } catch (e) {
      stats[protocol].errors++;
      log('error', protocol, 'UDP processing error', { error: e.message });
    }
  });
  server.on('error', (e) => log('error', protocol, 'UDP server error', { error: e.message }));
  server.bind(port, () => log('info', protocol, `UDP listening on port ${port}`));
  return server;
}

// ==================== HEALTH CHECK SERVER ====================

const healthServer = http.createServer(async (req, res) => {
  if (req.url === '/health') {
    // Quick DB connectivity check
    let dbOk = false;
    try { await pool.query('SELECT 1'); dbOk = true; } catch {}
    res.writeHead(dbOk ? 200 : 503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: dbOk ? 'ok' : 'db_error', uptime: process.uptime(), dbConnected: dbOk }));
  } else if (req.url === '/stats') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      uptime: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`,
      protocols: stats,
      activeSessions: deviceSessions.size,
      imeiCacheSize: imeiCache.size,
      bufferSize: telemetryBuffer.length,
      heartbeatBufferSize: heartbeatBuffer.size,
      dbPool: { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount }
    }));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// ==================== START ALL SERVERS ====================

async function start() {
  if (!config.databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is required!');
    console.error('Set it to your PostgreSQL connection string, e.g.:');
    console.error('  postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres');
    process.exit(1);
  }

  // Test DB connection
  try {
    const res = await pool.query('SELECT count(*) as cnt FROM public.devices WHERE status = $1', ['active']);
    log('info', 'db', `Database connected. ${res.rows[0].cnt} active devices.`);
  } catch (err) {
    console.error('ERROR: Cannot connect to database:', err.message);
    process.exit(1);
  }

  // Preload IMEI cache
  await preloadDeviceCache();

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     GPS TCP/UDP Gateway - Direct DB Write Mode                 ║');
  console.log('║     No edge functions - batched PostgreSQL writes              ║');
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log(`║ GT06/Concox   (TCP/UDP) → Port ${config.ports.gt06.toString().padEnd(5)} │ Binary, full parsing  ║`);
  console.log(`║ TK103         (TCP/UDP) → Port ${config.ports.tk103.toString().padEnd(5)} │ Text, multi-format    ║`);
  console.log(`║ H02/Sinotrack (TCP/UDP) → Port ${config.ports.h02.toString().padEnd(5)} │ Text, full parsing    ║`);
  console.log(`║ Teltonika     (TCP)     → Port ${config.ports.teltonika.toString().padEnd(5)} │ Codec 8/8E, AVL data  ║`);
  console.log(`║ Queclink      (TCP)     → Port ${config.ports.queclink.toString().padEnd(5)} │ AT-style commands     ║`);
  console.log(`║ Ruptela       (TCP)     → Port ${config.ports.ruptela.toString().padEnd(5)} │ Binary with IO        ║`);
  console.log(`║ YTWL Gov      (TCP)     → Port ${config.ports.ytwl.toString().padEnd(5)} │ Speed governor        ║`);
  console.log(`║ Health Check  (HTTP)    → Port ${config.ports.health.toString().padEnd(5)} │ /health, /stats       ║`);
  console.log(`║ Batch interval: ${config.batchIntervalMs}ms │ Batch size: ${config.batchSize.toString().padEnd(3)}         ║`);
  console.log(`║ IMEI cache: ${imeiCache.size} devices preloaded                         ║`);
  console.log('╚════════════════════════════════════════════════════════════════╝');

  // TCP Servers
  createTCPServer('gt06', config.ports.gt06, parseGT06, generateGT06Response);
  createTCPServer('tk103', config.ports.tk103, parseTK103, generateTK103Response);
  createTCPServer('h02', config.ports.h02, parseH02, null);
  createTCPServer('teltonika', config.ports.teltonika, parseTeltonika, generateTeltonikaResponse);
  createTCPServer('queclink', config.ports.queclink, parseQueclink, generateQueclinkResponse);
  createTCPServer('ruptela', config.ports.ruptela, parseRuptela, generateRuptelaResponse);
  createTCPServer('ytwl', config.ports.ytwl, parseYTWL, null);

  // UDP Servers
  createUDPServer('gt06', config.ports.gt06, parseGT06);
  createUDPServer('tk103', config.ports.tk103, parseTK103);
  createUDPServer('h02', config.ports.h02, parseH02);

  healthServer.listen(config.ports.health, () => log('info', 'health', `Listening on port ${config.ports.health}`));
}

// Graceful shutdown
async function shutdown() {
  log('info', 'system', 'Shutting down - flushing remaining buffer...');
  clearInterval(flushTimer);
  await flushBatch(); // Flush remaining data
  await pool.end();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
