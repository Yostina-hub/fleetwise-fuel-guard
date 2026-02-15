import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit, rateLimitResponse, getClientId } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
interface AnomalyCheckResult {
  type: 'fuel_theft' | 'route_deviation' | 'speed_anomaly' | 'gps_tampering' | 'idle_excessive' | 'offline_extended';
  severity: 'low' | 'medium' | 'high' | 'critical';
  vehicleId: string;
  vehiclePlate: string;
  description: string;
  detectedAt: string;
  confidence: number;
  recommendedAction: string;
  data?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rl = checkRateLimit(getClientId(req), { maxRequests: 20, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { organizationId, checkType } = body;
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Running anomaly detection for org ${organizationId}, type: ${checkType || 'all'}`);

    const anomalies: AnomalyCheckResult[] = [];

    // Get vehicles with telemetry
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('id, plate_number, status')
      .eq('organization_id', organizationId);

    if (!vehicles || vehicles.length === 0) {
      return new Response(JSON.stringify({ anomalies: [], message: 'No vehicles found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const vehicleIds = vehicles.map(v => v.id);
    const vehicleMap = new Map(vehicles.map(v => [v.id, v]));

    // Check for different anomaly types
    if (!checkType || checkType === 'fuel') {
      const fuelAnomalies = await detectFuelAnomalies(supabase, organizationId, vehicleMap);
      anomalies.push(...fuelAnomalies);
    }

    if (!checkType || checkType === 'speed') {
      const speedAnomalies = await detectSpeedAnomalies(supabase, organizationId, vehicleMap);
      anomalies.push(...speedAnomalies);
    }

    if (!checkType || checkType === 'gps') {
      const gpsAnomalies = await detectGpsAnomalies(supabase, organizationId, vehicleMap);
      anomalies.push(...gpsAnomalies);
    }

    if (!checkType || checkType === 'offline') {
      const offlineAnomalies = await detectOfflineAnomalies(supabase, organizationId, vehicleMap);
      anomalies.push(...offlineAnomalies);
    }

    if (!checkType || checkType === 'idle') {
      const idleAnomalies = await detectIdleAnomalies(supabase, organizationId, vehicleMap);
      anomalies.push(...idleAnomalies);
    }

    // Sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    anomalies.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    console.log(`Detected ${anomalies.length} anomalies`);

    return new Response(JSON.stringify({ 
      anomalies,
      summary: {
        total: anomalies.length,
        critical: anomalies.filter(a => a.severity === 'critical').length,
        high: anomalies.filter(a => a.severity === 'high').length,
        medium: anomalies.filter(a => a.severity === 'medium').length,
        low: anomalies.filter(a => a.severity === 'low').length,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Anomaly detection error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function detectFuelAnomalies(supabase: any, orgId: string, vehicleMap: Map<string, any>): Promise<AnomalyCheckResult[]> {
  const anomalies: AnomalyCheckResult[] = [];
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const { data: fuelEvents } = await supabase
    .from('fuel_events')
    .select('*')
    .eq('organization_id', orgId)
    .gte('event_time', oneHourAgo.toISOString())
    .in('event_type', ['theft', 'leak', 'sudden_drop']);

  if (fuelEvents) {
    for (const event of fuelEvents) {
      const vehicle = vehicleMap.get(event.vehicle_id);
      if (!vehicle) continue;

      anomalies.push({
        type: 'fuel_theft',
        severity: Math.abs(event.fuel_change_liters) > 50 ? 'critical' : 'high',
        vehicleId: event.vehicle_id,
        vehiclePlate: vehicle.plate_number || 'Unknown',
        description: `Sudden fuel drop of ${Math.abs(event.fuel_change_liters).toFixed(1)}L detected`,
        detectedAt: event.event_time,
        confidence: 85,
        recommendedAction: 'Investigate immediately. Check for unauthorized siphoning or sensor malfunction.',
        data: { fuelDrop: event.fuel_change_liters }
      });
    }
  }

  return anomalies;
}

async function detectSpeedAnomalies(supabase: any, orgId: string, vehicleMap: Map<string, any>): Promise<AnomalyCheckResult[]> {
  const anomalies: AnomalyCheckResult[] = [];

  // Get current telemetry with excessive speed
  const { data: telemetry } = await supabase
    .from('vehicle_telemetry')
    .select('vehicle_id, speed_kmh, last_communication_at')
    .eq('organization_id', orgId)
    .gt('speed_kmh', 120); // Extremely high speed

  if (telemetry) {
    for (const t of telemetry) {
      const vehicle = vehicleMap.get(t.vehicle_id);
      if (!vehicle) continue;

      const severity = t.speed_kmh > 150 ? 'critical' : t.speed_kmh > 130 ? 'high' : 'medium';
      
      anomalies.push({
        type: 'speed_anomaly',
        severity,
        vehicleId: t.vehicle_id,
        vehiclePlate: vehicle.plate_number || 'Unknown',
        description: `Excessive speed detected: ${t.speed_kmh.toFixed(0)} km/h`,
        detectedAt: t.last_communication_at,
        confidence: 95,
        recommendedAction: 'Contact driver immediately. Consider remote speed limiting.',
        data: { speed: t.speed_kmh }
      });
    }
  }

  return anomalies;
}

async function detectGpsAnomalies(supabase: any, orgId: string, vehicleMap: Map<string, any>): Promise<AnomalyCheckResult[]> {
  const anomalies: AnomalyCheckResult[] = [];

  const { data: telemetry } = await supabase
    .from('vehicle_telemetry')
    .select('vehicle_id, gps_jamming_detected, gps_spoofing_detected, gps_signal_strength, last_communication_at')
    .eq('organization_id', orgId)
    .or('gps_jamming_detected.eq.true,gps_spoofing_detected.eq.true');

  if (telemetry) {
    for (const t of telemetry) {
      const vehicle = vehicleMap.get(t.vehicle_id);
      if (!vehicle) continue;

      if (t.gps_jamming_detected) {
        anomalies.push({
          type: 'gps_tampering',
          severity: 'critical',
          vehicleId: t.vehicle_id,
          vehiclePlate: vehicle.plate_number || 'Unknown',
          description: 'GPS jamming detected - possible tampering attempt',
          detectedAt: t.last_communication_at,
          confidence: 90,
          recommendedAction: 'Investigate immediately. Check for unauthorized devices.',
        });
      }

      if (t.gps_spoofing_detected) {
        anomalies.push({
          type: 'gps_tampering',
          severity: 'critical',
          vehicleId: t.vehicle_id,
          vehiclePlate: vehicle.plate_number || 'Unknown',
          description: 'GPS spoofing detected - location data may be falsified',
          detectedAt: t.last_communication_at,
          confidence: 85,
          recommendedAction: 'Verify vehicle location through alternative means. Contact driver.',
        });
      }
    }
  }

  return anomalies;
}

async function detectOfflineAnomalies(supabase: any, orgId: string, vehicleMap: Map<string, any>): Promise<AnomalyCheckResult[]> {
  const anomalies: AnomalyCheckResult[] = [];
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);

  const { data: telemetry } = await supabase
    .from('vehicle_telemetry')
    .select('vehicle_id, last_communication_at, device_connected')
    .eq('organization_id', orgId)
    .lt('last_communication_at', threeHoursAgo.toISOString());

  if (telemetry) {
    for (const t of telemetry) {
      const vehicle = vehicleMap.get(t.vehicle_id);
      if (!vehicle || vehicle.status === 'inactive') continue;

      const hoursOffline = (Date.now() - new Date(t.last_communication_at).getTime()) / (1000 * 60 * 60);
      const severity = hoursOffline > 24 ? 'high' : hoursOffline > 12 ? 'medium' : 'low';

      anomalies.push({
        type: 'offline_extended',
        severity,
        vehicleId: t.vehicle_id,
        vehiclePlate: vehicle.plate_number || 'Unknown',
        description: `Vehicle offline for ${hoursOffline.toFixed(1)} hours`,
        detectedAt: t.last_communication_at,
        confidence: 100,
        recommendedAction: 'Check device connectivity. Verify vehicle location.',
        data: { hoursOffline }
      });
    }
  }

  return anomalies;
}

async function detectIdleAnomalies(supabase: any, orgId: string, vehicleMap: Map<string, any>): Promise<AnomalyCheckResult[]> {
  const anomalies: AnomalyCheckResult[] = [];
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Check for excessive idle in recent trips
  const { data: trips } = await supabase
    .from('trips')
    .select('vehicle_id, idle_time_minutes, duration_minutes, start_time')
    .eq('organization_id', orgId)
    .gte('start_time', oneDayAgo.toISOString())
    .gt('idle_time_minutes', 60); // More than 1 hour idle

  if (trips) {
    for (const trip of trips) {
      const vehicle = vehicleMap.get(trip.vehicle_id);
      if (!vehicle) continue;

      const idlePercent = trip.duration_minutes > 0 ? (trip.idle_time_minutes / trip.duration_minutes) * 100 : 0;
      if (idlePercent < 30) continue; // Skip if idle is less than 30% of trip

      anomalies.push({
        type: 'idle_excessive',
        severity: idlePercent > 50 ? 'high' : 'medium',
        vehicleId: trip.vehicle_id,
        vehiclePlate: vehicle.plate_number || 'Unknown',
        description: `Excessive idle time: ${trip.idle_time_minutes} minutes (${idlePercent.toFixed(0)}% of trip)`,
        detectedAt: trip.start_time,
        confidence: 80,
        recommendedAction: 'Review driver behavior. Consider anti-idle training.',
        data: { idleMinutes: trip.idle_time_minutes, idlePercent }
      });
    }
  }

  return anomalies;
}
