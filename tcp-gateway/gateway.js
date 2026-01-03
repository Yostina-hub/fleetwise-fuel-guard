/**
 * TCP/UDP Gateway for GPS Devices
 * 
 * Receives raw GPS data and forwards parsed telemetry to Supabase Edge Function.
 * 
 * Supported Protocols with FULL PARSING:
 * - GT06/Concox (Binary) - Port 5001 - Login, Location, Heartbeat, Alarm
 * - TK103 (Text) - Port 5013 - Multiple formats supported
 * - H02/Sinotrack (Text) - Port 5023 - V1, V4, HTBT commands
 * - Teltonika Codec 8/8E (Binary) - Port 5027 - Full AVL data parsing
 * 
 * Environment variables:
 *   SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_ANON_KEY - Your Supabase anon key
 *   GT06_PORT, TK103_PORT, H02_PORT, TELTONIKA_PORT - Protocol ports
 *   HEALTH_PORT - Health check HTTP port (default: 8080)
 *   LOG_LEVEL - debug, info, warn, error (default: info)
 */

const net = require('net');
const dgram = require('dgram');
const https = require('https');
const http = require('http');

// Configuration from environment
const config = {
  supabaseUrl: process.env.SUPABASE_URL || 'https://kkmjwmyqakprqdhrlsoz.supabase.co',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  edgeFunctionPath: '/functions/v1/gps-data-receiver',
  logLevel: process.env.LOG_LEVEL || 'info',
  ports: {
    gt06: parseInt(process.env.GT06_PORT) || 5001,
    tk103: parseInt(process.env.TK103_PORT) || 5013,
    h02: parseInt(process.env.H02_PORT) || 5023,
    teltonika: parseInt(process.env.TELTONIKA_PORT) || 5027,
    health: parseInt(process.env.HEALTH_PORT) || 8080
  }
};

// Statistics per protocol
const stats = {
  gt06: { received: 0, forwarded: 0, errors: 0, parsed: 0 },
  tk103: { received: 0, forwarded: 0, errors: 0, parsed: 0 },
  h02: { received: 0, forwarded: 0, errors: 0, parsed: 0 },
  teltonika: { received: 0, forwarded: 0, errors: 0, parsed: 0 },
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

// ==================== GT06/CONCOX PROTOCOL PARSER ====================

function parseGT06(buffer) {
  try {
    if (buffer.length < 5) return null;
    
    // Check start bytes (0x78 0x78 or 0x79 0x79 for extended)
    const startByte = buffer.readUInt16BE(0);
    if (startByte !== 0x7878 && startByte !== 0x7979) return null;
    
    const isExtended = startByte === 0x7979;
    const lengthOffset = 2;
    const length = isExtended ? buffer.readUInt16BE(lengthOffset) : buffer.readUInt8(lengthOffset);
    const protocolOffset = isExtended ? 4 : 3;
    const protocolNumber = buffer.readUInt8(protocolOffset);
    
    const result = { protocol: 'gt06', protocolNumber, raw: buffer.toString('hex') };
    
    // Protocol 0x01: Login packet (contains IMEI)
    if (protocolNumber === 0x01) {
      result.type = 'login';
      const imeiBytes = buffer.slice(protocolOffset + 1, protocolOffset + 9);
      result.imei = imeiBytes.toString('hex').replace(/^0+/, '');
      log('info', 'gt06', 'Login packet', { imei: result.imei });
    }
    // Protocol 0x12/0x22: Location data
    else if (protocolNumber === 0x12 || protocolNumber === 0x22) {
      result.type = 'location';
      const d = protocolOffset + 1;
      
      // DateTime (6 bytes): YY MM DD HH MM SS
      result.timestamp = new Date(
        2000 + buffer.readUInt8(d), buffer.readUInt8(d + 1) - 1, buffer.readUInt8(d + 2),
        buffer.readUInt8(d + 3), buffer.readUInt8(d + 4), buffer.readUInt8(d + 5)
      ).toISOString();
      
      // GPS info: satellites in lower nibble
      result.satellites = buffer.readUInt8(d + 6) & 0x0F;
      
      // Latitude/Longitude (4 bytes each, unit: 1/30000 minute)
      result.latitude = buffer.readUInt32BE(d + 7) / 30000 / 60;
      result.longitude = buffer.readUInt32BE(d + 11) / 30000 / 60;
      
      // Speed (1 byte, km/h)
      result.speed = buffer.readUInt8(d + 15);
      
      // Course and flags (2 bytes)
      const courseFlags = buffer.readUInt16BE(d + 16);
      result.course = courseFlags & 0x03FF;
      result.gpsValid = !!(courseFlags & 0x1000);
      if (courseFlags & 0x0400) result.latitude = -result.latitude;
      if (!(courseFlags & 0x0800)) result.longitude = -result.longitude;
      
      log('info', 'gt06', 'Location', { lat: result.latitude, lng: result.longitude, speed: result.speed });
    }
    // Protocol 0x13/0x23: Heartbeat
    else if (protocolNumber === 0x13 || protocolNumber === 0x23) {
      result.type = 'heartbeat';
      const status = buffer.readUInt8(protocolOffset + 1);
      result.acc = !!(status & 0x02);
      result.charging = !!(status & 0x04);
    }
    // Protocol 0x16: Alarm
    else if (protocolNumber === 0x16) {
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
  resp.writeUInt16BE(0x0000, 6); // CRC placeholder
  resp.writeUInt16BE(0x0D0A, 8);
  return resp;
}

// ==================== TK103 PROTOCOL PARSER ====================

function parseTK103(data) {
  try {
    const text = data.toString().trim();
    const result = { protocol: 'tk103', raw: text };
    
    // Login: ##,imei:IMEI,A;
    let match = text.match(/##,imei:(\d+),A;?/);
    if (match) {
      result.type = 'login';
      result.imei = match[1];
      return result;
    }
    
    // Heartbeat: IMEI;
    match = text.match(/^(\d{15});?$/);
    if (match) {
      result.type = 'heartbeat';
      result.imei = match[1];
      return result;
    }
    
    // Location: imei:IMEI,tracker,DATE TIME,,F,TIME,A,LAT,N,LNG,E,SPEED,COURSE,,STATE;
    match = text.match(/imei:(\d+),\w+,(\d+)\s+(\d+),,\w,(\d+),([AV]),([\d.]+),([NS]),([\d.]+),([EW]),([\d.]+),([\d.]+)/);
    if (match) {
      result.type = 'location';
      result.imei = match[1];
      
      const [, , dateStr, timeStr, , valid, lat, latDir, lng, lngDir, speed, course] = match;
      result.timestamp = new Date(
        2000 + parseInt(dateStr.substring(0, 2)), parseInt(dateStr.substring(2, 4)) - 1,
        parseInt(dateStr.substring(4, 6)), parseInt(timeStr.substring(0, 2)),
        parseInt(timeStr.substring(2, 4)), parseInt(timeStr.substring(4, 6))
      ).toISOString();
      
      result.gpsValid = valid === 'A';
      
      let latVal = parseFloat(lat);
      result.latitude = Math.floor(latVal / 100) + (latVal % 100) / 60;
      if (latDir === 'S') result.latitude = -result.latitude;
      
      let lngVal = parseFloat(lng);
      result.longitude = Math.floor(lngVal / 100) + (lngVal % 100) / 60;
      if (lngDir === 'W') result.longitude = -result.longitude;
      
      result.speed = parseFloat(speed) * 1.852; // knots to km/h
      result.course = parseFloat(course);
      
      log('info', 'tk103', 'Location', { lat: result.latitude, lng: result.longitude });
      return result;
    }
    
    // Alternative: (IMEI BP05...) or (IMEI BR00...)
    match = text.match(/\((\d{15})([A-Z]+\d+)(.*)\)/);
    if (match) {
      result.imei = match[1];
      result.type = match[2] === 'BP05' ? 'login' : match[2].startsWith('BR') ? 'location' : 'unknown';
      return result;
    }
    
    result.type = 'unknown';
    return result;
  } catch (e) {
    log('error', 'tk103', 'Parse error', { error: e.message });
    return null;
  }
}

function generateTK103Response(type) {
  return Buffer.from(type === 'login' ? 'LOAD' : 'ON');
}

// ==================== H02/SINOTRACK PROTOCOL PARSER ====================

function parseH02(data) {
  try {
    const text = data.toString().trim();
    const result = { protocol: 'h02', raw: text };
    
    // Format: *HQ,IMEI,CMD,TIME,STATUS,LAT,N/S,LNG,E/W,SPEED,COURSE,DATE,IO#
    const match = text.match(/\*(\w+),(\d+),(\w+),(\d+),([AV]),([\d.]+),([NS]),([\d.]+),([EW]),([\d.]+),([\d.]+),(\d+),([^#]*)#/);
    
    if (match) {
      const [, mfr, imei, cmd, time, valid, lat, latDir, lng, lngDir, speed, course, date, io] = match;
      
      result.imei = imei;
      result.manufacturer = mfr;
      
      if (['V1', 'V4', 'NBR'].includes(cmd)) {
        result.type = 'location';
        
        result.timestamp = new Date(
          2000 + parseInt(date.substring(4, 6)), parseInt(date.substring(2, 4)) - 1,
          parseInt(date.substring(0, 2)), parseInt(time.substring(0, 2)),
          parseInt(time.substring(2, 4)), parseInt(time.substring(4, 6))
        ).toISOString();
        
        result.gpsValid = valid === 'A';
        
        let latVal = parseFloat(lat);
        result.latitude = Math.floor(latVal / 100) + (latVal % 100) / 60;
        if (latDir === 'S') result.latitude = -result.latitude;
        
        let lngVal = parseFloat(lng);
        result.longitude = Math.floor(lngVal / 100) + (lngVal % 100) / 60;
        if (lngDir === 'W') result.longitude = -result.longitude;
        
        result.speed = parseFloat(speed) * 1.852;
        result.course = parseFloat(course);
        result.ioStatus = io;
        
        log('info', 'h02', 'Location', { lat: result.latitude, lng: result.longitude });
      } else if (cmd === 'HTBT') {
        result.type = 'heartbeat';
      } else if (['V0', 'XT'].includes(cmd)) {
        result.type = 'login';
      }
      
      return result;
    }
    
    result.type = 'unknown';
    return result;
  } catch (e) {
    log('error', 'h02', 'Parse error', { error: e.message });
    return null;
  }
}

// ==================== TELTONIKA CODEC 8/8E PARSER ====================

function parseTeltonika(buffer) {
  try {
    if (buffer.length < 2) return null;
    
    const result = { protocol: 'teltonika', raw: buffer.toString('hex') };
    
    // IMEI packet: 2 bytes length + IMEI ASCII string
    const imeiLength = buffer.readUInt16BE(0);
    if (imeiLength === 15 || imeiLength === 17) {
      result.type = 'login';
      result.imei = buffer.slice(2, 2 + imeiLength).toString();
      log('info', 'teltonika', 'IMEI received', { imei: result.imei });
      return result;
    }
    
    // AVL Data packet: 4 zero bytes preamble + 4 bytes data length + codec + records
    if (buffer.length >= 12 && buffer.readUInt32BE(0) === 0) {
      const dataLength = buffer.readUInt32BE(4);
      const codecId = buffer.readUInt8(8);
      const numberOfRecords = buffer.readUInt8(9);
      
      result.type = 'location';
      result.codecId = codecId;
      result.recordCount = numberOfRecords;
      result.records = [];
      
      let offset = 10;
      
      for (let i = 0; i < numberOfRecords && offset + 30 < buffer.length; i++) {
        const record = {};
        
        // Timestamp (8 bytes ms since epoch)
        const ts = buffer.readBigUInt64BE(offset);
        record.timestamp = new Date(Number(ts)).toISOString();
        offset += 8;
        
        // Priority
        record.priority = buffer.readUInt8(offset++);
        
        // GPS: Lng (4), Lat (4), Alt (2), Angle (2), Satellites (1), Speed (2)
        record.longitude = buffer.readInt32BE(offset) / 10000000;
        offset += 4;
        record.latitude = buffer.readInt32BE(offset) / 10000000;
        offset += 4;
        record.altitude = buffer.readInt16BE(offset);
        offset += 2;
        record.course = buffer.readUInt16BE(offset);
        offset += 2;
        record.satellites = buffer.readUInt8(offset++);
        record.speed = buffer.readUInt16BE(offset);
        offset += 2;
        
        // IO Elements parsing
        record.ioElements = {};
        
        if (codecId === 0x08) {
          // Codec 8: 1-byte IDs
          record.eventId = buffer.readUInt8(offset++);
          const totalIO = buffer.readUInt8(offset++);
          
          for (const byteSize of [1, 2, 4, 8]) {
            const count = buffer.readUInt8(offset++);
            for (let j = 0; j < count && offset + 1 + byteSize <= buffer.length; j++) {
              const ioId = buffer.readUInt8(offset++);
              let val;
              if (byteSize === 1) val = buffer.readUInt8(offset);
              else if (byteSize === 2) val = buffer.readUInt16BE(offset);
              else if (byteSize === 4) val = buffer.readUInt32BE(offset);
              else val = Number(buffer.readBigUInt64BE(offset));
              offset += byteSize;
              record.ioElements[ioId] = val;
            }
          }
        } else if (codecId === 0x8E) {
          // Codec 8E: 2-byte IDs
          record.eventId = buffer.readUInt16BE(offset);
          offset += 2;
          const totalIO = buffer.readUInt16BE(offset);
          offset += 2;
          
          for (const byteSize of [1, 2, 4, 8]) {
            const count = buffer.readUInt16BE(offset);
            offset += 2;
            for (let j = 0; j < count && offset + 2 + byteSize <= buffer.length; j++) {
              const ioId = buffer.readUInt16BE(offset);
              offset += 2;
              let val;
              if (byteSize === 1) val = buffer.readUInt8(offset);
              else if (byteSize === 2) val = buffer.readUInt16BE(offset);
              else if (byteSize === 4) val = buffer.readUInt32BE(offset);
              else val = Number(buffer.readBigUInt64BE(offset));
              offset += byteSize;
              record.ioElements[ioId] = val;
            }
          }
          
          // Skip variable length elements
          if (offset + 2 <= buffer.length) {
            const varCount = buffer.readUInt16BE(offset);
            offset += 2;
          }
        }
        
        // Map common Teltonika IO IDs
        if (record.ioElements[239] !== undefined) record.ignition = record.ioElements[239] === 1;
        if (record.ioElements[240] !== undefined) record.movement = record.ioElements[240] === 1;
        if (record.ioElements[21] !== undefined) record.gsmSignal = record.ioElements[21];
        if (record.ioElements[66] !== undefined) record.externalVoltage = record.ioElements[66] / 1000;
        if (record.ioElements[67] !== undefined) record.batteryVoltage = record.ioElements[67] / 1000;
        if (record.ioElements[68] !== undefined) record.batteryLevel = record.ioElements[68];
        if (record.ioElements[69] !== undefined) record.gnssStatus = record.ioElements[69];
        
        result.records.push(record);
      }
      
      // Copy first record data to result
      if (result.records.length > 0) {
        const r = result.records[0];
        Object.assign(result, {
          latitude: r.latitude, longitude: r.longitude, speed: r.speed,
          course: r.course, altitude: r.altitude, satellites: r.satellites,
          timestamp: r.timestamp, ignition: r.ignition, ioElements: r.ioElements
        });
      }
      
      log('info', 'teltonika', 'AVL data parsed', {
        codec: codecId, records: numberOfRecords, lat: result.latitude, lng: result.longitude
      });
      return result;
    }
    
    result.type = 'unknown';
    return result;
  } catch (e) {
    log('error', 'teltonika', 'Parse error', { error: e.message });
    return null;
  }
}

function generateTeltonikaResponse(type, recordCount) {
  if (type === 'login') return Buffer.from([0x01]); // Accept IMEI
  // Acknowledge records: 4 bytes with count
  const resp = Buffer.alloc(4);
  resp.writeUInt32BE(recordCount || 1, 0);
  return resp;
}

// ==================== FORWARD TO EDGE FUNCTION ====================

async function forwardToEdgeFunction(protocol, parsed, rawData) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      protocol,
      imei: parsed.imei,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      speed: parsed.speed,
      course: parsed.course,
      altitude: parsed.altitude,
      satellites: parsed.satellites,
      timestamp: parsed.timestamp,
      ignition: parsed.ignition,
      gpsValid: parsed.gpsValid,
      ioElements: parsed.ioElements,
      records: parsed.records,
      raw: typeof rawData === 'string' ? rawData : rawData.toString('hex'),
      gateway: 'tcp-gateway',
      receivedAt: new Date().toISOString()
    });
    
    const url = new URL(config.supabaseUrl + config.edgeFunctionPath);
    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'Authorization': `Bearer ${config.supabaseAnonKey}`,
        'apikey': config.supabaseAnonKey,
        'X-Gateway-Protocol': protocol
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          stats[protocol].forwarded++;
          log('info', protocol, 'Forwarded', { status: res.statusCode, imei: parsed.imei });
          resolve({ success: true });
        } else {
          stats[protocol].errors++;
          log('error', protocol, 'Forward error', { status: res.statusCode, body });
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (e) => {
      stats[protocol].errors++;
      log('error', protocol, 'Request error', { error: e.message });
      reject(e);
    });
    
    req.write(payload);
    req.end();
  });
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
      
      try {
        const parsed = parser(buffer);
        if (parsed) {
          stats[protocol].parsed++;
          
          if (parsed.imei) {
            sessionImei = parsed.imei;
            deviceSessions.set(addr, sessionImei);
          } else if (sessionImei) {
            parsed.imei = sessionImei;
          }
          
          // Send response
          if (responseGen) {
            const resp = responseGen(parsed.type || parsed.protocolNumber, parsed.recordCount);
            if (resp) socket.write(resp);
          }
          
          // Forward location/login data
          if ((parsed.type === 'location' || parsed.type === 'login') && parsed.imei) {
            await forwardToEdgeFunction(protocol, parsed, data);
          }
          
          buffer = Buffer.alloc(0);
        }
      } catch (e) {
        log('error', protocol, 'Processing error', { error: e.message });
      }
    });
    
    socket.on('close', () => {
      log('info', protocol, 'Disconnected', { remote: addr });
      deviceSessions.delete(addr);
    });
    
    socket.on('error', (e) => log('error', protocol, 'Socket error', { error: e.message }));
    socket.setKeepAlive(true, 60000);
    socket.setTimeout(300000);
    socket.on('timeout', () => socket.end());
  });
  
  server.listen(port, () => log('info', protocol, `Listening on port ${port}`));
  server.on('error', (e) => log('error', protocol, 'Server error', { error: e.message }));
  return server;
}

// ==================== HEALTH CHECK SERVER ====================

const healthServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
  } else if (req.url === '/stats') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      uptime: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`,
      protocols: stats,
      activeSessions: deviceSessions.size
    }));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// ==================== START ALL SERVERS ====================

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║       GPS TCP Gateway - Full Protocol Parsing              ║');
console.log('╠════════════════════════════════════════════════════════════╣');
console.log(`║ GT06/Concox   (TCP) → Port ${config.ports.gt06.toString().padEnd(5)} │ Binary, full parsing  ║`);
console.log(`║ TK103         (TCP) → Port ${config.ports.tk103.toString().padEnd(5)} │ Text, multi-format    ║`);
console.log(`║ H02/Sinotrack (TCP) → Port ${config.ports.h02.toString().padEnd(5)} │ Text, full parsing    ║`);
console.log(`║ Teltonika     (TCP) → Port ${config.ports.teltonika.toString().padEnd(5)} │ Codec 8/8E, AVL data  ║`);
console.log(`║ Health Check  (HTTP)→ Port ${config.ports.health.toString().padEnd(5)} │ /health, /stats       ║`);
console.log('╚════════════════════════════════════════════════════════════╝');

createTCPServer('gt06', config.ports.gt06, parseGT06, generateGT06Response);
createTCPServer('tk103', config.ports.tk103, parseTK103, generateTK103Response);
createTCPServer('h02', config.ports.h02, parseH02, null);
createTCPServer('teltonika', config.ports.teltonika, parseTeltonika, generateTeltonikaResponse);
healthServer.listen(config.ports.health, () => log('info', 'health', `Listening on port ${config.ports.health}`));

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
