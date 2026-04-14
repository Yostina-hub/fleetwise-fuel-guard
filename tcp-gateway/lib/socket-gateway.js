/**
 * Socket.io Real-time Gateway
 * 
 * Broadcasts telemetry events to frontend clients for live map/UI updates.
 * Clients join organization-specific rooms for scoped data delivery.
 * 
 * Client usage:
 *   const socket = io('wss://gateway-host:9090', { auth: { token, orgId } });
 *   socket.on('telemetry:update', (data) => { ... });
 *   socket.on('alert:new', (data) => { ... });
 *   socket.on('fuel:change', (data) => { ... });
 *   socket.on('geofence:event', (data) => { ... });
 */

const http = require('http');
const { eventBus } = require('./event-bus');

let io = null;
let server = null;
const stats = { connections: 0, broadcasts: 0, rooms: new Set() };

function initSocketGateway(port, options = {}) {
  const socketPort = port || 9090;
  const allowedOrigins = options.allowedOrigins || [
    'https://fleet.goffice.et',
    'https://fleetwise-fuel-guard.lovable.app',
    'http://localhost:5173',
    'http://localhost:8080',
  ];

  let Server;
  try {
    Server = require('socket.io').Server;
  } catch {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'warn',
      protocol: 'socketio',
      message: 'socket.io not installed — WebSocket gateway disabled. Install: npm i socket.io',
    }));
    return null;
  }

  server = http.createServer();
  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use((socket, next) => {
    const orgId = socket.handshake.auth?.orgId
      || socket.handshake.query?.organization_id;
    const token = socket.handshake.auth?.token;

    if (!orgId) {
      return next(new Error('Organization ID required'));
    }

    // Store org context on socket
    socket.orgId = orgId;
    socket.userId = socket.handshake.auth?.userId;
    next();
  });

  io.on('connection', (socket) => {
    stats.connections++;
    const orgId = socket.orgId;

    // Join organization room
    const orgRoom = `org:${orgId}`;
    socket.join(orgRoom);
    stats.rooms.add(orgRoom);

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      protocol: 'socketio',
      message: 'Client connected',
      orgId,
      socketId: socket.id,
    }));

    // Allow clients to join org room explicitly (for late-binding)
    socket.on('join:organization', (data) => {
      if (data?.organization_id) {
        const room = `org:${data.organization_id}`;
        socket.join(room);
        stats.rooms.add(room);
      }
    });

    // Allow clients to subscribe to specific vehicle rooms
    socket.on('subscribe:vehicle', (vehicleId) => {
      if (vehicleId) {
        socket.join(`vehicle:${vehicleId}`);
      }
    });

    socket.on('unsubscribe:vehicle', (vehicleId) => {
      if (vehicleId) {
        socket.leave(`vehicle:${vehicleId}`);
      }
    });

    // Viewport-based subscription (selective updates)
    socket.on('subscribe:viewport', (bounds) => {
      socket.viewport = bounds; // { north, south, east, west }
    });

    socket.on('disconnect', () => {
      stats.connections--;
    });
  });

  // ── Wire event bus to Socket.io broadcasts ──

  eventBus.on('telemetry.ingested', (data) => {
    const orgRoom = `org:${data.organization_id}`;
    const vehicleRoom = `vehicle:${data.vehicle_id}`;

    // Broadcast to org room
    io.to(orgRoom).emit('telemetry:update', {
      vehicle_id: data.vehicle_id,
      lat: data.latitude,
      lng: data.longitude,
      speed_kmh: data.speed_kmh,
      heading: data.heading,
      fuel_level_percent: data.fuel_level_percent,
      engine_on: data.engine_on,
      ignition_on: data.ignition_on,
      timestamp: data.timestamp,
    });

    // Broadcast to vehicle-specific room (for detail views)
    io.to(vehicleRoom).emit('telemetry:detail', data);
    stats.broadcasts++;
  });

  eventBus.on('telemetry.alarm', (data) => {
    io.to(`org:${data.organization_id}`).emit('alert:new', data);
    stats.broadcasts++;
  });

  eventBus.on('fuel.change', (data) => {
    io.to(`org:${data.organization_id}`).emit('fuel:change', data);
    stats.broadcasts++;
  });

  eventBus.on('geofence.violation', (data) => {
    io.to(`org:${data.organization_id}`).emit('geofence:event', data);
    stats.broadcasts++;
  });

  eventBus.on('device.connected', (data) => {
    io.to(`org:${data.organization_id}`).emit('device:online', data);
  });

  eventBus.on('device.disconnected', (data) => {
    io.to(`org:${data.organization_id}`).emit('device:offline', data);
  });

  server.listen(socketPort, () => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      protocol: 'socketio',
      message: `Socket.io gateway listening on port ${socketPort}`,
    }));
  });

  return io;
}

function getStats() {
  return {
    connections: stats.connections,
    broadcasts: stats.broadcasts,
    rooms: stats.rooms.size,
    active: !!io,
  };
}

function shutdown() {
  if (server) server.close();
  if (io) io.close();
}

module.exports = { initSocketGateway, getStats, shutdown };
