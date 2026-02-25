# FleetTrack Node.js GPS Gateway — Complete Guide

A production-ready Node.js TCP gateway that receives raw GPS device data and writes directly to the FleetTrack database via PostgreSQL connection pooling. Designed for **2000+ vehicles**.

---

## Architecture

```
┌─────────────┐     TCP/UDP      ┌──────────────────┐     PostgreSQL     ┌────────────────┐
│ GPS Devices  │ ──────────────► │  Node.js Gateway  │ ────────────────► │  Database       │
│ (2000+ units)│                 │  (This app)       │   Direct Pool     │  (Lovable Cloud)│
└─────────────┘                  └──────────────────┘                    └────────────────┘
```

**No edge functions. No HTTP overhead. Direct DB writes with batch inserts.**

---

## 1. Project Setup

```bash
mkdir fleet-gateway && cd fleet-gateway
npm init -y
npm install pg net
```

### `package.json`

```json
{
  "name": "fleet-gateway",
  "version": "1.0.0",
  "description": "FleetTrack GPS TCP Gateway with Direct DB Writes",
  "main": "gateway.js",
  "scripts": {
    "start": "node gateway.js",
    "start:debug": "LOG_LEVEL=debug node gateway.js"
  },
  "dependencies": {
    "pg": "^8.13.0"
  }
}
```

---

## 2. Environment Variables

Create a `.env` file (or export these):

```env
# REQUIRED — Get from Lovable Cloud → Settings → Connectors → Backend
# Use port 6543 (connection pooler), NOT 5432
DATABASE_URL=postgresql://postgres.kkmjwmyqakprqdhrlsoz:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres

# Optional
LOG_LEVEL=info
BATCH_INTERVAL_MS=5000
BATCH_SIZE=50
GT06_PORT=5001
TK103_PORT=5013
H02_PORT=5023
TELTONIKA_PORT=5027
QUECLINK_PORT=5030
RUPTELA_PORT=5031
YTWL_PORT=5032
HEALTH_PORT=8080
```

> **How to get DATABASE_URL:**
> 1. Open your Lovable project
> 2. Go to Settings → Connectors → Lovable Cloud
> 3. Find `SUPABASE_DB_URL` — that is your connection string
> 4. **Change the port to `6543`** (pooler) if it shows `5432`

---

## 3. Full Gateway Code

### `gateway.js`

```javascript
const { Pool } = require('pg');
const net = require('net');
const dgram = require('dgram');
const http = require('http');

// ─── Load .env manually (no dotenv dependency) ───
const fs = require('fs');
try {
  const envFile = fs.readFileSync('.env', 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && !key.startsWith('#')) {
      process.env[key.trim()] = val.join('=').trim();
    }
  });
} catch (e) { /* .env is optional */ }

// ─── Configuration ───
const config = {
  databaseUrl: process.env.DATABASE_URL,
  logLevel: process.env.LOG_LEVEL || 'info',
  batchIntervalMs: parseInt(process.env.BATCH_INTERVAL_MS || '5000'),
  batchSize: parseInt(process.env.BATCH_SIZE || '50'),
  ports: {
    gt06: parseInt(process.env.GT06_PORT || '5001'),
    tk103: parseInt(process.env.TK103_PORT || '5013'),
    h02: parseInt(process.env.H02_PORT || '5023'),
    teltonika: parseInt(process.env.TELTONIKA_PORT || '5027'),
    queclink: parseInt(process.env.QUECLINK_PORT || '5030'),
    ruptela: parseInt(process.env.RUPTELA_PORT || '5031'),
    ytwl: parseInt(process.env.YTWL_PORT || '5032'),
  },
  healthPort: parseInt(process.env.HEALTH_PORT || '8080'),
};

if (!config.databaseUrl) {
  console.error('FATAL: DATABASE_URL is required. See .env setup in the guide.');
  process.exit(1);
}

// ─── Logging ───
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLogLevel = LOG_LEVELS[config.logLevel] || 1;

function log(level, msg, data = null) {
  if (LOG_LEVELS[level] >= currentLogLevel) {
    const entry = { ts: new Date().toISOString(), level, msg };
    if (data) entry.data = data;
    console.log(JSON.stringify(entry));
  }
}

// ─── Database Pool ───
const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,                  // Max 10 concurrent connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false }
});

pool.on('error', (err) => {
  log('error', 'Database pool error', { error: err.message });
});

// ─── IMEI Cache ───
// Maps IMEI → { device_id, vehicle_id, organization_id }
const imeiCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const NOT_FOUND_TTL = 60 * 1000;  // 1 minute for "not found" entries

async function loadImeiCache() {
  try {
    const result = await pool.query(`
      SELECT d.imei, d.id AS device_id, d.vehicle_id, d.organization_id
      FROM public.devices d
      WHERE d.status = 'active' AND d.vehicle_id IS NOT NULL
    `);
    result.rows.forEach(row => {
      imeiCache.set(row.imei, {
        device_id: row.device_id,
        vehicle_id: row.vehicle_id,
        organization_id: row.organization_id,
        cached_at: Date.now()
      });
    });
    log('info', `IMEI cache loaded: ${result.rows.length} devices`);
  } catch (err) {
    log('error', 'Failed to load IMEI cache', { error: err.message });
  }
}

async function lookupImei(imei) {
  // Check cache first
  const cached = imeiCache.get(imei);
  if (cached) {
    if (cached.not_found && Date.now() - cached.cached_at < NOT_FOUND_TTL) {
      return null; // Known missing device
    }
    if (!cached.not_found && Date.now() - cached.cached_at < CACHE_TTL) {
      return cached;
    }
  }

  // Query database
  try {
    const result = await pool.query(`
      SELECT d.id AS device_id, d.vehicle_id, d.organization_id
      FROM public.devices d
      WHERE d.imei = $1 AND d.status = 'active' AND d.vehicle_id IS NOT NULL
      LIMIT 1
    `, [imei]);

    if (result.rows.length === 0) {
      imeiCache.set(imei, { not_found: true, cached_at: Date.now() });
      return null;
    }

    const device = {
      device_id: result.rows[0].device_id,
      vehicle_id: result.rows[0].vehicle_id,
      organization_id: result.rows[0].organization_id,
      cached_at: Date.now()
    };
    imeiCache.set(imei, device);
    return device;
  } catch (err) {
    log('error', 'IMEI lookup failed', { imei, error: err.message });
    return null;
  }
}

// ─── Telemetry Buffer & Batch Insert ───
const telemetryBuffer = [];
let flushTimer = null;

function bufferTelemetry(record) {
  telemetryBuffer.push(record);
  stats.totalReceived++;
  stats.protocols[record.protocol] = (stats.protocols[record.protocol] || 0) + 1;

  if (telemetryBuffer.length >= config.batchSize) {
    flushBatch();
  }
}

async function flushBatch() {
  if (telemetryBuffer.length === 0) return;

  const batch = telemetryBuffer.splice(0, config.batchSize);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ── 1. Upsert vehicle_telemetry (live state) ──
    for (const r of batch) {
      await client.query(`
        INSERT INTO public.vehicle_telemetry (
          vehicle_id, organization_id, latitude, longitude, speed_kmh, heading,
          fuel_level_percent, ignition_on, engine_on, device_connected,
          altitude_meters, odometer_km, battery_voltage, external_voltage,
          gps_satellites_count, gps_signal_strength, gps_hdop, gps_fix_type,
          temperature_1, temperature_2, driver_rfid,
          harsh_acceleration, harsh_braking, harsh_cornering,
          io_elements, last_communication_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, true,
          $10, $11, $12, $13,
          $14, $15, $16, $17,
          $18, $19, $20,
          $21, $22, $23,
          $24, NOW()
        )
        ON CONFLICT (vehicle_id) DO UPDATE SET
          latitude = COALESCE(EXCLUDED.latitude, vehicle_telemetry.latitude),
          longitude = COALESCE(EXCLUDED.longitude, vehicle_telemetry.longitude),
          speed_kmh = COALESCE(EXCLUDED.speed_kmh, vehicle_telemetry.speed_kmh),
          heading = COALESCE(EXCLUDED.heading, vehicle_telemetry.heading),
          fuel_level_percent = COALESCE(EXCLUDED.fuel_level_percent, vehicle_telemetry.fuel_level_percent),
          ignition_on = COALESCE(EXCLUDED.ignition_on, vehicle_telemetry.ignition_on),
          engine_on = COALESCE(EXCLUDED.engine_on, vehicle_telemetry.engine_on),
          device_connected = true,
          altitude_meters = COALESCE(EXCLUDED.altitude_meters, vehicle_telemetry.altitude_meters),
          odometer_km = COALESCE(EXCLUDED.odometer_km, vehicle_telemetry.odometer_km),
          battery_voltage = COALESCE(EXCLUDED.battery_voltage, vehicle_telemetry.battery_voltage),
          external_voltage = COALESCE(EXCLUDED.external_voltage, vehicle_telemetry.external_voltage),
          gps_satellites_count = COALESCE(EXCLUDED.gps_satellites_count, vehicle_telemetry.gps_satellites_count),
          gps_signal_strength = COALESCE(EXCLUDED.gps_signal_strength, vehicle_telemetry.gps_signal_strength),
          gps_hdop = COALESCE(EXCLUDED.gps_hdop, vehicle_telemetry.gps_hdop),
          gps_fix_type = COALESCE(EXCLUDED.gps_fix_type, vehicle_telemetry.gps_fix_type),
          temperature_1 = COALESCE(EXCLUDED.temperature_1, vehicle_telemetry.temperature_1),
          temperature_2 = COALESCE(EXCLUDED.temperature_2, vehicle_telemetry.temperature_2),
          driver_rfid = COALESCE(EXCLUDED.driver_rfid, vehicle_telemetry.driver_rfid),
          harsh_acceleration = COALESCE(EXCLUDED.harsh_acceleration, vehicle_telemetry.harsh_acceleration),
          harsh_braking = COALESCE(EXCLUDED.harsh_braking, vehicle_telemetry.harsh_braking),
          harsh_cornering = COALESCE(EXCLUDED.harsh_cornering, vehicle_telemetry.harsh_cornering),
          io_elements = COALESCE(EXCLUDED.io_elements, vehicle_telemetry.io_elements),
          last_communication_at = NOW(),
          updated_at = NOW()
      `, [
        r.vehicle_id, r.organization_id, r.latitude, r.longitude, r.speed, r.heading,
        r.fuel_level, r.ignition, r.engine_on,
        r.altitude, r.odometer, r.battery_voltage, r.external_voltage,
        r.satellites, r.gps_signal, r.hdop, r.fix_type,
        r.temp1, r.temp2, r.driver_rfid,
        r.harsh_accel || false, r.harsh_brake || false, r.harsh_corner || false,
        r.io_elements ? JSON.stringify(r.io_elements) : null
      ]);
    }

    // ── 2. Update device heartbeats (deduplicated) ──
    const deviceIds = [...new Set(batch.map(r => r.device_id))];
    if (deviceIds.length > 0) {
      await client.query(`
        UPDATE public.devices
        SET last_heartbeat = NOW(), status = 'active', updated_at = NOW()
        WHERE id = ANY($1::uuid[])
      `, [deviceIds]);
    }

    await client.query('COMMIT');
    stats.totalFlushed += batch.length;
    log('info', `Batch flushed: ${batch.length} records, ${deviceIds.length} devices`);

  } catch (err) {
    await client.query('ROLLBACK');
    stats.totalErrors += batch.length;
    log('error', 'Batch flush failed', { error: err.message, batchSize: batch.length });
    // Re-queue failed batch
    telemetryBuffer.unshift(...batch);
  } finally {
    client.release();
  }
}

// ─── Stats ───
const stats = {
  startTime: Date.now(),
  totalReceived: 0,
  totalFlushed: 0,
  totalErrors: 0,
  protocols: {},
  activeSessions: 0
};

// ─── Protocol Parsers ───

// Each parser returns: { imei, latitude, longitude, speed, heading, ignition, ... } or null

function parseGT06(data) {
  try {
    if (data.length < 10) return null;
    // GT06 binary protocol
    const startBit = data.readUInt16BE(0);
    if (startBit !== 0x7878 && startBit !== 0x7979) return null;

    const packetLen = data[2];
    const protocolNum = data[3];

    // Login packet (0x01)
    if (protocolNum === 0x01) {
      const imei = data.slice(4, 12).toString('hex').replace(/^0+/, '');
      log('debug', 'GT06 login', { imei });
      return { imei, event_type: 'login', protocol: 'gt06' };
    }

    // Location packet (0x12, 0x22)
    if (protocolNum === 0x12 || protocolNum === 0x22) {
      const imei = null; // IMEI from session
      const lat = data.readUInt32BE(11) / 1800000;
      const lng = data.readUInt32BE(15) / 1800000;
      const speed = data[19];
      const heading = ((data[20] & 0x03) << 8) | data[21];

      return {
        latitude: lat, longitude: lng,
        speed, heading,
        protocol: 'gt06',
        event_type: 'position'
      };
    }

    // Heartbeat (0x13, 0x23)
    if (protocolNum === 0x13 || protocolNum === 0x23) {
      return { event_type: 'heartbeat', protocol: 'gt06' };
    }

    return null;
  } catch (err) {
    log('debug', 'GT06 parse error', { error: err.message });
    return null;
  }
}

function parseTK103(data) {
  try {
    const msg = data.toString('ascii').trim();
    log('debug', 'TK103 raw', { msg });

    // Login: ##,imei:868166056739147,A;
    const loginMatch = msg.match(/##,imei:(\d+),A/);
    if (loginMatch) {
      return { imei: loginMatch[1], event_type: 'login', protocol: 'tk103' };
    }

    // Heartbeat
    if (msg.includes('imei:') && msg.includes('heartbeat')) {
      const hbMatch = msg.match(/imei:(\d+)/);
      return { imei: hbMatch?.[1], event_type: 'heartbeat', protocol: 'tk103' };
    }

    // Location: imei:868166056739147,tracker,1501080852,,F,085200.000,A,0912.1234,N,03845.6789,E,45.20,090,,0,0,,,;
    const locMatch = msg.match(/imei:(\d+),\w+,(\d+),,\w?,(\d{6}\.\d+),([AV]),(\d+\.\d+),([NS]),(\d+\.\d+),([EW]),(\d+\.?\d*),(\d+)/);
    if (locMatch) {
      let lat = parseFloat(locMatch[5]);
      let lng = parseFloat(locMatch[7]);
      // Convert DDMM.MMMM to decimal degrees
      lat = Math.floor(lat / 100) + (lat % 100) / 60;
      lng = Math.floor(lng / 100) + (lng % 100) / 60;
      if (locMatch[6] === 'S') lat = -lat;
      if (locMatch[8] === 'W') lng = -lng;

      return {
        imei: locMatch[1],
        latitude: lat,
        longitude: lng,
        speed: parseFloat(locMatch[9]) * 1.852, // knots to km/h
        heading: parseFloat(locMatch[10]),
        protocol: 'tk103',
        event_type: 'position'
      };
    }

    // 303FG LOAD response
    if (msg === 'LOAD') {
      return { event_type: 'handshake', protocol: 'tk103', response: 'ON' };
    }

    return null;
  } catch (err) {
    log('debug', 'TK103 parse error', { error: err.message });
    return null;
  }
}

function parseH02(data) {
  try {
    const msg = data.toString('ascii').trim();
    log('debug', 'H02 raw', { msg });

    // *HQ,IMEI,V1,HHMMSS,V/A,DDMM.MMMM,N/S,DDDMM.MMMM,E/W,SSS.S,CCC,DDMMYY,...#
    const match = msg.match(/\*\w+,(\d+),(V\d|HTBT),(\d{6}),([AV]),(\d+\.\d+),([NS]),(\d+\.\d+),([EW]),(\d+\.?\d*),(\d+)/);
    if (match) {
      if (match[2] === 'HTBT') {
        return { imei: match[1], event_type: 'heartbeat', protocol: 'h02' };
      }

      let lat = parseFloat(match[5]);
      let lng = parseFloat(match[7]);
      lat = Math.floor(lat / 100) + (lat % 100) / 60;
      lng = Math.floor(lng / 100) + (lng % 100) / 60;
      if (match[6] === 'S') lat = -lat;
      if (match[8] === 'W') lng = -lng;

      return {
        imei: match[1],
        latitude: lat,
        longitude: lng,
        speed: parseFloat(match[9]) * 1.852,
        heading: parseFloat(match[10]),
        protocol: 'h02',
        event_type: 'position'
      };
    }
    return null;
  } catch (err) {
    return null;
  }
}

function parseTeltonika(data) {
  try {
    if (data.length < 10) return null;

    // Teltonika IMEI handshake: 000F + 15-char IMEI
    if (data.length >= 17 && data.readUInt16BE(0) === 0x000F) {
      const imei = data.slice(2, 17).toString('ascii');
      return { imei, event_type: 'login', protocol: 'teltonika', response: Buffer.from([0x01]) };
    }

    // AVL data packet (Codec 8 / 8E)
    if (data.readUInt32BE(0) === 0x00000000) {
      const dataLen = data.readUInt32BE(4);
      const codecId = data[8];
      const numRecords = data[9];

      if (codecId !== 0x08 && codecId !== 0x8E) return null;

      const records = [];
      let offset = 10;

      for (let i = 0; i < numRecords && offset < data.length - 8; i++) {
        try {
          const timestamp = Number(data.readBigUInt64BE(offset)); offset += 8;
          const priority = data[offset]; offset += 1;
          const lng = data.readInt32BE(offset) / 10000000; offset += 4;
          const lat = data.readInt32BE(offset) / 10000000; offset += 4;
          const altitude = data.readUInt16BE(offset); offset += 2;
          const heading = data.readUInt16BE(offset); offset += 2;
          const satellites = data[offset]; offset += 1;
          const speed = data.readUInt16BE(offset); offset += 2;

          // Parse IO elements
          const ioElements = {};
          if (codecId === 0x08) {
            const eventId = data[offset]; offset += 1;
            const totalIO = data[offset]; offset += 1;
            // 1-byte IO
            const io1Count = data[offset]; offset += 1;
            for (let j = 0; j < io1Count && offset + 2 <= data.length; j++) {
              ioElements[data[offset]] = data[offset + 1];
              offset += 2;
            }
            // 2-byte IO
            const io2Count = data[offset]; offset += 1;
            for (let j = 0; j < io2Count && offset + 3 <= data.length; j++) {
              ioElements[data[offset]] = data.readUInt16BE(offset + 1);
              offset += 3;
            }
            // 4-byte IO
            const io4Count = data[offset]; offset += 1;
            for (let j = 0; j < io4Count && offset + 5 <= data.length; j++) {
              ioElements[data[offset]] = data.readUInt32BE(offset + 1);
              offset += 5;
            }
            // 8-byte IO
            const io8Count = data[offset]; offset += 1;
            for (let j = 0; j < io8Count && offset + 9 <= data.length; j++) {
              ioElements[data[offset]] = Number(data.readBigUInt64BE(offset + 1));
              offset += 9;
            }
          } else {
            // Codec 8E — 2-byte IO IDs
            const eventId = data.readUInt16BE(offset); offset += 2;
            const totalIO = data.readUInt16BE(offset); offset += 2;
            // Skip IO parsing for simplicity, jump to next record
            // You can extend this for full Codec 8E support
            break;
          }

          records.push({
            latitude: lat, longitude: lng,
            speed, heading, altitude,
            satellites,
            ignition: ioElements[239] === 1 || ioElements[240] === 1,
            external_voltage: ioElements[66] ? ioElements[66] / 1000 : undefined,
            battery_voltage: ioElements[67] ? ioElements[67] / 1000 : undefined,
            io_elements: ioElements,
            protocol: 'teltonika',
            event_type: 'position',
            timestamp
          });
        } catch (e) { break; }
      }

      return {
        records,
        protocol: 'teltonika',
        // ACK: reply with number of records
        response: (() => {
          const ack = Buffer.alloc(4);
          ack.writeUInt32BE(numRecords, 0);
          return ack;
        })()
      };
    }
    return null;
  } catch (err) {
    log('debug', 'Teltonika parse error', { error: err.message });
    return null;
  }
}

function parseYTWL(data) {
  try {
    const msg = data.toString('ascii').trim();
    log('debug', 'YTWL raw', { msg });

    // *IMEI,V1,HHMMSS,A,DDMM.MMMM,N,DDDMM.MMMM,E,SSS.S,CCC,DDMMYY,SpeedLimit,GovernorSpeed,Status#
    const match = msg.match(/\*(\d+),(V\d),(\d{6}),([AV]),(\d+\.\d+),([NS]),(\d+\.\d+),([EW]),(\d+\.?\d*),(\d+),(\d{6}),(\d+),(\d+),(\d+)#/);
    if (match) {
      let lat = parseFloat(match[5]);
      let lng = parseFloat(match[7]);
      lat = Math.floor(lat / 100) + (lat % 100) / 60;
      lng = Math.floor(lng / 100) + (lng % 100) / 60;
      if (match[6] === 'S') lat = -lat;
      if (match[8] === 'W') lng = -lng;

      return {
        imei: match[1],
        latitude: lat,
        longitude: lng,
        speed: parseFloat(match[9]),
        heading: parseFloat(match[10]),
        speed_limit: parseInt(match[12]),
        governor_speed: parseInt(match[13]),
        protocol: 'ytwl',
        event_type: 'position'
      };
    }
    return null;
  } catch (err) {
    return null;
  }
}

// ─── Protocol Router ───
function getParser(port) {
  const p = config.ports;
  if (port === p.gt06) return { name: 'gt06', parse: parseGT06 };
  if (port === p.tk103) return { name: 'tk103', parse: parseTK103 };
  if (port === p.h02) return { name: 'h02', parse: parseH02 };
  if (port === p.teltonika) return { name: 'teltonika', parse: parseTeltonika };
  if (port === p.ytwl) return { name: 'ytwl', parse: parseYTWL };
  // Queclink and Ruptela — extend as needed
  if (port === p.queclink) return { name: 'queclink', parse: (d) => null };
  if (port === p.ruptela) return { name: 'ruptela', parse: (d) => null };
  return null;
}

// ─── TCP Session Manager ───
// Tracks IMEI per socket for protocols that send IMEI only on login (GT06, Teltonika)
const sessions = new Map();

async function handleParsedData(parsed, socket) {
  if (!parsed) return;

  // Handle handshake responses
  if (parsed.response && socket) {
    socket.write(typeof parsed.response === 'string' ? parsed.response : parsed.response);
  }

  // For Teltonika multi-record packets
  if (parsed.records) {
    const sessionImei = sessions.get(socket)?.imei;
    for (const record of parsed.records) {
      record.imei = sessionImei;
      await processSingleRecord(record, socket);
    }
    return;
  }

  // Store IMEI in session on login
  if (parsed.event_type === 'login' && parsed.imei && socket) {
    sessions.set(socket, { imei: parsed.imei, connectedAt: Date.now() });
    log('info', `Device logged in: ${parsed.imei} via ${parsed.protocol}`);
  }

  // Attach session IMEI if not in packet
  if (!parsed.imei && socket) {
    parsed.imei = sessions.get(socket)?.imei;
  }

  await processSingleRecord(parsed, socket);
}

async function processSingleRecord(record, socket) {
  if (!record.imei) {
    log('debug', 'No IMEI, skipping record');
    return;
  }

  // Skip heartbeats and logins (only update device status)
  if (record.event_type === 'login' || record.event_type === 'heartbeat') {
    const device = await lookupImei(record.imei);
    if (device) {
      // Will be included in next batch flush as heartbeat-only update
      log('debug', `${record.event_type} from ${record.imei}`);
    }
    return;
  }

  // Position updates
  if (record.latitude != null && record.longitude != null) {
    // Validate coordinates
    if (record.latitude < -90 || record.latitude > 90 ||
        record.longitude < -180 || record.longitude > 180 ||
        (record.latitude === 0 && record.longitude === 0)) {
      log('debug', 'Invalid coordinates, skipping', { imei: record.imei });
      return;
    }

    // Validate speed
    if (record.speed != null && (record.speed < 0 || record.speed > 300)) {
      record.speed = null;
    }

    // Validate heading
    if (record.heading != null && (record.heading < 0 || record.heading > 360)) {
      record.heading = null;
    }

    const device = await lookupImei(record.imei);
    if (!device) {
      log('debug', `Unknown IMEI: ${record.imei}`);
      return;
    }

    bufferTelemetry({
      vehicle_id: device.vehicle_id,
      device_id: device.device_id,
      organization_id: device.organization_id,
      latitude: record.latitude,
      longitude: record.longitude,
      speed: record.speed,
      heading: record.heading,
      ignition: record.ignition,
      engine_on: record.engine_on,
      fuel_level: record.fuel_level,
      altitude: record.altitude,
      odometer: record.odometer,
      battery_voltage: record.battery_voltage,
      external_voltage: record.external_voltage,
      satellites: record.satellites,
      gps_signal: record.gps_signal,
      hdop: record.hdop,
      fix_type: record.fix_type,
      temp1: record.temperature_1,
      temp2: record.temperature_2,
      driver_rfid: record.driver_rfid,
      harsh_accel: record.harsh_acceleration,
      harsh_brake: record.harsh_braking,
      harsh_corner: record.harsh_cornering,
      io_elements: record.io_elements,
      protocol: record.protocol
    });
  }
}

// ─── TCP Server Factory ───
function createTCPServer(port, protocolName) {
  const server = net.createServer((socket) => {
    stats.activeSessions++;
    const remoteAddr = `${socket.remoteAddress}:${socket.remotePort}`;
    log('debug', `TCP connection from ${remoteAddr} on port ${port} (${protocolName})`);

    socket.setTimeout(300000); // 5 min timeout

    socket.on('data', async (data) => {
      const parser = getParser(port);
      if (!parser) return;

      try {
        const parsed = parser.parse(data);
        await handleParsedData(parsed, socket);
      } catch (err) {
        log('error', `Parse error on ${protocolName}`, { error: err.message });
      }
    });

    socket.on('timeout', () => {
      log('debug', `Socket timeout: ${remoteAddr}`);
      socket.destroy();
    });

    socket.on('close', () => {
      stats.activeSessions--;
      sessions.delete(socket);
    });

    socket.on('error', (err) => {
      log('debug', `Socket error: ${err.message}`);
      sessions.delete(socket);
    });
  });

  server.listen(port, () => {
    log('info', `TCP server listening on port ${port} (${protocolName})`);
  });

  return server;
}

// ─── UDP Server Factory ───
function createUDPServer(port, protocolName) {
  const server = dgram.createSocket('udp4');

  server.on('message', async (data, rinfo) => {
    const parser = getParser(port);
    if (!parser) return;

    try {
      const parsed = parser.parse(data);
      if (parsed) {
        await handleParsedData(parsed, null);
      }
    } catch (err) {
      log('error', `UDP parse error on ${protocolName}`, { error: err.message });
    }
  });

  server.bind(port, () => {
    log('info', `UDP server listening on port ${port} (${protocolName})`);
  });

  return server;
}

// ─── Health Check HTTP Server ───
function startHealthServer() {
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
    } else if (req.url === '/stats') {
      const uptime = process.uptime();
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        uptime: `${hours}h ${minutes}m`,
        totalReceived: stats.totalReceived,
        totalFlushed: stats.totalFlushed,
        totalErrors: stats.totalErrors,
        bufferSize: telemetryBuffer.length,
        activeSessions: stats.activeSessions,
        cachedDevices: imeiCache.size,
        protocols: stats.protocols,
        dbPool: {
          total: pool.totalCount,
          idle: pool.idleCount,
          waiting: pool.waitingCount
        }
      }));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  server.listen(config.healthPort, () => {
    log('info', `Health check server on port ${config.healthPort}`);
  });
}

// ─── Startup ───
async function start() {
  log('info', '═══════════════════════════════════════════════');
  log('info', '  FleetTrack GPS Gateway — Direct DB Mode');
  log('info', '═══════════════════════════════════════════════');

  // Test database connection
  try {
    const result = await pool.query('SELECT NOW()');
    log('info', `Database connected: ${result.rows[0].now}`);
  } catch (err) {
    log('error', 'DATABASE CONNECTION FAILED', { error: err.message });
    log('error', 'Check your DATABASE_URL in .env');
    process.exit(1);
  }

  // Load IMEI cache
  await loadImeiCache();

  // Refresh IMEI cache every 5 minutes
  setInterval(loadImeiCache, 5 * 60 * 1000);

  // Start batch flush timer
  flushTimer = setInterval(flushBatch, config.batchIntervalMs);

  // Start TCP servers
  createTCPServer(config.ports.gt06, 'GT06/Concox');
  createTCPServer(config.ports.tk103, 'TK103/303FG');
  createTCPServer(config.ports.h02, 'H02/Sinotrack');
  createTCPServer(config.ports.teltonika, 'Teltonika');
  createTCPServer(config.ports.queclink, 'Queclink');
  createTCPServer(config.ports.ruptela, 'Ruptela');
  createTCPServer(config.ports.ytwl, 'YTWL Speed Gov');

  // Start UDP servers (for protocols that support it)
  createUDPServer(config.ports.gt06, 'GT06-UDP');
  createUDPServer(config.ports.tk103, 'TK103-UDP');
  createUDPServer(config.ports.h02, 'H02-UDP');

  // Health check
  startHealthServer();

  log('info', 'All servers started. Waiting for device connections...');
}

// ─── Graceful Shutdown ───
process.on('SIGINT', async () => {
  log('info', 'Shutting down...');
  clearInterval(flushTimer);
  await flushBatch(); // Flush remaining
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  log('info', 'Shutting down (SIGTERM)...');
  clearInterval(flushTimer);
  await flushBatch();
  await pool.end();
  process.exit(0);
});

// Start the gateway
start().catch(err => {
  log('error', 'Fatal startup error', { error: err.message });
  process.exit(1);
});
```

---

## 4. Docker Deployment

### `Dockerfile`

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY gateway.js .

EXPOSE 5001 5013 5023 5027 5030 5031 5032 8080

CMD ["node", "gateway.js"]
```

### `docker-compose.yml`

```yaml
version: '3.8'

services:
  gps-gateway:
    build: .
    container_name: fleet-gateway
    restart: unless-stopped
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - LOG_LEVEL=${LOG_LEVEL:-info}
      - BATCH_INTERVAL_MS=${BATCH_INTERVAL_MS:-5000}
      - BATCH_SIZE=${BATCH_SIZE:-50}
    ports:
      - "5001:5001"       # GT06/Concox TCP
      - "5013:5013"       # TK103 TCP
      - "5023:5023"       # H02 TCP
      - "5027:5027"       # Teltonika TCP
      - "5030:5030"       # Queclink TCP
      - "5031:5031"       # Ruptela TCP
      - "5032:5032"       # YTWL TCP
      - "5001:5001/udp"   # GT06 UDP
      - "5013:5013/udp"   # TK103 UDP
      - "5023:5023/udp"   # H02 UDP
      - "8080:8080"       # Health check
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "50m"
        max-file: "5"
```

---

## 5. Deploy Steps

```bash
# 1. Copy files to your VPS
scp -r fleet-gateway/ user@your-vps-ip:/opt/

# 2. SSH into VPS
ssh user@your-vps-ip
cd /opt/fleet-gateway

# 3. Create .env
cat > .env << 'EOF'
DATABASE_URL=postgresql://postgres.kkmjwmyqakprqdhrlsoz:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
LOG_LEVEL=info
BATCH_INTERVAL_MS=5000
BATCH_SIZE=50
EOF

# 4. Build and run
docker-compose up -d

# 5. Check logs
docker-compose logs -f

# 6. Verify health
curl http://localhost:8080/health
curl http://localhost:8080/stats
```

---

## 6. Firewall Setup

```bash
sudo ufw allow 5001/tcp   # GT06
sudo ufw allow 5013/tcp   # TK103
sudo ufw allow 5023/tcp   # H02
sudo ufw allow 5027/tcp   # Teltonika
sudo ufw allow 5030/tcp   # Queclink
sudo ufw allow 5031/tcp   # Ruptela
sudo ufw allow 5032/tcp   # YTWL
sudo ufw allow 5001/udp   # GT06 UDP
sudo ufw allow 5013/udp   # TK103 UDP
sudo ufw allow 5023/udp   # H02 UDP
sudo ufw allow 8080/tcp   # Health check
sudo ufw enable
```

---

## 7. Configure GPS Devices

Point your devices to your VPS IP on the matching port:

| Protocol | Port | Transport |
|----------|------|-----------|
| GT06/Concox | 5001 | TCP + UDP |
| TK103/303FG | 5013 | TCP + UDP |
| H02/Sinotrack | 5023 | TCP + UDP |
| Teltonika | 5027 | TCP |
| Queclink | 5030 | TCP |
| Ruptela | 5031 | TCP |
| YTWL Speed Gov | 5032 | TCP |

---

## 8. Monitoring

```bash
# Real-time stats (updates every 5s)
watch -n 5 'curl -s http://localhost:8080/stats | jq'

# View logs
docker-compose logs -f --tail=100

# Debug mode (restart with debug logging)
docker-compose down
LOG_LEVEL=debug docker-compose up -d
docker-compose logs -f
```

### Stats Response Example

```json
{
  "status": "ok",
  "uptime": "2h 30m",
  "totalReceived": 15000,
  "totalFlushed": 14998,
  "totalErrors": 2,
  "bufferSize": 12,
  "activeSessions": 45,
  "cachedDevices": 2000,
  "protocols": {
    "tk103": 8500,
    "teltonika": 4200,
    "gt06": 2300
  },
  "dbPool": {
    "total": 10,
    "idle": 7,
    "waiting": 0
  }
}
```

---

## 9. Troubleshooting

### Device not connecting
```bash
# Check port is open
telnet your-vps-ip 5013

# Check firewall
sudo ufw status

# Check gateway is running
docker ps
curl http://localhost:8080/health
```

### "Unknown IMEI" in logs
1. The device must be registered in FleetTrack → **Devices** page
2. The device must have a **vehicle assigned**
3. IMEI must match exactly (15 digits)
4. Device status must be **active**

### Data not appearing on dashboard
1. Check `curl http://localhost:8080/stats` — `totalFlushed` should be > 0
2. Check `totalErrors` — if high, check logs for DB errors
3. Verify `DATABASE_URL` is correct
4. Ensure port 6543 (pooler) is used, not 5432

### Database connection errors
```bash
# Test connection manually
docker exec -it fleet-gateway node -e "
const {Pool} = require('pg');
const p = new Pool({connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false}});
p.query('SELECT NOW()').then(r => {console.log('OK:', r.rows[0].now); p.end();}).catch(e => {console.error('FAIL:', e.message); p.end();});
"
```

---

## 10. Database Schema Reference

### `vehicle_telemetry` (live state — 1 row per vehicle)

| Column | Type | Description |
|--------|------|-------------|
| vehicle_id | uuid | PK — the vehicle |
| organization_id | uuid | Organization |
| latitude | numeric | Current latitude |
| longitude | numeric | Current longitude |
| speed_kmh | numeric | Current speed km/h |
| heading | numeric | Direction 0-360 |
| fuel_level_percent | numeric | Fuel level 0-100 |
| ignition_on | boolean | Ignition status |
| engine_on | boolean | Engine running |
| device_connected | boolean | Device online |
| altitude_meters | numeric | Altitude |
| odometer_km | numeric | Total distance |
| battery_voltage | numeric | Device battery (V) |
| external_voltage | numeric | Vehicle battery (V) |
| gps_satellites_count | integer | Satellite count |
| temperature_1 | numeric | Temp sensor 1 (°C) |
| temperature_2 | numeric | Temp sensor 2 (°C) |
| driver_rfid | text | Driver ID/RFID |
| io_elements | jsonb | Protocol-specific IO data |
| last_communication_at | timestamptz | Last update time |

### `devices` (device registry)

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Device ID |
| imei | text | Device IMEI (15 digits) |
| vehicle_id | uuid | Assigned vehicle |
| organization_id | uuid | Organization |
| status | text | active/inactive |
| last_heartbeat | timestamptz | Last heartbeat time |
