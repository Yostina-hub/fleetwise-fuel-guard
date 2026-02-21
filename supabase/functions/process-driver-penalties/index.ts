import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkRateLimit, rateLimitResponse, getClientId } from "../_shared/rate-limiter.ts";
import { buildCorsHeaders, handleCorsPreflightRequest, secureJsonResponse } from "../_shared/cors.ts";

interface PenaltyConfig {
  id: string;
  organization_id: string;
  violation_type: string;
  severity: string;
  penalty_points: number;
  monetary_fine: number;
  speed_threshold_kmh: number | null;
  auto_apply: boolean;
  is_active: boolean;
}

interface ViolationData {
  organization_id: string;
  driver_id: string;
  vehicle_id: string;
  violation_type: 'overspeed' | 'geofence_exit' | 'geofence_entry_unauthorized';
  speed_kmh?: number;
  speed_limit_kmh?: number;
  geofence_id?: string;
  geofence_name?: string;
  lat?: number;
  lng?: number;
  location_name?: string;
  violation_time: string;
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = buildCorsHeaders(req);

  try {
    const rl = checkRateLimit(getClientId(req), { maxRequests: 30, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    // Validate caller authorization (service-role or authenticated user)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return secureJsonResponse({ error: "Authorization required" }, req, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the token is valid
    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === supabaseServiceKey;
    if (!isServiceRole) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return secureJsonResponse({ error: "Invalid authorization" }, req, 401);
      }
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { action, data } = body;

    if (action === 'process_overspeed') {
      return await processOverspeed(supabase, data);
    } else if (action === 'process_geofence') {
      return await processGeofenceViolation(supabase, data);
    } else if (action === 'recalculate_summary') {
      return await recalculateSummary(supabase, data.organization_id, data.driver_id);
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: unknown) {
    console.error('Error processing penalty:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processOverspeed(supabase: any, violation: ViolationData) {
  const { speed_kmh, speed_limit_kmh, organization_id, driver_id } = violation;
  
  if (!speed_kmh || !speed_limit_kmh || !driver_id) {
    console.log('Missing required data for overspeed penalty');
    return new Response(
      JSON.stringify({ success: false, message: 'Missing required data' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const speedOver = speed_kmh - speed_limit_kmh;
  if (speedOver <= 0) {
    return new Response(
      JSON.stringify({ success: false, message: 'Not overspeeding' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get penalty configurations for overspeed
  const { data: configs, error: configError } = await supabase
    .from('penalty_configurations')
    .select('*')
    .eq('organization_id', organization_id)
    .eq('violation_type', 'overspeed')
    .eq('is_active', true)
    .order('speed_threshold_kmh', { ascending: false });

  if (configError) {
    console.error('Error fetching penalty configs:', configError);
    throw configError;
  }

  // Find matching config based on speed threshold
  let matchingConfig: PenaltyConfig | null = null;
  for (const config of configs || []) {
    if (speedOver >= (config.speed_threshold_kmh || 0)) {
      matchingConfig = config;
      break;
    }
  }

  if (!matchingConfig) {
    console.log('No matching penalty config for speed over:', speedOver);
    return new Response(
      JSON.stringify({ success: false, message: 'No matching penalty config' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!matchingConfig.auto_apply) {
    console.log('Auto-apply disabled for this config');
    return new Response(
      JSON.stringify({ success: false, message: 'Auto-apply disabled' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check for duplicate penalty in last 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: existingPenalty } = await supabase
    .from('driver_penalties')
    .select('id')
    .eq('driver_id', driver_id)
    .eq('violation_type', 'overspeed')
    .gte('violation_time', fiveMinutesAgo)
    .limit(1);

  if (existingPenalty && existingPenalty.length > 0) {
    console.log('Duplicate penalty within 5 minutes, skipping');
    return new Response(
      JSON.stringify({ success: false, message: 'Duplicate penalty skipped' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Create penalty record
  const { data: penalty, error: penaltyError } = await supabase
    .from('driver_penalties')
    .insert({
      organization_id,
      driver_id,
      vehicle_id: violation.vehicle_id,
      penalty_config_id: matchingConfig.id,
      violation_type: 'overspeed',
      severity: matchingConfig.severity,
      penalty_points: matchingConfig.penalty_points,
      monetary_fine: matchingConfig.monetary_fine,
      violation_time: violation.violation_time,
      speed_kmh: violation.speed_kmh,
      speed_limit_kmh: violation.speed_limit_kmh,
      lat: violation.lat,
      lng: violation.lng,
      location_name: violation.location_name,
      violation_details: {
        speed_over: speedOver,
        threshold_matched: matchingConfig.speed_threshold_kmh
      },
      status: 'applied',
      is_auto_applied: true
    })
    .select()
    .single();

  if (penaltyError) {
    console.error('Error creating penalty:', penaltyError);
    throw penaltyError;
  }

  // Update summary
  await updatePenaltySummary(supabase, organization_id, driver_id);

  console.log('Overspeed penalty created:', penalty.id);
  return new Response(
    JSON.stringify({ success: true, penalty }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function processGeofenceViolation(supabase: any, violation: ViolationData) {
  const { organization_id, driver_id, geofence_id, geofence_name } = violation;
  
  if (!driver_id || !geofence_id) {
    console.log('Missing required data for geofence penalty');
    return new Response(
      JSON.stringify({ success: false, message: 'Missing required data' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get penalty configurations for geofence violation
  const { data: configs, error: configError } = await supabase
    .from('penalty_configurations')
    .select('*')
    .eq('organization_id', organization_id)
    .eq('violation_type', violation.violation_type)
    .eq('is_active', true)
    .order('penalty_points', { ascending: false })
    .limit(1);

  if (configError) {
    console.error('Error fetching penalty configs:', configError);
    throw configError;
  }

  const matchingConfig = configs?.[0];
  if (!matchingConfig) {
    console.log('No matching penalty config for geofence violation');
    return new Response(
      JSON.stringify({ success: false, message: 'No matching penalty config' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!matchingConfig.auto_apply) {
    console.log('Auto-apply disabled for this config');
    return new Response(
      JSON.stringify({ success: false, message: 'Auto-apply disabled' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check for duplicate penalty in last 30 minutes for same geofence
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: existingPenalty } = await supabase
    .from('driver_penalties')
    .select('id')
    .eq('driver_id', driver_id)
    .eq('geofence_id', geofence_id)
    .eq('violation_type', violation.violation_type)
    .gte('violation_time', thirtyMinutesAgo)
    .limit(1);

  if (existingPenalty && existingPenalty.length > 0) {
    console.log('Duplicate geofence penalty within 30 minutes, skipping');
    return new Response(
      JSON.stringify({ success: false, message: 'Duplicate penalty skipped' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Create penalty record
  const { data: penalty, error: penaltyError } = await supabase
    .from('driver_penalties')
    .insert({
      organization_id,
      driver_id,
      vehicle_id: violation.vehicle_id,
      penalty_config_id: matchingConfig.id,
      violation_type: violation.violation_type,
      severity: matchingConfig.severity,
      penalty_points: matchingConfig.penalty_points,
      monetary_fine: matchingConfig.monetary_fine,
      violation_time: violation.violation_time,
      geofence_id,
      geofence_name,
      lat: violation.lat,
      lng: violation.lng,
      location_name: violation.location_name,
      violation_details: {},
      status: 'applied',
      is_auto_applied: true
    })
    .select()
    .single();

  if (penaltyError) {
    console.error('Error creating geofence penalty:', penaltyError);
    throw penaltyError;
  }

  // Update summary
  await updatePenaltySummary(supabase, organization_id, driver_id);

  console.log('Geofence penalty created:', penalty.id);
  return new Response(
    JSON.stringify({ success: true, penalty }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function updatePenaltySummary(supabase: any, organizationId: string, driverId: string) {
  // Get all applied penalties for this driver
  const { data: penalties, error } = await supabase
    .from('driver_penalties')
    .select('*')
    .eq('driver_id', driverId)
    .eq('organization_id', organizationId)
    .in('status', ['applied', 'pending']);

  if (error) {
    console.error('Error fetching penalties for summary:', error);
    return;
  }

  const summary = {
    total_penalty_points: 0,
    total_fines: 0,
    total_violations: penalties?.length || 0,
    overspeed_count: 0,
    geofence_count: 0,
    warning_count: 0,
    last_violation_at: null as string | null,
    is_suspended: false,
    suspension_start_date: null as string | null,
    suspension_end_date: null as string | null,
  };

  for (const penalty of penalties || []) {
    summary.total_penalty_points += penalty.penalty_points || 0;
    summary.total_fines += Number(penalty.monetary_fine) || 0;
    
    if (penalty.violation_type === 'overspeed') {
      summary.overspeed_count++;
    } else if (penalty.violation_type.includes('geofence')) {
      summary.geofence_count++;
    }
    
    if (!summary.last_violation_at || penalty.violation_time > summary.last_violation_at) {
      summary.last_violation_at = penalty.violation_time;
    }
  }

  // Check if driver should be suspended (e.g., 100+ penalty points)
  const SUSPENSION_THRESHOLD = 100;
  const SUSPENSION_DAYS = 7;
  
  if (summary.total_penalty_points >= SUSPENSION_THRESHOLD) {
    summary.is_suspended = true;
    summary.suspension_start_date = new Date().toISOString();
    summary.suspension_end_date = new Date(Date.now() + SUSPENSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    console.log(`Driver ${driverId} suspended due to ${summary.total_penalty_points} penalty points`);
  }

  // Upsert summary
  const { error: upsertError } = await supabase
    .from('driver_penalty_summary')
    .upsert({
      organization_id: organizationId,
      driver_id: driverId,
      ...summary
    }, {
      onConflict: 'organization_id,driver_id'
    });

  if (upsertError) {
    console.error('Error upserting penalty summary:', upsertError);
  }
}

async function recalculateSummary(supabase: any, organizationId: string, driverId: string) {
  await updatePenaltySummary(supabase, organizationId, driverId);
  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
