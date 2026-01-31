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
  speed_knots?: number;  // Speed in knots - will be auto-converted to km/h
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

const round2 = (n: number) => Math.round(n * 100) / 100;

function shouldAssumeSpeedIsKnots(trackerModel?: string | null): boolean {
  const model = (trackerModel ?? '').toLowerCase();
  // Common GPS-103/TK103 family devices report speed in knots
  return (
    model.includes('tk103') ||
    model.includes('gps103') ||
    model.includes('coban') ||
    model.includes('303')
  );
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

// Check restricted hours and trigger engine lock if violation detected
async function checkRestrictedHours(
  supabase: any,
  vehicleId: string,
  organizationId: string,
  deviceId: string,
  lat: number,
  lng: number
) {
  try {
    // Get restricted hours config for this vehicle
    const { data: config, error: configError } = await supabase
      .from('vehicle_restricted_hours')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .eq('is_enabled', true)
      .maybeSingle();

    if (configError || !config) {
      return; // No active config
    }

    const now = new Date();
    const currentDayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    const currentTimeStr = now.toTimeString().slice(0, 8); // HH:MM:SS

    // Check if today is an active day
    const activeDays = config.active_days || [1, 2, 3, 4, 5];
    if (!activeDays.includes(currentDayOfWeek)) {
      return; // Not an active day
    }

    const allowedStart = config.allowed_start_time; // HH:MM:SS
    const allowedEnd = config.allowed_end_time;     // HH:MM:SS

    // Check if current time is within allowed hours
    let isWithinAllowed = false;
    if (allowedStart <= allowedEnd) {
      // Normal range (e.g., 08:00 - 18:00)
      isWithinAllowed = currentTimeStr >= allowedStart && currentTimeStr <= allowedEnd;
    } else {
      // Overnight range (e.g., 22:00 - 06:00)
      isWithinAllowed = currentTimeStr >= allowedStart || currentTimeStr <= allowedEnd;
    }

    if (isWithinAllowed) {
      return; // Within allowed hours
    }

    // Violation detected - check for recent violations to avoid spamming
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const { data: recentViolation } = await supabase
      .from('restricted_hours_violations')
      .select('id')
      .eq('vehicle_id', vehicleId)
      .gte('violation_time', fiveMinutesAgo)
      .maybeSingle();

    if (recentViolation) {
      return; // Already logged a violation recently
    }

    // Get driver info
    const { data: vehicleData } = await supabase
      .from('vehicles')
      .select('assigned_driver_id')
      .eq('id', vehicleId)
      .single();

    // Log the violation - match actual table schema
    const violationData: Record<string, any> = {
      organization_id: organizationId,
      vehicle_id: vehicleId,
      driver_id: vehicleData?.assigned_driver_id || null,
      restriction_id: config.id,
      violation_time: now.toISOString(),
      allowed_start_time: allowedStart,
      allowed_end_time: allowedEnd,
      actual_time: currentTimeStr,
      start_location: { lat, lng },
      notes: `Day of week: ${currentDayOfWeek}, Engine lock: ${config.engine_lock_enabled ? 'enabled' : 'disabled'}`,
    };

    // If engine lock is enabled, send cutoff command
    if (config.engine_lock_enabled) {
      let commandId: string | null = null;

      // Queue the engine cutoff command
      const commandPayload = {
        command_type: 'engine_cutoff',
        command_payload: {
          action: config.send_warning_first ? 'delayed_cutoff' : 'immediate_cutoff',
          delay_seconds: config.lock_delay_seconds || 30,
          reason: 'restricted_hours_violation',
          warning_message: config.warning_message || 'Vehicle operating outside allowed hours',
        },
        device_id: deviceId,
        vehicle_id: vehicleId,
        organization_id: organizationId,
        status: 'pending',
        priority: 'high',
        expires_at: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
      };

      const { data: commandData, error: commandError } = await supabase
        .from('device_commands')
        .insert(commandPayload)
        .select('id')
        .single();

      if (commandError) {
        console.error('Error queuing engine cutoff command:', commandError);
        violationData.notes = `Day of week: ${currentDayOfWeek}, Warning sent (command failed)`;
      } else {
        commandId = commandData.id;
        violationData.notes = `Day of week: ${currentDayOfWeek}, Engine lock command ID: ${commandId}`;
        console.log(`Engine cutoff command queued for vehicle ${vehicleId}, command ID: ${commandId}`);
      }
    }

    // Insert violation record
    const { error: violationError } = await supabase
      .from('restricted_hours_violations')
      .insert(violationData);

    if (violationError) {
      console.error('Error logging restricted hours violation:', violationError);
    } else {
      console.log(`Restricted hours violation logged for vehicle ${vehicleId}`);
    }

    // Create an alert for the violation
    const { error: alertError } = await supabase
      .from('alerts')
      .insert({
        organization_id: organizationId,
        vehicle_id: vehicleId,
        driver_id: vehicleData?.assigned_driver_id || null,
        alert_type: 'restricted_hours',
        title: 'Restricted Hours Violation',
        message: `Vehicle operating outside allowed hours (${allowedStart.slice(0, 5)} - ${allowedEnd.slice(0, 5)})`,
        severity: config.engine_lock_enabled ? 'high' : 'medium',
        status: 'active',
        alert_time: now.toISOString(),
        lat: lat,
        lng: lng,
        alert_data: {
          allowed_start: allowedStart,
          allowed_end: allowedEnd,
          actual_time: currentTimeStr,
          engine_lock_enabled: config.engine_lock_enabled,
        },
      });

    if (alertError) {
      console.error('Error creating restricted hours alert:', alertError);
    }

  } catch (error) {
    console.error('Error checking restricted hours:', error);
  }
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

// ==================== Fuel Event Detection ====================
const FUEL_REFUEL_THRESHOLD_PERCENT = 5;
const FUEL_THEFT_THRESHOLD_PERCENT = 10;
const FUEL_DRAIN_THRESHOLD_PERCENT = 8;
const FUEL_LEAK_THRESHOLD_PERCENT = 3;
const FUEL_DETECTION_COOLDOWN_MS = 5 * 60 * 1000;

async function detectFuelEvents(
  supabase: any,
  vehicleId: string,
  organizationId: string,
  currentFuel: number,
  lat: number,
  lng: number,
  ignitionOn: boolean,
  speedKmh: number
) {
  try {
    const { data: lastTelemetry } = await supabase
      .from('vehicle_telemetry')
      .select('fuel_level_percent, ignition_on, speed_kmh, created_at')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false })
      .limit(2);

    if (!lastTelemetry || lastTelemetry.length < 2) return;

    const previousFuel = lastTelemetry[1]?.fuel_level_percent;
    if (previousFuel == null || currentFuel == null) return;

    const fuelChange = currentFuel - previousFuel;
    if (Math.abs(fuelChange) < 2) return;

    const cooldownTime = new Date(Date.now() - FUEL_DETECTION_COOLDOWN_MS).toISOString();
    const { data: recentEvent } = await supabase
      .from('fuel_events')
      .select('id')
      .eq('vehicle_id', vehicleId)
      .gte('event_time', cooldownTime)
      .maybeSingle();

    if (recentEvent) return;

    let eventType: 'refuel' | 'theft' | 'drain' | 'leak' | null = null;
    let confidenceScore = 0.5;

    if (fuelChange >= FUEL_REFUEL_THRESHOLD_PERCENT) {
      eventType = 'refuel';
      confidenceScore = Math.min(0.9, 0.5 + (fuelChange / 50));
    } else if (fuelChange <= -FUEL_THEFT_THRESHOLD_PERCENT && !ignitionOn && speedKmh < 5) {
      eventType = 'theft';
      confidenceScore = Math.min(0.95, 0.7 + (Math.abs(fuelChange) / 100));
    } else if (fuelChange <= -FUEL_DRAIN_THRESHOLD_PERCENT && !ignitionOn) {
      eventType = 'drain';
      confidenceScore = 0.7;
    } else if (fuelChange <= -FUEL_LEAK_THRESHOLD_PERCENT && ignitionOn && speedKmh > 0) {
      eventType = 'leak';
      confidenceScore = 0.5;
    }

    if (!eventType) return;

    const { data: activeTrip } = await supabase
      .from('trips')
      .select('id')
      .eq('vehicle_id', vehicleId)
      .eq('status', 'in_progress')
      .limit(1)
      .maybeSingle();

    await supabase.from('fuel_events').insert({
      organization_id: organizationId,
      vehicle_id: vehicleId,
      trip_id: activeTrip?.id || null,
      event_type: eventType,
      event_time: new Date().toISOString(),
      fuel_before_liters: previousFuel * 0.6,
      fuel_after_liters: currentFuel * 0.6,
      fuel_change_liters: fuelChange * 0.6,
      fuel_change_percent: fuelChange,
      lat: lat,
      lng: lng,
      speed_kmh: speedKmh,
      ignition_status: ignitionOn,
      confidence_score: confidenceScore,
      status: eventType === 'refuel' ? 'confirmed' : 'pending',
    });

    console.log(`Fuel ${eventType} detected at (${lat.toFixed(4)}, ${lng.toFixed(4)})`);

    if (eventType === 'theft' || eventType === 'drain') {
      const { data: vehicleData } = await supabase
        .from('vehicles')
        .select('plate_number, assigned_driver_id')
        .eq('id', vehicleId)
        .single();

      await supabase.from('alerts').insert({
        organization_id: organizationId,
        vehicle_id: vehicleId,
        driver_id: vehicleData?.assigned_driver_id || null,
        alert_type: eventType === 'theft' ? 'fuel_theft' : 'fuel_drain',
        title: eventType === 'theft' ? 'Potential Fuel Theft Detected' : 'Fuel Drain Detected',
        message: `${Math.abs(fuelChange).toFixed(1)}% fuel ${eventType === 'theft' ? 'stolen' : 'drained'} from ${vehicleData?.plate_number || 'vehicle'}`,
        severity: eventType === 'theft' ? 'critical' : 'high',
        status: 'active',
        alert_time: new Date().toISOString(),
        lat: lat,
        lng: lng,
      });
    }
  } catch (error) {
    console.error('Error in fuel event detection:', error);
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
    .select('id, vehicle_id, organization_id, tracker_model')
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
    // If the external system provides ignition/engine state during heartbeat/login,
    // update the latest telemetry row so the UI doesn't show stale engine status.
    const hasEngineState = record.ignition !== undefined || record.engine_on !== undefined;

    if (hasEngineState && device.vehicle_id) {
      const ignitionState = record.ignition ?? record.engine_on ?? false;

      const { data: latestTelemetry, error: latestTelemetryError } = await supabase
        .from('vehicle_telemetry')
        .select('id')
        .eq('vehicle_id', device.vehicle_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestTelemetryError) {
        console.warn('Failed to load latest telemetry for status update:', latestTelemetryError);
      } else if (latestTelemetry?.id) {
        const { error: updateError } = await supabase
          .from('vehicle_telemetry')
          .update({
            engine_on: ignitionState,
            ignition_on: ignitionState,
            device_connected: true,
          })
          .eq('id', latestTelemetry.id);

        if (updateError) {
          console.warn('Failed to update telemetry engine state from status update:', updateError);
        } else {
          console.log(
            `Telemetry engine state updated for ${record.imei}: engine_on=${ignitionState} (status=${record.event_type})`
          );
        }
      }
    }

    console.log(`Status update processed for ${record.imei}: ${record.event_type}`);
    return {
      success: true,
      device_id: device.id,
      vehicle_id: device.vehicle_id,
      processed_at: processedAt,
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

    // Convert speed to km/h
    // - Prefer explicit speed_knots when provided
    // - If only speed_kmh is provided, some device families (e.g. TK103/GPS103) still send knots
    //   → we infer from tracker_model (or raw_data.speed_unit if present)
    const rawSpeedKmhField = record.speed_kmh;
    const rawSpeedUnit = typeof record.raw_data?.speed_unit === 'string'
      ? record.raw_data.speed_unit.toLowerCase()
      : undefined;

    const speedKmh = record.speed_knots !== undefined
      ? round2(record.speed_knots * 1.852)
      : (rawSpeedKmhField !== undefined && (rawSpeedUnit === 'knots' || rawSpeedUnit === 'kt' || (rawSpeedUnit === undefined && shouldAssumeSpeedIsKnots(device.tracker_model))))
        ? round2(rawSpeedKmhField * 1.852)
        : (rawSpeedKmhField ?? 0);

    // Build telemetry record
    const telemetryData = {
      vehicle_id: device.vehicle_id,
      organization_id: device.organization_id,
      latitude: record.latitude,
      longitude: record.longitude,
      speed_kmh: speedKmh,
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

    // Detect fuel events (refuel, theft, drain, leak) with GPS coordinates
    if (record.fuel_level_percent != null) {
      await detectFuelEvents(
        supabase,
        device.vehicle_id,
        device.organization_id,
        record.fuel_level_percent,
        record.latitude!,
        record.longitude!,
        ignitionState,
        speedKmh
      );
    }

    // Check for overspeeding
    if (speedKmh > 0) {
      // Get or create governor config for this vehicle
      let { data: governorConfig } = await supabase
        .from('speed_governor_config')
        .select('max_speed_limit, governor_active')
        .eq('vehicle_id', device.vehicle_id)
        .maybeSingle();

      // Auto-create governor config if it doesn't exist
      if (!governorConfig) {
        const { data: newConfig } = await supabase
          .from('speed_governor_config')
          .insert({
            organization_id: device.organization_id,
            vehicle_id: device.vehicle_id,
            max_speed_limit: 80,
            governor_active: true,
          })
          .select('max_speed_limit, governor_active')
          .single();
        governorConfig = newConfig;
        console.log(`Auto-created governor config for vehicle ${device.vehicle_id}`);
      }

      const speedLimit = governorConfig?.max_speed_limit || 80;
      const isGovernorActive = governorConfig?.governor_active ?? true;

      if (isGovernorActive && speedKmh > speedLimit) {
        const { data: vehicleData } = await supabase
          .from('vehicles')
          .select('assigned_driver_id, speed_cutoff_enabled, speed_cutoff_limit_kmh, speed_cutoff_grace_seconds')
          .eq('id', device.vehicle_id)
          .single();

        // Determine severity based on how much over the limit
        const speedOver = speedKmh - speedLimit;
        const severity = speedOver >= 30 ? 'critical' : speedOver >= 15 ? 'high' : speedOver >= 5 ? 'medium' : 'low';
        const violationTime = record.timestamp || processedAt;

        // Check for duplicate violation in last 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data: recentViolation } = await supabase
          .from('speed_violations')
          .select('id')
          .eq('vehicle_id', device.vehicle_id)
          .gte('violation_time', fiveMinutesAgo)
          .maybeSingle();

        if (!recentViolation) {
          // Insert into speed_violations table
          const { error: violationError } = await supabase
            .from('speed_violations')
            .insert({
              organization_id: device.organization_id,
              vehicle_id: device.vehicle_id,
              driver_id: vehicleData?.assigned_driver_id || null,
              violation_time: violationTime,
              speed_kmh: speedKmh,
              speed_limit_kmh: speedLimit,
              lat: record.latitude,
              lng: record.longitude,
              severity: severity,
            });

          if (violationError) {
            console.error('Error inserting speed violation:', violationError);
          } else {
            console.log(`Speed violation recorded: ${speedKmh} km/h (limit: ${speedLimit})`);
          }

          // ==================== SPEED CUTOFF ENFORCEMENT ====================
          // Check if speed cutoff is enabled for this vehicle
          const cutoffEnabled = vehicleData?.speed_cutoff_enabled === true;
          const cutoffLimit = vehicleData?.speed_cutoff_limit_kmh || speedLimit;
          const graceSeconds = vehicleData?.speed_cutoff_grace_seconds || 10;

          if (cutoffEnabled && speedKmh > cutoffLimit) {
            // Check for recent cutoff command to avoid spamming (within grace period + 60s)
            const cutoffCooldown = new Date(Date.now() - (graceSeconds + 60) * 1000).toISOString();
            const { data: recentCutoff } = await supabase
              .from('device_commands')
              .select('id')
              .eq('vehicle_id', device.vehicle_id)
              .eq('command_type', 'engine_cutoff')
              .gte('created_at', cutoffCooldown)
              .maybeSingle();

            if (!recentCutoff) {
              // Queue engine cutoff command after grace period
              const cutoffCommand = {
                device_id: device.id,
                vehicle_id: device.vehicle_id,
                organization_id: device.organization_id,
                command_type: 'engine_cutoff',
                command_payload: {
                  action: 'speed_cutoff',
                  reason: 'overspeed_violation',
                  speed_kmh: speedKmh,
                  speed_limit_kmh: cutoffLimit,
                  grace_seconds: graceSeconds,
                  relay_command: 'relay,1#', // TK103/GT06 relay OFF command
                  warning_message: `Speed limit ${cutoffLimit} km/h exceeded. Engine will be disabled.`,
                },
                status: 'pending',
                priority: severity === 'critical' ? 'critical' : 'high',
                expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 min expiry
              };

              const { data: commandData, error: commandError } = await supabase
                .from('device_commands')
                .insert(cutoffCommand)
                .select('id')
                .single();

              if (commandError) {
                console.error('Error queuing speed cutoff command:', commandError);
              } else {
                console.log(`⚠️ SPEED CUTOFF queued for vehicle ${device.vehicle_id}: ${speedKmh} km/h > ${cutoffLimit} km/h, command ID: ${commandData.id}`);

                // Create high-priority alert for cutoff
                await supabase.from('alerts').insert({
                  organization_id: device.organization_id,
                  vehicle_id: device.vehicle_id,
                  driver_id: vehicleData?.assigned_driver_id || null,
                  alert_type: 'speed_cutoff',
                  title: 'Speed Cutoff Triggered',
                  message: `Engine cutoff command sent. Speed: ${speedKmh} km/h (limit: ${cutoffLimit} km/h)`,
                  severity: 'critical',
                  status: 'active',
                  alert_time: violationTime,
                  lat: record.latitude,
                  lng: record.longitude,
                  alert_data: {
                    speed_kmh: speedKmh,
                    speed_limit_kmh: cutoffLimit,
                    command_id: commandData.id,
                    grace_seconds: graceSeconds,
                  },
                });
              }
            }
          }
        }

        // Also process driver penalties if driver assigned
        if (vehicleData?.assigned_driver_id) {
          try {
            await supabase.functions.invoke('process-driver-penalties', {
              body: {
                action: 'process_overspeed',
                data: {
                  organization_id: device.organization_id,
                  driver_id: vehicleData.assigned_driver_id,
                  vehicle_id: device.vehicle_id,
                  speed_kmh: speedKmh,
                  speed_limit_kmh: speedLimit,
                  lat: record.latitude,
                  lng: record.longitude,
                  violation_time: violationTime,
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
          speed_kmh: speedKmh,
          organization_id: device.organization_id,
        },
      });
    } catch (e) {
      console.warn('Geofence processing error:', e);
    }

    // Check restricted hours and enforce engine lock if enabled
    await checkRestrictedHours(
      supabase,
      device.vehicle_id,
      device.organization_id,
      device.id,
      record.latitude!,
      record.longitude!
    );
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
