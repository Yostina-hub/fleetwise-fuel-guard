// Consolidate Vehicle Requests
// =============================
// Returns merge-preview groups for approved+unassigned vehicle requests using
// FOUR strategies (the supervisor picks which to apply):
//   1. exact_route   — same pool + departure + destination + day
//   2. dest_window   — same destination + ±30 min needed_from
//   3. geofence_pair — pickup geofence + drop geofence + ±30 min
//   4. smart_rules   — configurable rule engine combining:
//        • Capacity utilization (combined load ≤ X% of vehicle capacity)
//        • Geographic proximity (drop-offs within X km)
//        • Time window (needed_from within X minutes)
//        • Compatibility (cargo type / temperature / passengers vs cargo)
//
// This endpoint is read-only — it just returns suggestions.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const norm = (s: string | null | undefined) =>
  (s || "").toLowerCase().trim().replace(/\s+/g, " ");
const dayKey = (iso: string) => {
  try { return new Date(iso).toISOString().slice(0, 10); } catch { return "x"; }
};
const haversineKm = (a: number, b: number, c: number, d: number) => {
  const R = 6371;
  const dLat = ((c - a) * Math.PI) / 180;
  const dLng = ((d - b) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a * Math.PI) / 180) * Math.cos((c * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
};
const pointInPolygon = (
  pt: { lat: number; lng: number },
  poly: Array<{ lat: number; lng: number }>,
) => {
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
const insideFence = (pt: { lat: number; lng: number }, f: any) => {
  if (f.geometry_type === "circle" && f.center_lat != null && f.radius_meters) {
    return haversineKm(pt.lat, pt.lng, Number(f.center_lat), Number(f.center_lng)) * 1000 <= f.radius_meters;
  }
  if (f.geometry_type === "polygon" && Array.isArray(f.polygon_points)) {
    return pointInPolygon(pt, f.polygon_points);
  }
  return false;
};
const findFence = (lat: number | null, lng: number | null, fences: any[]) => {
  if (lat == null || lng == null) return null;
  for (const f of fences) if (insideFence({ lat, lng }, f)) return f;
  return null;
};

// ───────────────────────── Compatibility helpers ─────────────────────────
// We classify a request as "passenger" if it carries pax with no cargo,
// "cargo_dry" / "cargo_cold" otherwise. Mixing passenger ↔ cargo or
// dry ↔ cold is rejected.
const cargoProfile = (r: any): "passenger" | "cargo_dry" | "cargo_cold" => {
  const cargo = norm(r.cargo_load);
  const cold = /(cold|chill|frozen|refriger|temperature)/.test(cargo) ||
    /(cold|chill|refriger)/.test(norm(r.vehicle_type));
  if (cold) return "cargo_cold";
  if (cargo) return "cargo_dry";
  return "passenger";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json().catch(() => ({}));
    const organization_id = body.organization_id;
    if (!organization_id) {
      return new Response(JSON.stringify({ ok: false, error: "organization_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Smart-rule configuration with safe defaults. All four are togglable.
    const rules = {
      capacity: {
        enabled: body.rules?.capacity?.enabled ?? true,
        max_utilization_pct: Number(body.rules?.capacity?.max_utilization_pct ?? 80),
        // Reference vehicle capacity used when none of the requests specify one.
        // (Used to keep grouped passenger count below the threshold.)
        reference_capacity: Number(body.rules?.capacity?.reference_capacity ?? 14),
      },
      proximity: {
        enabled: body.rules?.proximity?.enabled ?? true,
        radius_km: Number(body.rules?.proximity?.radius_km ?? 5),
      },
      time_window: {
        enabled: body.rules?.time_window?.enabled ?? true,
        window_minutes: Number(body.rules?.time_window?.window_minutes ?? 30),
      },
      compatibility: {
        enabled: body.rules?.compatibility?.enabled ?? true,
      },
    };

    const { data: reqs, error } = await supabase
      .from("vehicle_requests")
      .select("id, request_number, pool_name, departure_place, destination, departure_lat, departure_lng, destination_lat, destination_lng, needed_from, needed_until, passengers, cargo_load, vehicle_type, status, assigned_vehicle_id, deleted_at")
      .eq("organization_id", organization_id)
      .eq("status", "approved")
      .is("assigned_vehicle_id", null)
      .is("deleted_at", null)
      .limit(500);
    if (error) throw error;
    const list = reqs || [];

    const { data: fenceRows } = await supabase
      .from("geofences")
      .select("id, name, geometry_type, center_lat, center_lng, radius_meters, polygon_points")
      .eq("organization_id", organization_id)
      .eq("is_active", true);
    const fences = fenceRows || [];

    // 1. exact_route
    const exact = new Map<string, any[]>();
    for (const r of list) {
      const k = [norm(r.pool_name), norm(r.departure_place), norm(r.destination), dayKey(r.needed_from)].join("|");
      const arr = exact.get(k) || []; arr.push(r); exact.set(k, arr);
    }
    const exactGroups = [...exact.entries()]
      .filter(([, v]) => v.length > 1)
      .map(([k, v]) => ({ strategy: "exact_route", key: k, count: v.length, requests: v }));

    // 2. dest_window — same destination AND geographically close (≤1 km when
    //    coords are present). Without the geographic check, any two requests
    //    with the same coarse destination text (e.g. "Addis Ababa") got
    //    bundled together even if their actual drop-off points were many km
    //    apart, producing nonsense merge suggestions.
    const destWindow: any[] = [];
    const usedDest = new Set<string>();
    const DEST_RADIUS_KM = 1;
    const sameDestPlace = (a: any, b: any) => {
      const sameText = norm(a.destination) === norm(b.destination);
      if (a.destination_lat != null && b.destination_lat != null) {
        const km = haversineKm(
          Number(a.destination_lat),
          Number(a.destination_lng),
          Number(b.destination_lat),
          Number(b.destination_lng),
        );
        // Require both same text AND within 1 km when coords exist.
        return sameText && km <= DEST_RADIUS_KM;
      }
      return sameText;
    };
    for (let i = 0; i < list.length; i++) {
      if (usedDest.has(list[i].id)) continue;
      const a = list[i];
      const grp = [a];
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (usedDest.has(b.id)) continue;
        if (!sameDestPlace(a, b)) continue;
        const da = new Date(a.needed_from).getTime();
        const db = new Date(b.needed_from).getTime();
        if (Math.abs(da - db) <= 30 * 60_000) grp.push(b);
      }
      if (grp.length > 1) {
        grp.forEach((g) => usedDest.add(g.id));
        destWindow.push({ strategy: "dest_window", key: `dest:${norm(a.destination)}`, count: grp.length, requests: grp });
      }
    }

    // 3. geofence_pair
    const geoPair: any[] = [];
    const usedGeo = new Set<string>();
    const fenceFor = (r: any) => ({
      pickup: findFence(r.departure_lat, r.departure_lng, fences),
      drop: findFence(r.destination_lat, r.destination_lng, fences),
    });
    for (let i = 0; i < list.length; i++) {
      if (usedGeo.has(list[i].id)) continue;
      const a = list[i];
      const fa = fenceFor(a);
      if (!fa.pickup || !fa.drop) continue;
      const grp = [a];
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (usedGeo.has(b.id)) continue;
        const fb = fenceFor(b);
        if (fb.pickup?.id !== fa.pickup.id || fb.drop?.id !== fa.drop.id) continue;
        const da = new Date(a.needed_from).getTime();
        const db = new Date(b.needed_from).getTime();
        if (Math.abs(da - db) <= 30 * 60_000) grp.push(b);
      }
      if (grp.length > 1) {
        grp.forEach((g) => usedGeo.add(g.id));
        geoPair.push({
          strategy: "geofence_pair",
          key: `geo:${fa.pickup.id}->${fa.drop.id}`,
          count: grp.length,
          pickup_geofence: fa.pickup.name,
          drop_geofence: fa.drop.name,
          requests: grp,
        });
      }
    }

    // 4. smart_rules — configurable, all four rules combined
    const smartGroups: any[] = [];
    const usedSmart = new Set<string>();
    for (let i = 0; i < list.length; i++) {
      if (usedSmart.has(list[i].id)) continue;
      const a = list[i];
      const profA = cargoProfile(a);
      let combinedPassengers = Number(a.passengers || 0);
      const grp = [a];
      const reasons: string[] = [];

      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (usedSmart.has(b.id)) continue;

        // Compatibility rule — never mix incompatible cargo profiles
        if (rules.compatibility.enabled) {
          const profB = cargoProfile(b);
          if (profA !== profB) continue;
        }

        // Time window rule
        if (rules.time_window.enabled) {
          const da = new Date(a.needed_from).getTime();
          const db = new Date(b.needed_from).getTime();
          if (Math.abs(da - db) > rules.time_window.window_minutes * 60_000) continue;
        }

        // Proximity rule (drop-off radius)
        if (rules.proximity.enabled) {
          if (a.destination_lat != null && b.destination_lat != null) {
            const km = haversineKm(
              Number(a.destination_lat),
              Number(a.destination_lng),
              Number(b.destination_lat),
              Number(b.destination_lng),
            );
            if (km > rules.proximity.radius_km) continue;
          } else if (norm(a.destination) !== norm(b.destination)) {
            // No GPS to check radius and destinations differ — skip
            continue;
          }
        }

        // Capacity utilization rule (passenger trips only)
        if (rules.capacity.enabled && profA === "passenger") {
          const next = combinedPassengers + Number(b.passengers || 0);
          const utilization = (next / rules.capacity.reference_capacity) * 100;
          if (utilization > rules.capacity.max_utilization_pct) continue;
          combinedPassengers = next;
        }

        grp.push(b);
      }

      if (grp.length > 1) {
        grp.forEach((g) => usedSmart.add(g.id));
        const utilization = profA === "passenger"
          ? Math.round((combinedPassengers / rules.capacity.reference_capacity) * 100)
          : null;
        if (rules.capacity.enabled) reasons.push(`Capacity ≤ ${rules.capacity.max_utilization_pct}%`);
        if (rules.proximity.enabled) reasons.push(`Within ${rules.proximity.radius_km} km`);
        if (rules.time_window.enabled) reasons.push(`±${rules.time_window.window_minutes} min`);
        if (rules.compatibility.enabled) reasons.push(`Same cargo type (${profA})`);

        smartGroups.push({
          strategy: "smart_rules",
          key: `smart:${a.id}`,
          count: grp.length,
          requests: grp,
          combined_passengers: combinedPassengers,
          utilization_pct: utilization,
          cargo_profile: profA,
          reasons,
        });
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        total_requests: list.length,
        rules,
        groups: {
          exact_route: exactGroups,
          dest_window: destWindow,
          geofence_pair: geoPair,
          smart_rules: smartGroups,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("consolidate-requests error:", err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
