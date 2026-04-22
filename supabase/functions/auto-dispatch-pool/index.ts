// Auto-Dispatch Pool
// ==================
// Fully automatic pool dispatcher.
//
// 1. Loads approved vehicle_requests that have not yet been assigned and whose
//    pool supervisor has either signed the contract (pool_review_status =
//    'contract_signed') or left the request in the default queue
//    (pool_review_status NULL / 'pending').
// 2. Groups them by exact route key:
//        pool_name | departure_place | destination | YYYY-MM-DD(needed_from)
//    Multiple requests in the same group become a single consolidated trip
//    sharing one vehicle.
// 3. For each group, picks the CLOSEST available vehicle to the pickup using
//    live GPS from vehicle_telemetry (Haversine). Falls back to any available
//    pool vehicle if pickup coordinates or telemetry are missing.
// 4. Writes the assignment, marks the vehicle in_use, the driver on_trip,
//    and posts in-app notifications to all requesters.
//
// Triggered manually from PoolReviewPanel and on a 15-minute pg_cron schedule.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface DispatchRequest {
  organization_id: string;
  pool_name?: string | null;
  dry_run?: boolean;
}

const haversineKm = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
};

const dayKey = (iso: string) => {
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return "unknown";
  }
};

const norm = (s: string | null | undefined) =>
  (s || "").toLowerCase().trim().replace(/\s+/g, " ");

interface Geofence {
  id: string;
  name: string;
  geometry_type: string;
  center_lat: number | null;
  center_lng: number | null;
  radius_meters: number | null;
  polygon_points: Array<{ lat: number; lng: number }> | null;
}

const pointInPolygon = (
  pt: { lat: number; lng: number },
  poly: Array<{ lat: number; lng: number }>,
): boolean => {
  if (!poly || poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].lng, yi = poly[i].lat;
    const xj = poly[j].lng, yj = poly[j].lat;
    const intersect =
      yi > pt.lat !== yj > pt.lat &&
      pt.lng < ((xj - xi) * (pt.lat - yi)) / (yj - yi || 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

const insideFence = (
  pt: { lat: number; lng: number },
  f: Geofence,
): boolean => {
  if (f.geometry_type === "circle" && f.center_lat != null && f.center_lng != null && f.radius_meters) {
    const km = haversineKm(pt.lat, pt.lng, Number(f.center_lat), Number(f.center_lng));
    return km * 1000 <= f.radius_meters;
  }
  if (f.geometry_type === "polygon" && Array.isArray(f.polygon_points)) {
    return pointInPolygon(pt, f.polygon_points);
  }
  return false;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const body: DispatchRequest = await req.json().catch(() => ({} as any));
    const { organization_id, pool_name, dry_run = false } = body;

    // No org provided → sweep mode: dispatch for every org that has eligible requests.
    if (!organization_id) {
      const { data: orgs, error: oErr } = await supabase
        .from("vehicle_requests")
        .select("organization_id")
        .eq("status", "approved")
        .is("assigned_vehicle_id", null)
        .is("deleted_at", null)
        .limit(2000);
      if (oErr) throw oErr;
      const uniqueOrgs = Array.from(new Set((orgs || []).map((r) => r.organization_id)));
      const sweepResults: any[] = [];
      for (const org of uniqueOrgs) {
        try {
          const r = await fetch(
            `${SUPABASE_URL}/functions/v1/auto-dispatch-pool`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${SERVICE_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ organization_id: org, dry_run }),
            },
          );
          sweepResults.push({ organization_id: org, result: await r.json() });
        } catch (e: any) {
          sweepResults.push({ organization_id: org, error: e?.message });
        }
      }
      return new Response(
        JSON.stringify({ ok: true, mode: "sweep", orgs: uniqueOrgs.length, sweepResults }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 1. Pull eligible requests (approved, not assigned, not deleted, in window).
    let query = supabase
      .from("vehicle_requests")
      .select(
        "id, request_number, requester_id, organization_id, pool_name, departure_place, destination, departure_lat, departure_lng, needed_from, passengers, created_at, status, assigned_vehicle_id, pool_review_status, pool_review_decision",
      )
      .eq("organization_id", organization_id)
      .eq("status", "approved")
      .is("assigned_vehicle_id", null)
      .is("deleted_at", null)
      .in("pool_review_status", [
        "pending",
        "contract_signed",
      ] as any)
      // safety: ignore explicit rejections / change requests
      .neq("pool_review_decision", "rejected")
      .neq("pool_review_decision", "changes_requested");

    if (pool_name) query = query.eq("pool_name", pool_name);

    // Include rows where pool_review_status is NULL too.
    const { data: filtered, error: qErr } = await query;
    if (qErr) throw qErr;

    const { data: nullStatus, error: nErr } = await supabase
      .from("vehicle_requests")
      .select(
        "id, request_number, requester_id, organization_id, pool_name, departure_place, destination, departure_lat, departure_lng, needed_from, passengers, created_at, status, assigned_vehicle_id, pool_review_status, pool_review_decision",
      )
      .eq("organization_id", organization_id)
      .eq("status", "approved")
      .is("assigned_vehicle_id", null)
      .is("deleted_at", null)
      .is("pool_review_status", null);
    if (nErr) throw nErr;

    const allRequests = [
      ...(filtered || []),
      ...(nullStatus || []).filter((r) => !pool_name || r.pool_name === pool_name),
    ];

    if (allRequests.length === 0) {
      return new Response(
        JSON.stringify({
          ok: true,
          groups: 0,
          assigned: 0,
          skipped: 0,
          message: "No eligible requests",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Group by exact route + day + pool.
    const groups = new Map<string, typeof allRequests>();
    for (const r of allRequests) {
      const key = [
        norm(r.pool_name),
        norm(r.departure_place),
        norm(r.destination),
        dayKey(r.needed_from),
      ].join("|");
      const arr = groups.get(key) || [];
      arr.push(r);
      groups.set(key, arr);
    }

    // 3. Pull pool vehicles + telemetry once.
    const { data: vehicles, error: vErr } = await supabase
      .from("vehicles")
      .select(
        "id, plate_number, make, model, status, seating_capacity, assigned_location, specific_pool, assigned_driver_id, organization_id",
      )
      .eq("organization_id", organization_id)
      .eq("status", "active");
    if (vErr) throw vErr;

    // Filter by pool name if requested. We treat specific_pool OR assigned_location as the pool match.
    const poolVehicles = (vehicles || []).filter((v) => {
      if (!pool_name) return true;
      const target = norm(pool_name);
      return norm(v.specific_pool) === target || norm(v.assigned_location) === target;
    });

    if (poolVehicles.length === 0) {
      return new Response(
        JSON.stringify({
          ok: true,
          groups: groups.size,
          assigned: 0,
          skipped: groups.size,
          message: "No active pool vehicles available",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Vehicles already locked by other in-flight requests this org (avoid double-booking).
    const { data: lockedRows } = await supabase
      .from("vehicle_requests")
      .select("assigned_vehicle_id")
      .eq("organization_id", organization_id)
      .in("status", ["assigned", "in_progress", "in_use"])
      .not("assigned_vehicle_id", "is", null);
    const lockedIds = new Set((lockedRows || []).map((r) => r.assigned_vehicle_id));

    // Latest telemetry per vehicle.
    const vehicleIds = poolVehicles.map((v) => v.id);
    const { data: telemetry } = await supabase
      .from("vehicle_telemetry")
      .select("vehicle_id, latitude, longitude, last_communication_at")
      .in("vehicle_id", vehicleIds);
    const teleByVehicle = new Map<
      string,
      { latitude: number | null; longitude: number | null }
    >();
    (telemetry || []).forEach((t) =>
      teleByVehicle.set(t.vehicle_id, {
        latitude: t.latitude,
        longitude: t.longitude,
      }),
    );

    // Active geofences for the org (used to boost vehicles whose live position
    // is inside the same geofence that contains the request's pickup point).
    const { data: fenceRows } = await supabase
      .from("geofences")
      .select(
        "id, name, geometry_type, center_lat, center_lng, radius_meters, polygon_points",
      )
      .eq("organization_id", organization_id)
      .eq("is_active", true);
    const fences: Geofence[] = (fenceRows || []) as any;

    // Track local locks within this run so two groups don't grab the same vehicle.
    const runLocked = new Set<string>(lockedIds);

    let assignedCount = 0;
    let skippedCount = 0;
    const details: any[] = [];

    for (const [key, reqs] of groups.entries()) {
      // Pickup coords: use first request that has them.
      const withCoords = reqs.find(
        (r) => typeof r.departure_lat === "number" && typeof r.departure_lng === "number",
      );
      const pickupLat = withCoords?.departure_lat ?? null;
      const pickupLng = withCoords?.departure_lng ?? null;
      const totalPassengers = reqs.reduce((s, r) => s + (r.passengers || 1), 0);

      // Find the geofence that contains the pickup (if any) — used to boost
      // vehicles whose live position is inside the same fence.
      let pickupFence: Geofence | null = null;
      if (pickupLat != null && pickupLng != null) {
        for (const f of fences) {
          if (insideFence({ lat: pickupLat, lng: pickupLng }, f)) {
            pickupFence = f;
            break;
          }
        }
      }

      // Candidate vehicles: not already locked, fits passenger count if known.
      const candidates = poolVehicles
        .filter((v) => !runLocked.has(v.id))
        .filter((v) =>
          v.seating_capacity == null ? true : v.seating_capacity >= totalPassengers,
        );

      if (candidates.length === 0) {
        skippedCount += reqs.length;
        details.push({ key, reason: "No free vehicle in pool", requests: reqs.length });
        continue;
      }

      // Score: in-pickup-geofence vehicles win, then closest GPS, then no-GPS roster.
      const ranked = candidates
        .map((v) => {
          const t = teleByVehicle.get(v.id);
          let distance = 9999;
          let inGeofence = false;
          if (
            pickupLat != null &&
            pickupLng != null &&
            t?.latitude != null &&
            t?.longitude != null
          ) {
            distance = haversineKm(pickupLat, pickupLng, t.latitude, t.longitude);
            if (pickupFence) {
              inGeofence = insideFence(
                { lat: Number(t.latitude), lng: Number(t.longitude) },
                pickupFence,
              );
            }
          }
          return { v, distance, inGeofence };
        })
        .sort((a, b) => {
          if (a.inGeofence !== b.inGeofence) return a.inGeofence ? -1 : 1;
          return a.distance - b.distance;
        });

      const picked = ranked[0];
      const vehicle = picked.v;

      if (dry_run) {
        details.push({
          key,
          requests: reqs.map((r) => r.request_number),
          chosen_vehicle: vehicle.plate_number,
          distance_km: Math.round(picked.distance * 10) / 10,
          passengers: totalPassengers,
        });
        continue;
      }

      // 4. Write assignment to every request in the group.
      const now = new Date().toISOString();
      const driverId = vehicle.assigned_driver_id || null;
      const updateErrors: string[] = [];

      for (const r of reqs) {
        const mins = Math.round(
          (Date.now() - new Date(r.created_at).getTime()) / 60000,
        );
        const { error } = await supabase
          .from("vehicle_requests")
          .update({
            status: "assigned",
            assigned_vehicle_id: vehicle.id,
            assigned_driver_id: driverId,
            assigned_at: now,
            actual_assignment_minutes: mins,
            pool_review_status: "reviewed",
            pool_reviewed_at: now,
            dispatcher_notes:
              `Auto-dispatched: ${reqs.length} request(s) consolidated; ` +
              `closest vehicle ${vehicle.plate_number} (${
                picked.distance < 9999
                  ? Math.round(picked.distance * 10) / 10 + " km"
                  : "no GPS"
              }).`,
          })
          .eq("id", r.id);
        if (error) updateErrors.push(`${r.request_number}: ${error.message}`);
      }

      if (updateErrors.length === reqs.length) {
        // Nothing landed — don't lock the vehicle.
        skippedCount += reqs.length;
        details.push({ key, errors: updateErrors });
        continue;
      }

      // Lock vehicle + driver.
      runLocked.add(vehicle.id);
      await supabase
        .from("vehicles")
        .update({ status: "in_use", updated_at: now })
        .eq("id", vehicle.id);
      if (driverId) {
        await supabase
          .from("drivers")
          .update({ status: "on_trip", updated_at: now })
          .eq("id", driverId);
      }

      // Notify each requester (best-effort).
      for (const r of reqs) {
        if (!r.requester_id) continue;
        try {
          await supabase.rpc("send_notification", {
            _user_id: r.requester_id,
            _type: "vehicle_assigned",
            _title: "Vehicle Auto-Assigned",
            _message: `Vehicle ${vehicle.plate_number} assigned to request ${r.request_number}${
              reqs.length > 1 ? ` (consolidated trip with ${reqs.length - 1} other request(s))` : ""
            }`,
            _link: "/vehicle-requests",
          });
        } catch (_) { /* non-blocking */ }
      }

      assignedCount += reqs.length - updateErrors.length;
      details.push({
        key,
        consolidated: reqs.length,
        chosen_vehicle: vehicle.plate_number,
        distance_km:
          picked.distance < 9999 ? Math.round(picked.distance * 10) / 10 : null,
        driver_id: driverId,
        errors: updateErrors.length ? updateErrors : undefined,
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        groups: groups.size,
        assigned: assignedCount,
        skipped: skippedCount,
        dry_run,
        details,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("auto-dispatch-pool error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err?.message || String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
