/**
 * MQTT Broker Module for GPS Gateway
 * 
 * Embeds an Aedes MQTT broker that allows devices to publish telemetry
 * via MQTT protocol. Supports multiple topic patterns used by common
 * GPS tracker manufacturers (Teltonika, Queclink, generic).
 * 
 * Topic patterns:
 *   fleet/{imei}/telemetry   - Standard telemetry data
 *   fleet/{imei}/event       - Event/alarm data
 *   fleet/{imei}/heartbeat   - Keep-alive pings
 *   gps/data/{imei}          - Generic legacy format
 *   dt/+/+                   - Teltonika MQTT format (dt/{serial}/{type})
 * 
 * Payload: JSON with flexible schema (parsed same as TCP/UDP)
 * 
 * Environment:
 *   MQTT_PORT        - MQTT TCP port (default: 1883)
 *   MQTT_WS_PORT     - MQTT over WebSocket port (default: 9883)
 *   ENABLE_MQTT      - Enable/disable (default: true)
 *   MQTT_AUTH_TOKEN   - Optional shared auth token for device connections
 */

let aedes = null;
let mqttServer = null;
let wsServer = null;
let mqttStats = { received: 0, parsed: 0, errors: 0, forwarded: 0, clients: 0 };
let onMessageCallback = null;

function log(level, tag, msg, meta) {
  const levels = { debug: 0, info: 1, warn: 2, error: 3 };
  const current = levels[process.env.LOG_LEVEL || 'info'] || 1;
  if (levels[level] >= current) {
    const metaStr = meta ? ' ' + JSON.stringify(meta) : '';
    console.log(`[${new Date().toISOString()}] [${level.toUpperCase()}] [${tag}] ${msg}${metaStr}`);
  }
}

/**
 * Extract IMEI from MQTT topic
 * Supports: fleet/{imei}/telemetry, gps/data/{imei}, dt/{serial}/{type}
 */
function extractImeiFromTopic(topic) {
  // fleet/{imei}/telemetry or fleet/{imei}/event or fleet/{imei}/heartbeat
  const fleetMatch = topic.match(/^fleet\/(\d{15})\/(\w+)$/);
  if (fleetMatch) return { imei: fleetMatch[1], msgType: fleetMatch[2] };

  // gps/data/{imei}
  const gpsMatch = topic.match(/^gps\/data\/(\d{15})$/);
  if (gpsMatch) return { imei: gpsMatch[1], msgType: 'telemetry' };

  // dt/{serial}/{type} - Teltonika format
  const dtMatch = topic.match(/^dt\/(\d+)\/(\w+)$/);
  if (dtMatch) return { imei: dtMatch[1], msgType: dtMatch[2] };

  // v1/devices/{imei}/data - REST-style
  const v1Match = topic.match(/^v1\/devices\/(\d{15})\/(\w+)$/);
  if (v1Match) return { imei: v1Match[1], msgType: v1Match[2] };

  return null;
}

/**
 * Parse MQTT JSON payload into the canonical format used by TCP parsers
 */
function parseMqttPayload(jsonPayload, msgType) {
  try {
    const data = typeof jsonPayload === 'string' ? JSON.parse(jsonPayload) : jsonPayload;

    return {
      type: msgType === 'heartbeat' ? 'heartbeat' : (msgType === 'event' ? 'alarm' : 'location'),
      imei: data.imei || data.IMEI || data.device_id || null,
      latitude: data.latitude || data.lat || data.Latitude || null,
      longitude: data.longitude || data.lng || data.lon || data.Longitude || null,
      lat: data.latitude || data.lat || data.Latitude || null,
      lng: data.longitude || data.lng || data.lon || data.Longitude || null,
      speed: data.speed || data.speed_kmh || data.Speed || 0,
      course: data.heading || data.course || data.bearing || data.Heading || 0,
      altitude: data.altitude || data.alt || data.Altitude || null,
      satellites: data.satellites || data.sats || data.gps_satellites || null,
      hdop: data.hdop || data.HDOP || null,
      ignition: data.ignition ?? data.ignition_on ?? data.engine_on ?? null,
      fuelLevel: data.fuel_level ?? data.fuel_level_percent ?? data.fuel ?? null,
      batteryVoltage: data.battery_voltage ?? data.battery ?? null,
      externalVoltage: data.external_voltage ?? data.power ?? null,
      odometer: data.odometer ?? data.odometer_km ?? null,
      gsmSignal: data.gsm_signal ?? data.signal_strength ?? null,
      timestamp: data.timestamp || data.ts || data.time || new Date().toISOString(),
      // Alarm-specific
      alarm: data.alarm || data.event || data.alert_type || null,
      // Preserve raw extras as ioElements
      ioElements: data.io || data.io_elements || data.extras || null,
      // MQTT-specific metadata
      _mqtt: true,
      _rawPayload: data,
    };
  } catch (err) {
    log('error', 'mqtt', 'Payload parse error', { error: err.message });
    return null;
  }
}

/**
 * Initialize the embedded MQTT broker
 * @param {object} opts - { port, wsPort, authToken, onMessage(protocol, parsed, raw) }
 */
function initMqttBroker(opts = {}) {
  const port = opts.port || parseInt(process.env.MQTT_PORT) || 1883;
  const wsPort = opts.wsPort || parseInt(process.env.MQTT_WS_PORT) || 9883;
  const authToken = opts.authToken || process.env.MQTT_AUTH_TOKEN || '';
  onMessageCallback = opts.onMessage || null;

  try {
    const Aedes = require('aedes');
    const net = require('net');
    const http = require('http');
    const ws = require('websocket-stream');

    aedes = new Aedes();

    // ── Authentication (optional shared token) ──
    aedes.authenticate = (client, username, password, callback) => {
      if (authToken) {
        const providedToken = password ? password.toString() : '';
        if (providedToken !== authToken && username !== authToken) {
          log('warn', 'mqtt', 'Auth failed', { clientId: client.id, username });
          callback(new Error('Authentication failed'), false);
          return;
        }
      }
      log('info', 'mqtt', 'Client authenticated', { clientId: client.id, username });
      callback(null, true);
    };

    // ── Authorization ──
    aedes.authorizePublish = (client, packet, callback) => {
      // Allow all publishes – devices publish telemetry
      callback(null);
    };

    aedes.authorizeSubscribe = (client, sub, callback) => {
      // Allow subscriptions for command channels
      callback(null, sub);
    };

    // ── Client connect/disconnect tracking ──
    aedes.on('client', (client) => {
      mqttStats.clients++;
      log('info', 'mqtt', 'Client connected', { clientId: client.id });
    });

    aedes.on('clientDisconnect', (client) => {
      mqttStats.clients = Math.max(0, mqttStats.clients - 1);
      log('info', 'mqtt', 'Client disconnected', { clientId: client.id });
    });

    // ── Message handling ──
    aedes.on('publish', (packet, client) => {
      // Ignore internal/system messages (start with $)
      if (!client || packet.topic.startsWith('$')) return;

      mqttStats.received++;

      const topicInfo = extractImeiFromTopic(packet.topic);
      if (!topicInfo) {
        log('warn', 'mqtt', 'Unknown topic pattern', { topic: packet.topic });
        mqttStats.errors++;
        return;
      }

      const payloadStr = packet.payload.toString();
      const parsed = parseMqttPayload(payloadStr, topicInfo.msgType);

      if (!parsed) {
        mqttStats.errors++;
        return;
      }

      // Override IMEI from topic if not in payload
      if (!parsed.imei) parsed.imei = topicInfo.imei;

      mqttStats.parsed++;
      log('debug', 'mqtt', 'Message received', {
        topic: packet.topic,
        imei: parsed.imei,
        type: parsed.type,
        lat: parsed.lat,
        lng: parsed.lng,
        speed: parsed.speed,
      });

      // Forward to the main gateway pipeline
      if (onMessageCallback) {
        onMessageCallback('mqtt', parsed, Buffer.from(payloadStr));
      }
    });

    // ── Start MQTT TCP server ──
    mqttServer = net.createServer(aedes.handle);
    mqttServer.listen(port, () => {
      log('info', 'mqtt', `MQTT broker listening on port ${port}`);
    });
    mqttServer.on('error', (err) => {
      log('error', 'mqtt', 'MQTT server error', { error: err.message });
    });

    // ── Start MQTT WebSocket server ──
    try {
      const httpServer = http.createServer();
      ws.createServer({ server: httpServer }, aedes.handle);
      httpServer.listen(wsPort, () => {
        log('info', 'mqtt', `MQTT-WS listening on port ${wsPort}`);
      });
      wsServer = httpServer;
    } catch (wsErr) {
      log('warn', 'mqtt', 'MQTT-WS not available (websocket-stream not installed)', { error: wsErr.message });
    }

    return true;
  } catch (err) {
    log('warn', 'mqtt', 'MQTT broker not available (aedes not installed). Install with: npm install aedes websocket-stream', { error: err.message });
    return false;
  }
}

/**
 * Publish a command to a device via MQTT
 * Topic: fleet/{imei}/command
 */
function publishCommand(imei, command) {
  if (!aedes) return false;

  const topic = `fleet/${imei}/command`;
  const payload = JSON.stringify(command);

  aedes.publish({
    topic,
    payload: Buffer.from(payload),
    qos: 1,
    retain: false,
  }, (err) => {
    if (err) {
      log('error', 'mqtt', 'Command publish failed', { imei, error: err.message });
    } else {
      log('info', 'mqtt', 'Command published', { imei, topic, command: command.type || 'unknown' });
    }
  });

  return true;
}

function getStats() {
  return {
    enabled: !!aedes,
    ...mqttStats,
    connectedClients: aedes ? aedes.connectedClients : 0,
  };
}

function shutdown() {
  if (aedes) {
    aedes.close(() => {
      log('info', 'mqtt', 'Broker closed');
    });
  }
  if (mqttServer) mqttServer.close();
  if (wsServer) wsServer.close();
}

module.exports = {
  initMqttBroker,
  publishCommand,
  getStats,
  shutdown,
};
