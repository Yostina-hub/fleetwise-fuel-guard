import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse incoming GPS data
    const contentType = req.headers.get('content-type');
    let data;

    if (contentType?.includes('application/json')) {
      data = await req.json();
    } else {
      // Handle URL-encoded or text data
      const text = await req.text();
      console.log('Received GPS data:', text);
      
      // Parse common GPS tracker formats (GT06, YTWL protocol)
      // Example expected format: imei=355442200988256&lat=9.0214&lng=38.7624&speed=45&fuel=75&ignition=1
      const params = new URLSearchParams(text);
      data = Object.fromEntries(params.entries());
    }

    console.log('Parsed GPS data:', data);

    const {
      imei,
      lat,
      lng,
      speed,
      fuel,
      ignition,
      altitude,
      heading,
      satellites,
      signal_strength
    } = data;

    if (!imei || !lat || !lng) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: imei, lat, lng' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find device by IMEI
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('id, vehicle_id, organization_id')
      .eq('imei', imei)
      .single();

    if (deviceError || !device) {
      console.error('Device not found:', imei, deviceError);
      return new Response(
        JSON.stringify({ error: 'Device not found with IMEI: ' + imei }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update device heartbeat
    const { error: heartbeatError } = await supabase
      .from('devices')
      .update({ last_heartbeat: new Date().toISOString() })
      .eq('id', device.id);

    if (heartbeatError) {
      console.error('Error updating heartbeat:', heartbeatError);
    }

    // Insert telemetry data if vehicle is linked
    if (device.vehicle_id) {
      const speedValue = speed ? parseFloat(speed) : 0;
      
      // Map to correct column names matching vehicle_telemetry table schema
      const telemetryData = {
        vehicle_id: device.vehicle_id,
        organization_id: device.organization_id,
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        speed_kmh: speedValue,
        fuel_level_percent: fuel ? parseFloat(fuel) : null,
        engine_on: ignition === '1' || ignition === 'true',
        heading: heading ? parseFloat(heading) : null,
        gps_satellites_count: satellites ? parseInt(satellites) : null,
        gps_signal_strength: signal_strength ? parseInt(signal_strength) : null,
        device_connected: true,
        last_communication_at: new Date().toISOString(),
      };

      console.log('Inserting telemetry data:', telemetryData);

      const { error: telemetryError } = await supabase
        .from('vehicle_telemetry')
        .insert(telemetryData);

      if (telemetryError) {
        console.error('Error inserting telemetry:', telemetryError);
        return new Response(
          JSON.stringify({ error: 'Failed to store telemetry data', details: telemetryError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get speed limit from speed governor config for this specific vehicle
      const { data: governorConfig } = await supabase
        .from('speed_governor_config')
        .select('max_speed_limit, governor_active')
        .eq('vehicle_id', device.vehicle_id)
        .eq('governor_active', true)
        .single();

      const speedLimit = governorConfig?.max_speed_limit || 80;

      // Check for overspeed and trigger penalty
      if (speedValue > speedLimit) {
        // Get driver_id for the vehicle
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
                  speed_kmh: speedValue,
                  speed_limit_kmh: speedLimit,
                  lat: parseFloat(lat),
                  lng: parseFloat(lng),
                  violation_time: new Date().toISOString(),
                },
              },
            });
            console.log('Overspeed penalty triggered for driver:', vehicleData.assigned_driver_id);
          } catch (penaltyError) {
            console.error('Error triggering overspeed penalty:', penaltyError);
          }
        }
      }

      // Trigger geofence processing
      try {
        await supabase.functions.invoke('process-geofence-events', {
          body: {
            vehicle_id: device.vehicle_id,
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            speed_kmh: speedValue,
            organization_id: device.organization_id,
          },
        });
      } catch (geofenceError) {
        console.error('Error processing geofence events:', geofenceError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'GPS data received successfully',
        device_id: device.id 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing GPS data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
