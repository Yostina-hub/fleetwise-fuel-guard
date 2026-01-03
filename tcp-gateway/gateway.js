/**
 * TCP/UDP Gateway for GPS Devices
 * 
 * This gateway listens on TCP/UDP ports for raw GPS device data
 * and forwards it to the Supabase edge function via HTTP.
 * 
 * Supported protocols:
 * - GT06/GT06N (binary protocol, port 5023)
 * - TK103 (text protocol, port 5001)
 * - H02 (text protocol, port 5013)
 * - Concox (binary protocol, port 5027)
 * 
 * Usage:
 *   node gateway.js
 * 
 * Environment variables:
 *   SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_ANON_KEY - Your Supabase anon key
 *   GT06_PORT - Port for GT06 devices (default: 5023)
 *   TK103_PORT - Port for TK103 devices (default: 5001)
 *   H02_PORT - Port for H02 devices (default: 5013)
 *   LOG_LEVEL - Logging level: debug, info, warn, error (default: info)
 */

const net = require('net');
const dgram = require('dgram');
const https = require('https');
const http = require('http');

// Configuration
const config = {
  supabaseUrl: process.env.SUPABASE_URL || 'https://kkmjwmyqakprqdhrlsoz.supabase.co',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrbWp3bXlxYWtwcnFkaHJsc296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNTc5NDIsImV4cCI6MjA3NjczMzk0Mn0.hcyw7MEssoLz3e09IrJ-aZyepzMsDY98KLnXfjzvuF4',
  ports: {
    gt06: parseInt(process.env.GT06_PORT) || 5023,
    tk103: parseInt(process.env.TK103_PORT) || 5001,
    h02: parseInt(process.env.H02_PORT) || 5013,
    concox: parseInt(process.env.CONCOX_PORT) || 5027,
  },
  logLevel: process.env.LOG_LEVEL || 'info',
  edgeFunctionPath: '/functions/v1/gps-data-receiver',
};

// Logging utility
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLogLevel = LOG_LEVELS[config.logLevel] || 1;

function log(level, message, data = null) {
  if (LOG_LEVELS[level] >= currentLogLevel) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    if (data) {
      console.log(logMessage, JSON.stringify(data, null, 2));
    } else {
      console.log(logMessage);
    }
  }
}

// Statistics tracking
const stats = {
  connections: 0,
  messagesReceived: 0,
  messagesForwarded: 0,
  errors: 0,
  startTime: Date.now(),
};

// Forward data to edge function
async function forwardToEdgeFunction(data, protocol, deviceToken = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(config.supabaseUrl + config.edgeFunctionPath);
    const isHttps = url.protocol === 'https:';
    
    const headers = {
      'Content-Type': 'text/plain',
      'apikey': config.supabaseAnonKey,
      'Authorization': `Bearer ${config.supabaseAnonKey}`,
      'X-GPS-Protocol': protocol,
    };
    
    if (deviceToken) {
      headers['x-device-token'] = deviceToken;
    }
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: headers,
    };
    
    const httpModule = isHttps ? https : http;
    
    const req = httpModule.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          stats.messagesForwarded++;
          log('debug', `Edge function response: ${res.statusCode}`, { response: responseData });
          resolve({ statusCode: res.statusCode, body: responseData });
        } else {
          stats.errors++;
          log('warn', `Edge function error: ${res.statusCode}`, { response: responseData });
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });
    
    req.on('error', (error) => {
      stats.errors++;
      log('error', 'Failed to forward to edge function', { error: error.message });
      reject(error);
    });
    
    req.write(typeof data === 'string' ? data : data.toString('hex'));
    req.end();
  });
}

// GT06 Protocol Handler (Binary)
function parseGT06Packet(buffer) {
  // GT06 packets start with 0x78 0x78 or 0x79 0x79
  if (buffer.length < 10) return null;
  
  const startBits = buffer.readUInt16BE(0);
  if (startBits !== 0x7878 && startBits !== 0x7979) {
    return null;
  }
  
  // Extract IMEI from login packet (protocol number 0x01)
  const packetLength = buffer.readUInt8(2);
  const protocolNumber = buffer.readUInt8(3);
  
  return {
    protocol: 'GT06',
    protocolNumber: protocolNumber,
    rawHex: buffer.toString('hex'),
    length: packetLength,
  };
}

// TK103 Protocol Handler (Text)
function parseTK103Packet(data) {
  const dataStr = data.toString().trim();
  
  // TK103 format: (IMEI,CMD,DATA)
  const match = dataStr.match(/^\((\d{15})([\w]+)(.*)?\)$/);
  if (match) {
    return {
      protocol: 'TK103',
      imei: match[1],
      command: match[2],
      data: match[3] || '',
      raw: dataStr,
    };
  }
  
  // Alternative format: IMEI,CMD,DATA
  const altMatch = dataStr.match(/^(\d{15}),([\w]+),(.*)$/);
  if (altMatch) {
    return {
      protocol: 'TK103',
      imei: altMatch[1],
      command: altMatch[2],
      data: altMatch[3],
      raw: dataStr,
    };
  }
  
  return null;
}

// H02 Protocol Handler (Text)
function parseH02Packet(data) {
  const dataStr = data.toString().trim();
  
  // H02 format: *HQ,IMEI,V1,TIME,STATUS,LAT,NS,LON,EW,SPEED,COURSE,DATE,STATUS#
  if (dataStr.startsWith('*HQ,') && dataStr.endsWith('#')) {
    const parts = dataStr.slice(4, -1).split(',');
    if (parts.length >= 2) {
      return {
        protocol: 'H02',
        imei: parts[0],
        command: parts[1],
        data: parts.slice(2).join(','),
        raw: dataStr,
      };
    }
  }
  
  return null;
}

// Create TCP server for a specific protocol
function createTCPServer(port, protocolName, parser) {
  const server = net.createServer((socket) => {
    stats.connections++;
    const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
    log('info', `[${protocolName}] New connection from ${clientId}`);
    
    let buffer = Buffer.alloc(0);
    
    socket.on('data', async (data) => {
      stats.messagesReceived++;
      buffer = Buffer.concat([buffer, data]);
      log('debug', `[${protocolName}] Received ${data.length} bytes from ${clientId}`, {
        hex: data.toString('hex'),
        ascii: data.toString('ascii').replace(/[^\x20-\x7E]/g, '.'),
      });
      
      try {
        // Try to parse the packet
        const parsed = parser(buffer);
        if (parsed) {
          log('info', `[${protocolName}] Parsed packet`, parsed);
          
          // Forward to edge function
          await forwardToEdgeFunction(buffer.toString('hex'), protocolName);
          
          // Clear buffer after successful processing
          buffer = Buffer.alloc(0);
          
          // Send acknowledgment for GT06 login
          if (protocolName === 'GT06' && parsed.protocolNumber === 0x01) {
            const ack = Buffer.from('787805010001d9dc0d0a', 'hex');
            socket.write(ack);
            log('debug', `[${protocolName}] Sent login acknowledgment`);
          }
        }
      } catch (error) {
        log('error', `[${protocolName}] Error processing packet`, { error: error.message });
      }
    });
    
    socket.on('close', () => {
      log('info', `[${protocolName}] Connection closed: ${clientId}`);
    });
    
    socket.on('error', (error) => {
      log('error', `[${protocolName}] Socket error: ${clientId}`, { error: error.message });
    });
    
    // Set socket timeout (5 minutes)
    socket.setTimeout(300000);
    socket.on('timeout', () => {
      log('warn', `[${protocolName}] Socket timeout: ${clientId}`);
      socket.end();
    });
  });
  
  server.on('error', (error) => {
    log('error', `[${protocolName}] Server error on port ${port}`, { error: error.message });
  });
  
  server.listen(port, () => {
    log('info', `[${protocolName}] TCP server listening on port ${port}`);
  });
  
  return server;
}

// Create UDP server for a specific protocol
function createUDPServer(port, protocolName, parser) {
  const server = dgram.createSocket('udp4');
  
  server.on('message', async (msg, rinfo) => {
    stats.messagesReceived++;
    log('debug', `[${protocolName}] UDP received ${msg.length} bytes from ${rinfo.address}:${rinfo.port}`, {
      hex: msg.toString('hex'),
      ascii: msg.toString('ascii').replace(/[^\x20-\x7E]/g, '.'),
    });
    
    try {
      const parsed = parser(msg);
      if (parsed) {
        log('info', `[${protocolName}] Parsed UDP packet`, parsed);
        await forwardToEdgeFunction(msg.toString('hex'), protocolName);
      }
    } catch (error) {
      log('error', `[${protocolName}] Error processing UDP packet`, { error: error.message });
    }
  });
  
  server.on('error', (error) => {
    log('error', `[${protocolName}] UDP server error`, { error: error.message });
  });
  
  server.bind(port, () => {
    log('info', `[${protocolName}] UDP server listening on port ${port}`);
  });
  
  return server;
}

// Health check HTTP server
function createHealthServer(port = 8080) {
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      const uptime = Math.floor((Date.now() - stats.startTime) / 1000);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'healthy',
        uptime: uptime,
        stats: stats,
      }));
    } else if (req.url === '/stats') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(stats, null, 2));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });
  
  server.listen(port, () => {
    log('info', `Health check server listening on port ${port}`);
  });
  
  return server;
}

// Main startup
function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║          GPS Device TCP/UDP Gateway                       ║');
  console.log('║          Fleet Management System                          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  
  log('info', 'Starting gateway with configuration', {
    supabaseUrl: config.supabaseUrl,
    ports: config.ports,
    logLevel: config.logLevel,
  });
  
  // Start TCP servers
  const gt06Server = createTCPServer(config.ports.gt06, 'GT06', parseGT06Packet);
  const tk103Server = createTCPServer(config.ports.tk103, 'TK103', parseTK103Packet);
  const h02Server = createTCPServer(config.ports.h02, 'H02', parseH02Packet);
  
  // Start UDP servers (same ports, different socket)
  const gt06UdpServer = createUDPServer(config.ports.gt06 + 1000, 'GT06-UDP', parseGT06Packet);
  const tk103UdpServer = createUDPServer(config.ports.tk103 + 1000, 'TK103-UDP', parseTK103Packet);
  
  // Start health check server
  const healthServer = createHealthServer(8080);
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    log('info', 'Shutting down gateway...');
    gt06Server.close();
    tk103Server.close();
    h02Server.close();
    gt06UdpServer.close();
    tk103UdpServer.close();
    healthServer.close();
    process.exit(0);
  });
  
  // Log stats periodically
  setInterval(() => {
    log('info', 'Gateway statistics', stats);
  }, 60000);
}

main();
