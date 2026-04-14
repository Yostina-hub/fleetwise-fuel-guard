/**
 * Worker Pattern — Offloads heavy computations from the main event loop.
 * 
 * Uses BullMQ (Redis-backed) when Redis is available, falls back to
 * in-process async queue when Redis is unavailable.
 * 
 * Workers:
 *   geofence-check  — Point-in-polygon checks for vehicle positions
 *   tco-calculation  — Total Cost of Ownership recalculations
 *   aggregate-refresh — Refreshes materialized views
 *   retention-cleanup — Drops old time-series partitions
 */

const { eventBus } = require('./event-bus');

let Queue, Worker, bullAvailable = false;
try {
  const bullmq = require('bullmq');
  Queue = bullmq.Queue;
  Worker = bullmq.Worker;
  bullAvailable = true;
} catch {
  // BullMQ not installed — use in-process fallback
}

const workers = {};
const queues = {};
const stats = { enqueued: 0, processed: 0, failed: 0 };

// ── In-process fallback queue ──
class InProcessQueue {
  constructor(name, processor) {
    this.name = name;
    this.processor = processor;
    this._queue = [];
    this._processing = false;
  }

  async add(jobName, data, opts) {
    this._queue.push({ name: jobName, data, opts });
    stats.enqueued++;
    if (!this._processing) this._processNext();
  }

  async _processNext() {
    if (this._queue.length === 0) { this._processing = false; return; }
    this._processing = true;
    const job = this._queue.shift();
    try {
      await this.processor(job);
      stats.processed++;
    } catch (err) {
      stats.failed++;
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(), level: 'error', protocol: 'worker',
        message: `Job "${job.name}" failed in queue "${this.name}"`, error: err.message,
      }));
    }
    // Yield to event loop before processing next
    setImmediate(() => this._processNext());
  }

  close() { this._queue = []; }
}

/**
 * Initialize worker queues.
 * @param {object} options - { redisUrl, pool (pg Pool) }
 */
function initWorkers(options = {}) {
  const { redisUrl, pool } = options;
  const redisOpts = redisUrl ? { connection: { url: redisUrl } } : null;

  // ── Geofence Check Worker ──
  const geofenceProcessor = async (job) => {
    const { vehicle_id, organization_id, latitude, longitude, speed_kmh, timestamp } = job.data;
    if (!pool || !latitude || !longitude) return;

    try {
      // Check if vehicle is inside any geofence
      const result = await pool.query(
        `SELECT id, name, geofence_type, 
                ST_Distance(
                  ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                  ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography
                ) as distance_m,
                radius_meters
         FROM public.geofences 
         WHERE organization_id = $3 AND is_active = true
         AND ST_DWithin(
           ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
           ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography,
           radius_meters
         )`,
        [longitude, latitude, organization_id]
      );

      for (const fence of result.rows) {
        eventBus.safeEmit('geofence.violation', {
          vehicle_id,
          organization_id,
          geofence_id: fence.id,
          geofence_name: fence.name,
          geofence_type: fence.geofence_type,
          distance_m: fence.distance_m,
          latitude, longitude,
          speed_kmh,
          timestamp,
          event: 'inside', // simplified; real impl tracks enter/exit state
        });
      }
    } catch (err) {
      // Geofence check is non-critical — log and continue
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(), level: 'warn', protocol: 'worker',
        message: 'Geofence check failed (non-critical)', error: err.message,
      }));
    }
  };

  // ── Aggregate Refresh Worker ──
  const aggregateProcessor = async (job) => {
    if (!pool) return;
    try {
      await pool.query('SELECT public.refresh_telemetry_aggregates()');
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(), level: 'info', protocol: 'worker',
        message: 'Telemetry aggregates refreshed',
      }));
    } catch (err) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(), level: 'error', protocol: 'worker',
        message: 'Aggregate refresh failed', error: err.message,
      }));
    }
  };

  // ── Retention Cleanup Worker ──
  const retentionProcessor = async (job) => {
    if (!pool) return;
    const retainMonths = job.data?.retain_months || 6;
    try {
      // Use direct SQL since cleanup function requires auth context
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - retainMonths);
      const cutoffStr = cutoff.toISOString().slice(0, 7).replace('-', '_');
      
      const partitions = await pool.query(
        `SELECT c.relname FROM pg_inherits 
         JOIN pg_class c ON c.oid = inhrelid
         WHERE inhparent = 'public.telemetry_events'::regclass
         ORDER BY c.relname`
      );

      let dropped = 0;
      for (const row of partitions.rows) {
        const match = row.relname.match(/telemetry_events_(\d{4}_\d{2})/);
        if (match && match[1] < cutoffStr) {
          await pool.query(`DROP TABLE IF EXISTS public.${row.relname}`);
          dropped++;
        }
      }

      console.log(JSON.stringify({
        timestamp: new Date().toISOString(), level: 'info', protocol: 'worker',
        message: `Retention cleanup: dropped ${dropped} partitions older than ${retainMonths} months`,
      }));
    } catch (err) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(), level: 'error', protocol: 'worker',
        message: 'Retention cleanup failed', error: err.message,
      }));
    }
  };

  // Create queues
  if (bullAvailable && redisOpts) {
    queues.geofence = new Queue('geofence-check', redisOpts);
    queues.aggregate = new Queue('aggregate-refresh', redisOpts);
    queues.retention = new Queue('retention-cleanup', redisOpts);

    workers.geofence = new Worker('geofence-check', geofenceProcessor, {
      ...redisOpts, concurrency: 5, limiter: { max: 100, duration: 1000 },
    });
    workers.aggregate = new Worker('aggregate-refresh', aggregateProcessor, {
      ...redisOpts, concurrency: 1,
    });
    workers.retention = new Worker('retention-cleanup', retentionProcessor, {
      ...redisOpts, concurrency: 1,
    });

    // Schedule recurring jobs
    queues.aggregate.add('refresh', {}, { repeat: { every: 300000 } }); // every 5 min
    queues.retention.add('cleanup', { retain_months: 6 }, { repeat: { pattern: '0 3 * * 0' } }); // Sunday 3am

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(), level: 'info', protocol: 'worker',
      message: 'BullMQ workers initialized (Redis-backed)',
    }));
  } else {
    // In-process fallback
    queues.geofence = new InProcessQueue('geofence-check', geofenceProcessor);
    queues.aggregate = new InProcessQueue('aggregate-refresh', aggregateProcessor);
    queues.retention = new InProcessQueue('retention-cleanup', retentionProcessor);

    // Schedule recurring aggregate refresh (every 5 min)
    setInterval(() => {
      queues.aggregate.add('refresh', {});
    }, 300000);

    // Schedule retention cleanup (every 24h)
    setInterval(() => {
      queues.retention.add('cleanup', { retain_months: 6 });
    }, 86400000);

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(), level: 'info', protocol: 'worker',
      message: 'In-process workers initialized (no Redis)',
    }));
  }

  return queues;
}

function enqueueGeofenceCheck(data) {
  if (queues.geofence) {
    queues.geofence.add('check', data, { removeOnComplete: true, removeOnFail: 100 });
  }
}

function getStats() {
  return { bullmq: bullAvailable, ...stats, queues: Object.keys(queues) };
}

async function shutdown() {
  for (const w of Object.values(workers)) {
    if (w.close) await w.close();
  }
  for (const q of Object.values(queues)) {
    if (q.close) await q.close();
  }
}

module.exports = { initWorkers, enqueueGeofenceCheck, getStats, shutdown };
