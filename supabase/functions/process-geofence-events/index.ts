import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VehicleTelemetry {
  vehicle_id: string;
  lat: number;
  lng: number;
  speed_kmh: number;
  organization_id: string;
}

interface Geofence {
  id: string;
  name: string;
  geometry_type: string;
  center_lat: number | null;
  center_lng: number | null;
  radius_meters: number | null;
  polygon_points: Array<{lat: number, lng: number}> | null;
  speed_limit: number | null;
  enable_entry_alarm: boolean;
  enable_exit_alarm: boolean;
  enable_speed_alarm: boolean;
  max_dwell_minutes: number | null;
  schedule_enabled: boolean;
  active_days: number[] | null;
  active_start_time: string | null;
  active_end_time: string | null;
  organization_id: string;
}

interface VehicleGeofenceState {
  vehicle_id: string;
  geofence_id: string;
  entered_at: string;
}

// Haversine distance calculation
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Point in polygon check using ray casting algorithm
function isPointInPolygon(lat: number, lng: number, polygon: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    
    if (((yi > lng) !== (yj > lng)) && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

// Check if current time is within schedule
function isWithinSchedule(geofence: Geofence): boolean {
  if (!geofence.schedule_enabled) return true;
  
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
  
  // Check if current day is in active days
  if (geofence.active_days && !geofence.active_days.includes(currentDay)) {
    return false;
  }
  
  // Check if current time is within active hours
  if (geofence.active_start_time && geofence.active_end_time) {
    if (currentTime < geofence.active_start_time || currentTime > geofence.active_end_time) {
      return false;
    }
  }
  
  return true;
}

// Check if vehicle is inside geofence
function isVehicleInGeofence(telemetry: VehicleTelemetry, geofence: Geofence): boolean {
  if (geofence.geometry_type === 'circle' && geofence.center_lat && geofence.center_lng && geofence.radius_meters) {
    const distance = haversineDistance(telemetry.lat, telemetry.lng, geofence.center_lat, geofence.center_lng);
    return distance <= geofence.radius_meters;
  } else if (geofence.geometry_type === 'polygon' && geofence.polygon_points && geofence.polygon_points.length >= 3) {
    // Convert polygon_points to the format expected by isPointInPolygon
    const coords = geofence.polygon_points.map(p => [p.lat, p.lng]);
    return isPointInPolygon(telemetry.lat, telemetry.lng, coords);
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { vehicle_id, lat, lng, speed_kmh, organization_id } = body as VehicleTelemetry;
    
    console.log(`Processing geofence for vehicle ${vehicle_id}: lat=${lat}, lng=${lng}, speed=${speed_kmh}`);

    if (!vehicle_id || lat === undefined || lng === undefined || !organization_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const telemetry: VehicleTelemetry = { vehicle_id, lat, lng, speed_kmh: speed_kmh || 0, organization_id };

    // Get all active geofences for the organization
    const { data: geofences, error: geofencesError } = await supabase
      .from("geofences")
      .select("*")
      .eq("organization_id", organization_id)
      .eq("is_active", true);

    if (geofencesError) {
      throw geofencesError;
    }

    // Get current vehicle-geofence states (which geofences the vehicle is currently in)
    const { data: currentStates, error: statesError } = await supabase
      .from("vehicle_geofence_states")
      .select("*")
      .eq("vehicle_id", vehicle_id);

    if (statesError && statesError.code !== "PGRST116") {
      // Table might not exist yet, that's okay
      console.log("States table error:", statesError);
    }

    const currentStateMap = new Map<string, VehicleGeofenceState>();
    (currentStates || []).forEach((state: VehicleGeofenceState) => {
      currentStateMap.set(state.geofence_id, state);
    });

    const eventsToCreate: any[] = [];
    const statesToCreate: any[] = [];
    const statesToDelete: string[] = [];

    for (const geofence of geofences as Geofence[]) {
      // Skip if outside schedule
      if (!isWithinSchedule(geofence)) continue;

      const isInside = isVehicleInGeofence(telemetry, geofence);
      const wasInside = currentStateMap.has(geofence.id);

      // Entry event
      if (isInside && !wasInside) {
        console.log(`Vehicle ${vehicle_id} ENTERED geofence ${geofence.name} (alarm enabled: ${geofence.enable_entry_alarm})`);
        if (geofence.enable_entry_alarm) {
          eventsToCreate.push({
            organization_id,
            geofence_id: geofence.id,
            vehicle_id,
            event_type: "enter",
            event_time: new Date().toISOString(),
            lat,
            lng,
          });
          
          // Create entry alert
          const { data: vehicleData } = await supabase
            .from("vehicles")
            .select("assigned_driver_id, plate_number")
            .eq("id", vehicle_id)
            .single();
            
          await supabase.from("alerts").insert({
            organization_id,
            vehicle_id,
            driver_id: vehicleData?.assigned_driver_id || null,
            alert_type: "geofence_enter",
            severity: "info",
            title: `Vehicle entered: ${geofence.name}`,
            message: `Vehicle ${vehicleData?.plate_number || vehicle_id} entered geofence "${geofence.name}"`,
            alert_time: new Date().toISOString(),
            lat,
            lng,
            location_name: geofence.name,
            status: "active",
            alert_data: { geofence_id: geofence.id, geofence_name: geofence.name, entry_speed_kmh: telemetry.speed_kmh },
          });
        }
        statesToCreate.push({
          vehicle_id,
          geofence_id: geofence.id,
          entered_at: new Date().toISOString(),
        });
      }

      // Exit event - trigger penalty and create alert
      if (!isInside && wasInside) {
        console.log(`Vehicle ${vehicle_id} EXITED geofence ${geofence.name} (alarm enabled: ${geofence.enable_exit_alarm})`);
        if (geofence.enable_exit_alarm) {
          const enteredAt = currentStateMap.get(geofence.id)?.entered_at;
          const dwellMinutes = enteredAt
            ? Math.round((Date.now() - new Date(enteredAt).getTime()) / 60000)
            : null;

          eventsToCreate.push({
            organization_id,
            geofence_id: geofence.id,
            vehicle_id,
            event_type: "exit",
            event_time: new Date().toISOString(),
            lat,
            lng,
            dwell_time_minutes: dwellMinutes,
          });

          // Get vehicle and driver info
          const { data: vehicleData } = await supabase
            .from("vehicles")
            .select("assigned_driver_id, plate_number")
            .eq("id", vehicle_id)
            .single();

          // Create an alert for geofence exit
          const alertData = {
            organization_id,
            vehicle_id,
            driver_id: vehicleData?.assigned_driver_id || null,
            alert_type: "geofence_exit",
            severity: "warning",
            title: `Vehicle exited: ${geofence.name}`,
            message: `Vehicle ${vehicleData?.plate_number || vehicle_id} has left the geofence "${geofence.name}". Duration inside: ${dwellMinutes || 0} minutes.`,
            alert_time: new Date().toISOString(),
            lat,
            lng,
            location_name: geofence.name,
            status: "active",
            alert_data: {
              geofence_id: geofence.id,
              geofence_name: geofence.name,
              dwell_minutes: dwellMinutes,
              exit_speed_kmh: telemetry.speed_kmh,
            },
          };

          const { error: alertError } = await supabase
            .from("alerts")
            .insert(alertData);

          if (alertError) {
            console.error("Error creating geofence exit alert:", alertError);
          } else {
            console.log(`Alert created for vehicle ${vehicle_id} exiting geofence ${geofence.name}`);
          }

          // Trigger penalty for geofence exit if driver is assigned
          if (vehicleData?.assigned_driver_id) {
            try {
              await supabase.functions.invoke("process-driver-penalties", {
                body: {
                  action: "process_geofence",
                  data: {
                    organization_id,
                    driver_id: vehicleData.assigned_driver_id,
                    vehicle_id,
                    violation_type: "geofence_exit",
                    geofence_id: geofence.id,
                    geofence_name: geofence.name,
                    lat,
                    lng,
                    violation_time: new Date().toISOString(),
                  },
                },
              });
            } catch (penaltyError) {
              console.error("Error triggering geofence exit penalty:", penaltyError);
            }
          }
        }
        statesToDelete.push(geofence.id);
      }

      // Speed violation event
      if (isInside && geofence.enable_speed_alarm && geofence.speed_limit) {
        if (telemetry.speed_kmh > geofence.speed_limit) {
          eventsToCreate.push({
            organization_id,
            geofence_id: geofence.id,
            vehicle_id,
            event_type: "speed_violation",
            event_time: new Date().toISOString(),
            lat,
            lng,
            speed_kmh: telemetry.speed_kmh,
            speed_limit_kmh: geofence.speed_limit,
          });
          
          // Create speed violation alert
          const { data: vehicleData } = await supabase
            .from("vehicles")
            .select("assigned_driver_id, plate_number")
            .eq("id", vehicle_id)
            .single();
            
          await supabase.from("alerts").insert({
            organization_id,
            vehicle_id,
            driver_id: vehicleData?.assigned_driver_id || null,
            alert_type: "geofence_speed_violation",
            severity: "high",
            title: `Speed violation in ${geofence.name}`,
            message: `Vehicle ${vehicleData?.plate_number || vehicle_id} exceeded speed limit: ${telemetry.speed_kmh} km/h in ${geofence.speed_limit} km/h zone`,
            alert_time: new Date().toISOString(),
            lat,
            lng,
            location_name: geofence.name,
            status: "active",
            alert_data: { 
              geofence_id: geofence.id, 
              geofence_name: geofence.name, 
              speed_kmh: telemetry.speed_kmh, 
              speed_limit_kmh: geofence.speed_limit 
            },
          });
        }
      }

      // Dwell time exceeded event
      if (isInside && geofence.max_dwell_minutes) {
        const state = currentStateMap.get(geofence.id);
        if (state) {
          const dwellMinutes = Math.round((Date.now() - new Date(state.entered_at).getTime()) / 60000);
          if (dwellMinutes >= geofence.max_dwell_minutes) {
            // Check if we already sent a dwell alert recently (within last 5 minutes)
            const { data: recentDwellAlerts } = await supabase
              .from("geofence_events")
              .select("id")
              .eq("vehicle_id", vehicle_id)
              .eq("geofence_id", geofence.id)
              .eq("event_type", "dwell_exceeded")
              .gte("event_time", new Date(Date.now() - 5 * 60000).toISOString())
              .limit(1);

            if (!recentDwellAlerts?.length) {
              eventsToCreate.push({
                organization_id,
                geofence_id: geofence.id,
                vehicle_id,
                event_type: "dwell_exceeded",
                event_time: new Date().toISOString(),
                lat,
                lng,
                dwell_time_minutes: dwellMinutes,
              });
              
              // Create dwell exceeded alert
              const { data: vehicleData } = await supabase
                .from("vehicles")
                .select("assigned_driver_id, plate_number")
                .eq("id", vehicle_id)
                .single();
                
              await supabase.from("alerts").insert({
                organization_id,
                vehicle_id,
                driver_id: vehicleData?.assigned_driver_id || null,
                alert_type: "dwell_exceeded",
                severity: "warning",
                title: `Dwell time exceeded: ${geofence.name}`,
                message: `Vehicle ${vehicleData?.plate_number || vehicle_id} has been in "${geofence.name}" for ${dwellMinutes} minutes (limit: ${geofence.max_dwell_minutes} min)`,
                alert_time: new Date().toISOString(),
                lat,
                lng,
                location_name: geofence.name,
                status: "active",
                alert_data: { 
                  geofence_id: geofence.id, 
                  geofence_name: geofence.name, 
                  dwell_minutes: dwellMinutes, 
                  max_dwell_minutes: geofence.max_dwell_minutes 
                },
              });
            }
          }
        }
      }
    }

    // Insert events
    if (eventsToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from("geofence_events")
        .insert(eventsToCreate);

      if (insertError) {
        console.error("Error inserting events:", insertError);
      }
    }

    // Update states
    if (statesToDelete.length > 0) {
      await supabase
        .from("vehicle_geofence_states")
        .delete()
        .eq("vehicle_id", vehicle_id)
        .in("geofence_id", statesToDelete);
    }

    if (statesToCreate.length > 0) {
      await supabase
        .from("vehicle_geofence_states")
        .upsert(statesToCreate, { onConflict: "vehicle_id,geofence_id" });
    }

    return new Response(
      JSON.stringify({
        success: true,
        events_created: eventsToCreate.length,
        geofences_checked: geofences?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing geofence events:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
