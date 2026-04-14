/**
 * Redis Pub/Sub Transport Layer
 * 
 * Fast Lane: publishes telemetry events to Redis channels for
 * immediate consumption by Socket.io gateway and other subscribers.
 * 
 * Channels:
 *   fleet:{org_id}:telemetry   — real-time GPS updates
 *   fleet:{org_id}:alerts      — alarm/alert events
 *   fleet:{org_id}:fuel        — fuel level changes
 *   fleet:global:events        — all events (for monitoring)
 */

let redis;
let publisher = null;
let subscriber = null;
let connected = false;

const CHANNELS = {
  telemetry: (orgId) => `fleet:${orgId}:telemetry`,
  alerts: (orgId) => `fleet:${orgId}:alerts`,
  fuel: (orgId) => `fleet:${orgId}:fuel`,
  geofence: (orgId) => `fleet:${orgId}:geofence`,
  global: 'fleet:global:events',
};

const stats = { published: 0, received: 0, errors: 0 };

async function initRedis(redisUrl) {
  if (!redisUrl) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'warn',
      protocol: 'redis',
      message: 'REDIS_URL not configured — Redis pub/sub disabled. Events still flow via internal event bus.',
    }));
    return false;
  }

  try {
    redis = require('ioredis');
    
    publisher = new redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 200, 5000),
      lazyConnect: true,
    });

    subscriber = new redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 200, 5000),
      lazyConnect: true,
    });

    await publisher.connect();
    await subscriber.connect();
    connected = true;

    publisher.on('error', (err) => {
      stats.errors++;
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: 'error', protocol: 'redis', message: 'Publisher error', error: err.message }));
    });

    subscriber.on('error', (err) => {
      stats.errors++;
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: 'error', protocol: 'redis', message: 'Subscriber error', error: err.message }));
    });

    console.log(JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', protocol: 'redis', message: 'Redis pub/sub connected' }));
    return true;
  } catch (err) {
    console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: 'error', protocol: 'redis', message: 'Redis connection failed — falling back to in-process events', error: err.message }));
    connected = false;
    return false;
  }
}

/**
 * Publish event to Redis channel (fire-and-forget, non-blocking).
 */
function publish(channel, data) {
  if (!connected || !publisher) return;
  
  try {
    const payload = JSON.stringify(data);
    publisher.publish(channel, payload).catch(() => { stats.errors++; });
    stats.published++;
  } catch {
    stats.errors++;
  }
}

/**
 * Subscribe to a Redis channel with a handler.
 */
async function subscribe(channel, handler) {
  if (!connected || !subscriber) return;

  await subscriber.subscribe(channel);
  subscriber.on('message', (ch, message) => {
    if (ch === channel) {
      stats.received++;
      try {
        handler(JSON.parse(message));
      } catch (err) {
        stats.errors++;
      }
    }
  });
}

function isConnected() { return connected; }
function getStats() { return { connected, ...stats }; }
function getChannels() { return CHANNELS; }

async function shutdown() {
  if (publisher) await publisher.quit().catch(() => {});
  if (subscriber) await subscriber.quit().catch(() => {});
  connected = false;
}

module.exports = { initRedis, publish, subscribe, isConnected, getStats, getChannels, shutdown, CHANNELS };
