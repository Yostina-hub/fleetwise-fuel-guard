/**
 * Analytics REST API
 * 
 * Provides HTTP endpoints for querying pre-calculated telemetry aggregates
 * and raw time-series data. Designed for internal gateway access or
 * frontend-to-gateway communication.
 * 
 * Endpoints:
 *   GET /api/telemetry/aggregates?granularity=hourly|daily&vehicle_id=...&from=...&to=...&limit=200
 *   GET /api/telemetry/events?vehicle_id=...&event_type=...&from=...&to=...&limit=100
 *   GET /api/telemetry/summary?vehicle_id=...
 */

let pgPool = null;

function init(pool) {
  pgPool = pool;
}

/**
 * Validate and sanitize query parameters
 */
function sanitizeParams(query) {
  const params = {};

  // Granularity: only 'hourly' or 'daily'
  if (query.granularity && ['hourly', 'daily'].includes(query.granularity)) {
    params.granularity = query.granularity;
  } else {
    params.granularity = 'hourly';
  }

  // UUID validation
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (query.vehicle_id && uuidRe.test(query.vehicle_id)) params.vehicleId = query.vehicle_id;
  if (query.organization_id && uuidRe.test(query.organization_id)) params.organizationId = query.organization_id;

  // Event type (alphanumeric + underscore only)
  if (query.event_type && /^[a-zA-Z0-9_]+$/.test(query.event_type)) params.eventType = query.event_type;

  // ISO date strings
  const isoRe = /^\d{4}-\d{2}-\d{2}/;
  if (query.from && isoRe.test(query.from)) params.from = query.from;
  if (query.to && isoRe.test(query.to)) params.to = query.to;

  // Limit (1-1000)
  params.limit = Math.min(Math.max(parseInt(query.limit) || 200, 1), 1000);

  // Offset
  params.offset = Math.max(parseInt(query.offset) || 0, 0);

  return params;
}

/**
 * Query pre-calculated aggregates from materialized views
 */
async function getAggregates(params) {
  if (!pgPool) throw new Error('Analytics API not initialized');

  const viewName = params.granularity === 'daily' 
    ? 'telemetry_daily_agg' 
    : 'telemetry_hourly_agg';

  const conditions = [];
  const values = [];
  let idx = 1;

  if (params.organizationId) {
    conditions.push(`organization_id = $${idx++}`);
    values.push(params.organizationId);
  }
  if (params.vehicleId) {
    conditions.push(`vehicle_id = $${idx++}`);
    values.push(params.vehicleId);
  }
  if (params.eventType) {
    conditions.push(`event_type = $${idx++}`);
    values.push(params.eventType);
  }
  if (params.from) {
    conditions.push(`bucket >= $${idx++}`);
    values.push(params.from);
  }
  if (params.to) {
    conditions.push(`bucket <= $${idx++}`);
    values.push(params.to);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT * FROM public.${viewName} ${where} ORDER BY bucket DESC LIMIT $${idx++} OFFSET $${idx++}`;
  values.push(params.limit, params.offset);

  const result = await pgPool.query(sql, values);
  return result.rows;
}

/**
 * Query raw telemetry events with pagination
 */
async function getEvents(params) {
  if (!pgPool) throw new Error('Analytics API not initialized');

  const conditions = [];
  const values = [];
  let idx = 1;

  if (params.organizationId) {
    conditions.push(`organization_id = $${idx++}`);
    values.push(params.organizationId);
  }
  if (params.vehicleId) {
    conditions.push(`vehicle_id = $${idx++}`);
    values.push(params.vehicleId);
  }
  if (params.eventType) {
    conditions.push(`event_type = $${idx++}`);
    values.push(params.eventType);
  }
  if (params.from) {
    conditions.push(`event_time >= $${idx++}`);
    values.push(params.from);
  }
  if (params.to) {
    conditions.push(`event_time <= $${idx++}`);
    values.push(params.to);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT id, event_id, organization_id, vehicle_id, device_id, event_type, event_time, payload, lat, lng, speed_kmh, heading, source FROM public.telemetry_events ${where} ORDER BY event_time DESC LIMIT $${idx++} OFFSET $${idx++}`;
  values.push(params.limit, params.offset);

  const result = await pgPool.query(sql, values);
  return result.rows;
}

/**
 * Get vehicle telemetry summary (latest stats from daily aggregates)
 */
async function getVehicleSummary(params) {
  if (!pgPool) throw new Error('Analytics API not initialized');

  if (!params.vehicleId) throw new Error('vehicle_id is required');

  const conditions = ['vehicle_id = $1'];
  const values = [params.vehicleId];

  if (params.organizationId) {
    conditions.push('organization_id = $2');
    values.push(params.organizationId);
  }

  const where = conditions.join(' AND ');

  // Last 30 days summary
  const sql = `
    SELECT 
      vehicle_id,
      COUNT(*)::int AS total_days,
      SUM(event_count)::int AS total_events,
      ROUND(AVG(avg_speed)::numeric, 1) AS avg_speed_kmh,
      ROUND(MAX(max_speed)::numeric, 1) AS max_speed_kmh,
      ROUND(AVG(avg_fuel)::numeric, 1) AS avg_fuel_pct,
      ROUND(SUM(distance_km)::numeric, 1) AS total_distance_km,
      SUM(alarm_count)::int AS total_alarms,
      MIN(bucket) AS period_start,
      MAX(bucket) AS period_end
    FROM public.telemetry_daily_agg
    WHERE ${where}
      AND bucket >= (now() - interval '30 days')
    GROUP BY vehicle_id
  `;

  const result = await pgPool.query(sql, values);
  return result.rows[0] || null;
}

/**
 * Handle HTTP request for analytics endpoints.
 * Returns true if the request was handled, false otherwise.
 */
async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname;

  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type, x-gateway-key',
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    return true;
  }

  // Auth check: require gateway shared key for API access
  const gatewayKey = process.env.GATEWAY_SHARED_KEY;
  if (gatewayKey) {
    const authHeader = req.headers['x-gateway-key'] || '';
    if (authHeader !== gatewayKey) {
      res.writeHead(401, headers);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return true;
    }
  }

  const query = Object.fromEntries(url.searchParams);
  const params = sanitizeParams(query);

  try {
    if (path === '/api/telemetry/aggregates' && req.method === 'GET') {
      const data = await getAggregates(params);
      res.writeHead(200, headers);
      res.end(JSON.stringify({ data, count: data.length, granularity: params.granularity }));
      return true;
    }

    if (path === '/api/telemetry/events' && req.method === 'GET') {
      params.limit = Math.min(params.limit, 500); // Lower limit for raw events
      const data = await getEvents(params);
      res.writeHead(200, headers);
      res.end(JSON.stringify({ data, count: data.length }));
      return true;
    }

    if (path === '/api/telemetry/summary' && req.method === 'GET') {
      const data = await getVehicleSummary(params);
      res.writeHead(200, headers);
      res.end(JSON.stringify({ data }));
      return true;
    }
  } catch (err) {
    res.writeHead(500, headers);
    res.end(JSON.stringify({ error: 'Internal server error', message: err.message }));
    return true;
  }

  return false; // Not handled
}

module.exports = { init, handleRequest, getAggregates, getEvents, getVehicleSummary };
