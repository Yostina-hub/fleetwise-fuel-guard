import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

/**
 * GPS External API - Standardized telemetry ingestion endpoint
 * 
 * This API allows external GPS tracking systems to push telemetry data
 * in a clean, standardized JSON format.
 * 
 * ============================================================================
 * API SPECIFICATION
 * ============================================================================
 * 
 * Endpoint: POST /functions/v1/gps-external-api
 * 
 * Headers:
 *   - Content-Type: application/json
 *   - x-api-key: <your_api_key> (optional, for additional security)
 * 
 * ============================================================================
 * SINGLE RECORD FORMAT
 * ============================================================================
 * {
 *   "imei": "868166056739147",           // Required: Device IMEI (15 digits)
 *   "timestamp": "2025-01-04T12:30:00Z", // Optional: ISO8601 timestamp (defaults to now)
 *   
 *   // Location (required for position updates)
 *   "latitude": 9.0123,                   // Decimal degrees (-90 to 90)
 *   "longitude": 38.7456,                 // Decimal degrees (-180 to 180)
 *   
 *   // Speed & Direction
 *   "speed_kmh": 45.5,                    // Speed in km/h
 *   "heading": 180,                       // Heading in degrees (0-360)
 *   "altitude_m": 2400,                   // Altitude in meters
 *   
 *   // Engine/Vehicle Status
 *   "ignition": true,                     // Ignition on/off
 *   "engine_on": true,                    // Engine running
 *   "odometer_km": 12345.6,               // Total odometer in km
 *   
 *   // Fuel
 *   "fuel_level_percent": 75,             // Fuel level 0-100
 *   "fuel_liters": 45.5,                  // Fuel in liters (alternative)
 *   
 *   // GPS Quality
 *   "gps_satellites": 12,                 // Number of satellites
 *   "gps_signal_strength": 85,            // Signal strength 0-100
 *   "gps_hdop": 1.2,                      // Horizontal dilution of precision
 *   "gps_fix_type": "3d_fix",             // no_fix, 2d_fix, 3d_fix
 *   
 *   // Power
 *   "battery_voltage": 12.6,              // Internal battery voltage
 *   "external_voltage": 24.1,             // External/vehicle voltage
 *   
 *   // Driver
 *   "driver_id": "DRV001",                // Driver ID or RFID
 *   
 *   // Alerts/Events (optional)
 *   "event_type": "position",             // position, sos, overspeed, geofence_enter, geofence_exit, harsh_brake, etc.
 *   "alarm_type": null,                   // sos, power_cut, vibration, etc.
 *   
 *   // Temperature sensors
 *   "temperature_1": 25.5,                // Temperature sensor 1 (°C)
 *   "temperature_2": -18.0,               // Temperature sensor 2 (°C)
 *   
 *   // Extended data (raw, stored as JSON)
 *   "raw_data": { ... }                   // Any additional protocol-specific data
 * }
 * 
 * ============================================================================
 * BATCH FORMAT (up to 100 records)
 * ============================================================================
 * {
 *   "records": [
 *     { "imei": "...", "latitude": ..., ... },
 *     { "imei": "...", "latitude": ..., ... }
 *   ]
 * }
 * 
 * ============================================================================
 * STATUS UPDATE FORMAT (no location required)
 * ============================================================================
 * {
 *   "imei": "868166056739147",
 *   "event_type": "heartbeat",            // login, heartbeat, alarm
 *   "alarm_type": "sos",                  // For alarm events
 *   "ignition": true,
 *   "battery_voltage": 12.6
 * }
 * 
 * ============================================================================
 * RESPONSE FORMAT
 * ============================================================================
 * Success (200):
 * {
 *   "success": true,
 *   "message": "Telemetry received",
 *   "device_id": "uuid",
 *   "vehicle_id": "uuid",
 *   "processed_at": "2025-01-04T12:30:00Z"
 * }
 * 
 * Batch Success (200):
 * {
 *   "success": true,
 *   "batch": true,
 *   "total": 10,
 *   "successful": 9,
 *   "failed": 1,
 *   "errors": [{ "index": 3, "error": "Invalid coordinates" }]
 * }
 * 
 * Error (4xx/5xx):
 * {
 *   "success": false,
 *   "error": "Error message",
 *   "code": "DEVICE_NOT_FOUND"
 * }
 * 
 * ============================================================================
 * ERROR CODES
 * ============================================================================
 * - MISSING_IMEI: No IMEI provided
 * - DEVICE_NOT_FOUND: Device with IMEI not registered
 * - INVALID_COORDINATES: Latitude/longitude out of range
 * - RATE_LIMITED: Too many requests (max 120/min per device)
 * - INVALID_JSON: Request body is not valid JSON
 * - BATCH_TOO_LARGE: Batch contains more than 100 records
 */

// Rate limiting
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 120;

interface TelemetryRecord {
  imei: string;
  timestamp?: string;
  latitude?: number;
  longitude?: number;
  speed_kmh?: number;
  heading?: number;
  altitude_m?: number;
  ignition?: boolean;
  engine_on?: boolean;
  odometer_km?: number;
  fuel_level_percent?: number;
  fuel_liters?: number;
  gps_satellites?: number;
  gps_signal_strength?: number;
  gps_hdop?: number;
  gps_fix_type?: string;
  battery_voltage?: number;
  external_voltage?: number;
  driver_id?: string;
  event_type?: string;
  alarm_type?: string;
  temperature_1?: number;
  temperature_2?: number;
  raw_data?: Record<string, unknown>;
}

interface ProcessResult {
  success: boolean;
  error?: string;
  code?: string;
  device_id?: string;
  vehicle_id?: string;
  processed_at?: string;
}

// Check rate limit for a device
async function checkRateLimit(supabase: any, deviceId: string): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  
  const { data: rateLimit } = await supabase
    .from('device_rate_limits')
    .select('id, request_count, window_start')
    .eq('device_id', deviceId)
    .gte('window_start', windowStart)
    .order('window_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (rateLimit) {
    if (rateLimit.request_count >= RATE_LIMIT_MAX_REQUESTS) {
      return { allowed: false, remaining: 0 };
    }
    
    await supabase
      .from('device_rate_limits')
      .update({ request_count: rateLimit.request_count + 1 })
      .eq('id', rateLimit.id);
    
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - rateLimit.request_count - 1 };
  } else {
    await supabase
      .from('device_rate_limits')
      .insert({
        device_id: deviceId,
        window_start: new Date().toISOString(),
        request_count: 1,
      });
    
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
  }
}

// Validate coordinates
function validateCoordinates(lat?: number, lng?: number): boolean {
  if (lat === undefined || lng === undefined) return true; // Optional
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

// Haversine distance calculation
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c * 100) / 100;
}

// Detect trip transitions
async function detectTripTransition(
  supabase: any,
  vehicleId: string,
  organizationId: string,
  currentIgnition: boolean,
  lat: number,
  lng: number
) {
  const { data: lastTelemetry } = await supabase
    .from('vehicle_telemetry')
    .select('ignition_on, latitude, longitude')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const previousIgnition = lastTelemetry?.ignition_on ?? false;

  // Trip start
  if (currentIgnition && !previousIgnition) {
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('assigned_driver_id')
      .eq('id', vehicleId)
      .single();

    await supabase.from('trips').insert({
      organization_id: organizationId,
      vehicle_id: vehicleId,
      driver_id: vehicle?.assigned_driver_id || null,
      start_time: new Date().toISOString(),
      start_location: { lat, lng },
      status: 'in_progress',
    });
    
    console.log('Trip started for vehicle:', vehicleId);
  }

  // Trip end
  if (!currentIgnition && previousIgnition) {
    const { data: activeTrip } = await supabase
      .from('trips')
      .select('id, start_location, start_time')
      .eq('vehicle_id', vehicleId)
      .eq('status', 'in_progress')
      .order('start_time', { ascending: false })
      .limit(1)
      .single();

    if (activeTrip) {
      const startTime = new Date(activeTrip.start_time);
      const endTime = new Date();
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
      const startLat = activeTrip.start_location?.lat || lat;
      const startLng = activeTrip.start_location?.lng || lng;
      const distance = calculateDistance(startLat, startLng, lat, lng);

      await supabase.from('trips').update({
        end_time: endTime.toISOString(),
        end_location: { lat, lng },
        duration_minutes: durationMinutes,
        distance_km: distance,
        status: 'completed',
      }).eq('id', activeTrip.id);
      
      console.log('Trip completed for vehicle:', vehicleId);
    }
  }
}

// Process a single telemetry record
async function processRecord(supabase: any, record: TelemetryRecord): Promise<ProcessResult> {
  const processedAt = new Date().toISOString();
  
  // Validate IMEI
  if (!record.imei) {
    return { success: false, error: 'Missing IMEI', code: 'MISSING_IMEI' };
  }

  // Validate coordinates if provided
  if (!validateCoordinates(record.latitude, record.longitude)) {
    return { success: false, error: 'Invalid coordinates', code: 'INVALID_COORDINATES' };
  }

  // Find device by IMEI
  const { data: device, error: deviceError } = await supabase
    .from('devices')
    .select('id, vehicle_id, organization_id')
    .eq('imei', record.imei)
    .single();

  if (deviceError || !device) {
    console.log('Device not found for IMEI:', record.imei);
    return { success: false, error: `Device not found: ${record.imei}`, code: 'DEVICE_NOT_FOUND' };
  }

  // Check rate limit
  const rateCheck = await checkRateLimit(supabase, device.id);
  if (!rateCheck.allowed) {
    return { success: false, error: 'Rate limit exceeded (120/min)', code: 'RATE_LIMITED' };
  }

  // Update device heartbeat
  await supabase.from('devices').update({ 
    last_heartbeat: processedAt,
    status: 'active'
  }).eq('id', device.id);

  // Determine if this is a status-only update
  const isStatusUpdate = record.event_type && ['login', 'heartbeat', 'alarm'].includes(record.event_type);
  const hasLocation = record.latitude !== undefined && record.longitude !== undefined;

  // Handle alarm events
  if (record.event_type === 'alarm' && record.alarm_type && device.vehicle_id) {
    await supabase.from('alerts').insert({
      organization_id: device.organization_id,
      vehicle_id: device.vehicle_id,
      alert_type: record.alarm_type,
      title: `Device Alarm: ${record.alarm_type.replace(/_/g, ' ').toUpperCase()}`,
      message: `GPS device triggered ${record.alarm_type} alarm`,
      severity: record.alarm_type === 'sos' ? 'critical' : 'medium',
      alert_time: record.timestamp || processedAt,
      lat: record.latitude || null,
      lng: record.longitude || null,
    });
  }

  // If status-only update, we're done
  if (isStatusUpdate && !hasLocation) {
    console.log(`Status update processed for ${record.imei}: ${record.event_type}`);
    return { 
      success: true, 
      device_id: device.id, 
      vehicle_id: device.vehicle_id,
      processed_at: processedAt 
    };
  }

  // For location updates, we need coordinates
  if (!hasLocation) {
    return { success: false, error: 'Location updates require latitude and longitude', code: 'MISSING_LOCATION' };
  }

  // Insert telemetry if vehicle is linked
  if (device.vehicle_id) {
    const ignitionState = record.ignition ?? record.engine_on ?? false;
    
    // Detect trip transitions
    await detectTripTransition(
      supabase,
      device.vehicle_id,
      device.organization_id,
      ignitionState,
      record.latitude!,
      record.longitude!
    );

    // Build telemetry record
    const telemetryData = {
      vehicle_id: device.vehicle_id,
      organization_id: device.organization_id,
      latitude: record.latitude,
      longitude: record.longitude,
      speed_kmh: record.speed_kmh ?? 0,
      heading: record.heading ?? null,
      altitude_meters: record.altitude_m ?? null,
      engine_on: ignitionState,
      ignition_on: ignitionState,
      odometer_km: record.odometer_km ?? null,
      fuel_level_percent: record.fuel_level_percent ?? null,
      gps_satellites_count: record.gps_satellites ?? null,
      gps_signal_strength: record.gps_signal_strength ?? null,
      gps_hdop: record.gps_hdop ?? null,
      gps_fix_type: record.gps_fix_type ?? null,
      battery_voltage: record.battery_voltage ?? null,
      external_voltage: record.external_voltage ?? null,
      temperature_1: record.temperature_1 ?? null,
      temperature_2: record.temperature_2 ?? null,
      driver_rfid: record.driver_id ?? null,
      device_connected: true,
      last_communication_at: record.timestamp || processedAt,
    };

    const { error: telemetryError } = await supabase
      .from('vehicle_telemetry')
      .insert(telemetryData);

    if (telemetryError) {
      console.error('Error inserting telemetry:', telemetryError);
      return { success: false, error: 'Failed to store telemetry', code: 'DB_ERROR' };
    }

    // Check for overspeeding
    if (record.speed_kmh && record.speed_kmh > 0) {
      const { data: governorConfig } = await supabase
        .from('speed_governor_config')
        .select('max_speed_limit, governor_active')
        .eq('vehicle_id', device.vehicle_id)
        .eq('governor_active', true)
        .single();

      const speedLimit = governorConfig?.max_speed_limit || 80;

      if (record.speed_kmh > speedLimit) {
        const { data: vehicleData } = await supabase
          .from('vehicles')
          .select('assigned_driver_id')
          .eq('id', device.vehicle_id)
          .single();

        if (vehicleData?.assigned_driver_id) {
          try {
            await supabase.functions.invoke('process-driver-penalties', {
              body: {
                action: 'process_overspeed',
                data: {
                  organization_id: device.organization_id,
                  driver_id: vehicleData.assigned_driver_id,
                  vehicle_id: device.vehicle_id,
                  speed_kmh: record.speed_kmh,
                  speed_limit_kmh: speedLimit,
                  lat: record.latitude,
                  lng: record.longitude,
                  violation_time: record.timestamp || processedAt,
                },
              },
            });
          } catch (e) {
            console.warn('Penalty processing error:', e);
          }
        }
      }
    }

    // Trigger geofence processing
    try {
      await supabase.functions.invoke('process-geofence-events', {
        body: {
          vehicle_id: device.vehicle_id,
          lat: record.latitude,
          lng: record.longitude,
          speed_kmh: record.speed_kmh || 0,
          organization_id: device.organization_id,
        },
      });
    } catch (e) {
      console.warn('Geofence processing error:', e);
    }
  }

  console.log(`Telemetry processed for ${record.imei}: lat=${record.latitude}, lng=${record.longitude}`);
  
  return { 
    success: true, 
    device_id: device.id, 
    vehicle_id: device.vehicle_id,
    processed_at: processedAt 
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse JSON body
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON', code: 'INVALID_JSON' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for batch mode
    if (body.records && Array.isArray(body.records)) {
      if (body.records.length > 100) {
        return new Response(
          JSON.stringify({ success: false, error: 'Batch too large (max 100)', code: 'BATCH_TOO_LARGE' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Processing batch of ${body.records.length} records`);
      
      const results: ProcessResult[] = [];
      const errors: { index: number; error: string }[] = [];
      
      for (let i = 0; i < body.records.length; i++) {
        const result = await processRecord(supabase, body.records[i]);
        results.push(result);
        if (!result.success) {
          errors.push({ index: i, error: result.error || 'Unknown error' });
        }
      }

      const successful = results.filter(r => r.success).length;
      
      return new Response(
        JSON.stringify({
          success: true,
          batch: true,
          total: results.length,
          successful,
          failed: results.length - successful,
          errors: errors.slice(0, 10), // First 10 errors
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Single record mode
    const result = await processRecord(supabase, body as TelemetryRecord);
    
    if (!result.success) {
      const status = result.code === 'DEVICE_NOT_FOUND' ? 404 : 
                    result.code === 'RATE_LIMITED' ? 429 : 400;
      return new Response(
        JSON.stringify(result),
        { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ message: 'Telemetry received', ...result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
