/**
 * route-directions
 * ----------------
 * Server-side proxy that returns a real driving route (geometry + distance +
 * duration) between an ordered list of [lng, lat] coordinates.
 *
 * Why this exists: the public OSRM demo server is not reachable from browser
 * sandboxes (CORS / mixed content / firewalled). Calling it from a Deno edge
 * function bypasses those restrictions and lets us draw the actual road path
 * on the trip preview map.
 *
 * Request:
 *   POST { coordinates: [[lng, lat], [lng, lat], ...] }
 * Response:
 *   { ok: true, geometry: [[lng, lat], ...], distance_m, duration_s, provider }
 *   { ok: false, error, provider, status? }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  buildCorsHeaders,
  handleCorsPreflightRequest,
  secureJsonResponse,
} from "../_shared/cors.ts";

const UPSTREAM_TIMEOUT_MS = 9000;

type Coord = [number, number]; // [lng, lat]

// ---------------------------------------------------------------------------
// Real-world traffic adjustment
// ---------------------------------------------------------------------------
// OSRM's public demo server returns *free-flow* travel times based on
// theoretical road speed limits — it has no concept of traffic, traffic
// lights, lane-changes, urban congestion, or per-stop dwell time. For a
// dispatcher in Addis Ababa (or any congested city) this produces ETAs that
// are 2-3x too optimistic and consistently surprise drivers in practice.
//
// We apply a calibrated multi-factor adjustment so the numbers shown to ops
// match real driving experience:
//
//   1. URBAN_CONGESTION_FACTOR    — multiplies OSRM duration to reflect
//                                    typical mixed urban traffic (signals,
//                                    pedestrians, slow lanes, mini-buses).
//   2. SHORT_TRIP_OVERHEAD_S      — fixed per-trip overhead for parking,
//                                    pickup waiting, door-to-door walk.
//   3. STOP_DWELL_S               — added per intermediate stop (consolidated
//                                    multi-pickup/drop trips) to cover
//                                    boarding / alighting time.
//
// Tuned empirically against driver-reported actuals in Addis Ababa fleets.
// Adjust here in one place to recalibrate the whole app.
const URBAN_CONGESTION_FACTOR = 1.9; // OSRM free-flow → realistic urban
const SHORT_TRIP_OVERHEAD_S = 180;   // 3 min fixed (parking + boarding)
const STOP_DWELL_S = 90;             // 1.5 min per intermediate stop

const realisticDuration = (osrmDurationS: number, stopCount: number): number => {
  const intermediateStops = Math.max(0, stopCount - 2);
  return Math.round(
    osrmDurationS * URBAN_CONGESTION_FACTOR
      + SHORT_TRIP_OVERHEAD_S
      + intermediateStops * STOP_DWELL_S,
  );
};

const isValidCoord = (c: unknown): c is Coord =>
  Array.isArray(c) &&
  c.length === 2 &&
  typeof c[0] === "number" &&
  typeof c[1] === "number" &&
  Number.isFinite(c[0]) &&
  Number.isFinite(c[1]) &&
  c[0] >= -180 && c[0] <= 180 &&
  c[1] >= -90 && c[1] <= 90;

const tryOsrm = async (coords: Coord[], wantAlternatives: boolean) => {
  const path = coords.map((c) => `${c[0]},${c[1]}`).join(";");
  // `alternatives=2` asks OSRM for up to 2 driving alternatives in addition to
  // the recommended route. For multi-stop tours OSRM frequently returns 0
  // alternatives — see `tryOsrmStitched` for the per-leg fallback.
  const altParam = wantAlternatives ? "&alternatives=2" : "";
  const url = `https://router.project-osrm.org/route/v1/driving/${path}?overview=full&geometries=geojson${altParam}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "fleetwise-route-preview/1.0" },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!res.ok) {
    return { ok: false as const, status: res.status, error: `osrm_http_${res.status}` };
  }
  const json = await res.json();
  const routes = Array.isArray(json?.routes) ? json.routes : [];
  if (routes.length === 0) {
    return { ok: false as const, error: "osrm_no_geometry" };
  }
  const mapped = routes
    .map((route: any) => {
      const geometry = route?.geometry?.coordinates as [number, number][] | undefined;
      if (!geometry || geometry.length < 2) return null;
      const legs = Array.isArray(route?.legs)
        ? route.legs.map((leg: any) => ({
            distance_m: Number(leg?.distance) || 0,
            duration_s: Number(leg?.duration) || 0,
          }))
        : [];
      return {
        geometry,
        distance_m: Number(route.distance) || 0,
        duration_s: Number(route.duration) || 0,
        legs,
      };
    })
    .filter((r: any) => r !== null);
  if (mapped.length === 0) {
    return { ok: false as const, error: "osrm_no_geometry" };
  }
  const primary = mapped[0];
  return {
    ok: true as const,
    geometry: primary.geometry,
    distance_m: primary.distance_m,
    duration_s: primary.duration_s,
    legs: primary.legs,
    alternatives: mapped,
  };
};

/**
 * Fetch OSRM `alternatives=2` for EACH consecutive pair of waypoints, then
 * stitch full-trip variants by swapping in the alternative path of the legs
 * that have the most room to differ. This is what gives the dispatcher 2-3
 * genuinely different end-to-end options even when OSRM declines to return
 * alternatives for the whole multi-stop tour (which happens often).
 *
 * Returns up to 3 full-trip variants:
 *   - variant 0: every leg uses its primary OSRM route (the recommended path)
 *   - variant 1: the *longest* leg uses its alternative path
 *   - variant 2: the *second-longest* leg uses its alternative path
 */
const tryOsrmStitched = async (coords: Coord[]) => {
  type LegOption = { geometry: [number, number][]; distance_m: number; duration_s: number };
  const legPairs: Array<[Coord, Coord]> = [];
  for (let i = 0; i < coords.length - 1; i += 1) {
    legPairs.push([coords[i], coords[i + 1]]);
  }

  const legResults: LegOption[][] = await Promise.all(
    legPairs.map(async ([a, b]) => {
      const url = `https://router.project-osrm.org/route/v1/driving/${a[0]},${a[1]};${b[0]},${b[1]}?overview=full&geometries=geojson&alternatives=2`;
      const res = await fetch(url, {
        headers: { "User-Agent": "fleetwise-route-preview/1.0" },
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
      if (!res.ok) return [];
      const j = await res.json().catch(() => null);
      const routes = Array.isArray(j?.routes) ? j.routes : [];
      return routes
        .map((r: any) => {
          const geometry = r?.geometry?.coordinates as [number, number][] | undefined;
          if (!geometry || geometry.length < 2) return null;
          return {
            geometry,
            distance_m: Number(r.distance) || 0,
            duration_s: Number(r.duration) || 0,
          } as LegOption;
        })
        .filter((x: LegOption | null): x is LegOption => x !== null);
    }),
  );

  // If a leg fails, fall back to a straight-line segment for that leg so the
  // overall response still works. This keeps a single flaky upstream from
  // wiping out the whole route preview.
  legResults.forEach((opts, i) => {
    if (opts.length === 0) {
      const a = legPairs[i][0];
      const b = legPairs[i][1];
      // Rough metric distance via equirectangular projection (good enough for
      // a fallback segment on a single failed leg).
      const R = 6371000;
      const lat1 = (a[1] * Math.PI) / 180;
      const lat2 = (b[1] * Math.PI) / 180;
      const x = ((b[0] - a[0]) * Math.PI) / 180 * Math.cos((lat1 + lat2) / 2);
      const y = ((b[1] - a[1]) * Math.PI) / 180;
      const d = Math.sqrt(x * x + y * y) * R;
      legResults[i] = [{
        geometry: [a, b],
        distance_m: d,
        duration_s: d / 11.1, // ~40 km/h average urban
      }];
    }
  });

  if (legResults.every((opts) => opts.length === 0)) {
    return { ok: false as const, error: "osrm_all_legs_failed" };
  }

  const stitch = (selection: number[]): LegOption => {
    const geom: [number, number][] = [];
    let dist = 0;
    let dur = 0;
    legResults.forEach((opts, i) => {
      const opt = opts[Math.min(selection[i], opts.length - 1)];
      // Avoid duplicating the shared waypoint between legs
      const seg = i === 0 ? opt.geometry : opt.geometry.slice(1);
      geom.push(...seg);
      dist += opt.distance_m;
      dur += opt.duration_s;
    });
    return { geometry: geom, distance_m: dist, duration_s: dur };
  };

  // Variant 0 — primary on every leg.
  const variants: LegOption[] = [stitch(legResults.map(() => 0))];

  // Rank legs by primary duration to pick which leg to vary.
  const legOrder = legResults
    .map((opts, i) => ({ i, dur: opts[0]?.duration_s ?? 0 }))
    .sort((a, b) => b.dur - a.dur)
    .map((x) => x.i);

  for (const legIdx of legOrder) {
    if (variants.length >= 3) break;
    if (legResults[legIdx].length < 2) continue;
    const sel = legResults.map(() => 0);
    sel[legIdx] = 1;
    variants.push(stitch(sel));
  }

  // De-duplicate by geometry length + total distance (cheap fingerprint).
  const seen = new Set<string>();
  const unique = variants.filter((v) => {
    const key = `${v.geometry.length}|${Math.round(v.distance_m)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const primary = unique[0];
  return {
    ok: true as const,
    geometry: primary.geometry,
    distance_m: primary.distance_m,
    duration_s: primary.duration_s,
    legs: legResults.map((opts) => ({
      distance_m: opts[0].distance_m,
      duration_s: opts[0].duration_s,
    })),
    alternatives: unique,
  };
};

const tryOsrmViaAlternatives = async (coords: Coord[]) => {
  if (coords.length !== 2) return null;
  const [start, end] = coords;
  const midLng = (start[0] + end[0]) / 2;
  const midLat = (start[1] + end[1]) / 2;
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const len = Math.sqrt(dx * dx + dy * dy) || 0.01;
  const scale = Math.max(0.006, Math.min(0.025, len * 0.45));
  const candidates = [
    [midLng - (dy / len) * scale, midLat + (dx / len) * scale],
    [midLng + (dy / len) * scale, midLat - (dx / len) * scale],
    [midLng, midLat + scale],
    [midLng + scale, midLat],
  ].filter(isValidCoord);

  const variants = await Promise.all(
    candidates.map(async (via) => {
      const routed = await tryOsrm([start, via, end], false);
      if (!routed.ok) return null;
      return {
        geometry: routed.geometry,
        distance_m: routed.distance_m,
        duration_s: routed.duration_s,
        legs: routed.legs,
      };
    }),
  );

  const unique = variants
    .filter((route): route is NonNullable<typeof route> => route !== null)
    .filter((route, idx, arr) => {
      const key = `${Math.round(route.distance_m / 25)}:${Math.round(route.duration_s / 10)}:${route.geometry.length}`;
      return arr.findIndex((other) => `${Math.round(other.distance_m / 25)}:${Math.round(other.duration_s / 10)}:${other.geometry.length}` === key) === idx;
    })
    .slice(0, 2);

  return unique.length > 0 ? unique : null;
};

/**
 * Optimize the visit order of N waypoints using OSRM's Trip service. The
 * first coordinate is fixed as the source; the destination is left flexible
 * so the optimizer can pick the natural finishing point. Returns the optimal
 * coordinate order plus the routed geometry.
 *
 * This is what the Consolidate workspace uses to get the *actual* optimal
 * road route through every merged pickup/drop instead of a naive nearest-
 * neighbor heuristic, which often produced badly-shaped, longer routes.
 */
const tryOsrmTrip = async (coords: Coord[]) => {
  if (coords.length < 2) return { ok: false as const, error: "trip_needs_2_points" };
  const path = coords.map((c) => `${c[0]},${c[1]}`).join(";");
  // source=first keeps the merged trip starting at the planned origin.
  // roundtrip=false lets OSRM end at whichever waypoint minimises driving time.
  const url = `https://router.project-osrm.org/trip/v1/driving/${path}?source=first&roundtrip=false&overview=full&geometries=geojson`;
  const res = await fetch(url, {
    headers: { "User-Agent": "fleetwise-route-preview/1.0" },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!res.ok) return { ok: false as const, status: res.status, error: `osrm_trip_http_${res.status}` };
  const json = await res.json();
  const trip = Array.isArray(json?.trips) ? json.trips[0] : null;
  const wps = Array.isArray(json?.waypoints) ? json.waypoints : [];
  const geometry = trip?.geometry?.coordinates as [number, number][] | undefined;
  if (!trip || !geometry || geometry.length < 2 || wps.length === 0) {
    return { ok: false as const, error: "osrm_trip_no_geometry" };
  }
  // OSRM returns each input waypoint with its `waypoint_index` (its slot in
  // the optimised tour). Sort the input coords by that index to recover the
  // optimal visit order.
  const ordered = wps
    .map((w: any, i: number) => ({ idx: Number(w.waypoint_index ?? i), input: i }))
    .sort((a: any, b: any) => a.idx - b.idx)
    .map((w: any) => w.input);
  return {
    ok: true as const,
    geometry,
    distance_m: Number(trip.distance) || 0,
    duration_s: Number(trip.duration) || 0,
    order: ordered, // indices into the original `coordinates` array
  };
};

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return secureJsonResponse({ ok: false, error: "method_not_allowed" }, req, 405);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return secureJsonResponse({ ok: false, error: "invalid_json" }, req, 400);
  }

  const coords = body?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2 || coords.length > 25) {
    return secureJsonResponse(
      { ok: false, error: "coordinates must be an array of 2-25 [lng,lat] pairs" },
      req,
      400,
    );
  }
  if (!coords.every(isValidCoord)) {
    return secureJsonResponse({ ok: false, error: "invalid coordinate value" }, req, 400);
  }

  // Try OSRM (no key required, drives the actual road network)
  const wantAlternatives = body?.alternatives === true;
  const wantOptimize = body?.optimize === true;

  // Apply the urban-traffic adjustment to every duration_s field in a route
  // response shape (top-level, alternatives[], legs[]) and add a
  // raw_duration_s field so callers that need OSRM's free-flow value still
  // have it. This is the LAST step before sending so internal routing logic
  // keeps working with raw OSRM numbers.
  const adjustResponse = <T extends Record<string, any>>(payload: T): T => {
    const stopCount = (coords as Coord[]).length;
    const adjustOne = (obj: any) => {
      if (!obj || typeof obj.duration_s !== "number") return obj;
      const raw = obj.duration_s;
      const segStops = Array.isArray(obj.legs) && obj.legs.length > 0
        ? obj.legs.length + 1
        : stopCount;
      return {
        ...obj,
        raw_duration_s: raw,
        duration_s: realisticDuration(raw, segStops),
      };
    };
    const out: any = adjustOne(payload);
    if (Array.isArray(out.alternatives)) {
      out.alternatives = out.alternatives.map((a: any) => {
        const adjusted = adjustOne(a);
        if (Array.isArray(adjusted.legs)) {
          adjusted.legs = adjusted.legs.map((l: any) =>
            l && typeof l.duration_s === "number"
              ? { ...l, raw_duration_s: l.duration_s, duration_s: realisticDuration(l.duration_s, 2) }
              : l,
          );
        }
        return adjusted;
      });
    }
    if (Array.isArray(out.legs)) {
      out.legs = out.legs.map((l: any) =>
        l && typeof l.duration_s === "number"
          ? { ...l, raw_duration_s: l.duration_s, duration_s: realisticDuration(l.duration_s, 2) }
          : l,
      );
    }
    out.traffic_model = {
      congestion_factor: URBAN_CONGESTION_FACTOR,
      overhead_s: SHORT_TRIP_OVERHEAD_S,
      stop_dwell_s: STOP_DWELL_S,
    };
    return out as T;
  };

  // Optimised multi-stop tour (OSRM /trip). Used by the Consolidate workspace
  // so the merged trip follows the actual shortest road tour through every
  // selected pickup/drop instead of the input order.
  if (wantOptimize) {
    try {
      const trip = await tryOsrmTrip(coords as Coord[]);
      if (trip.ok) {
        return secureJsonResponse(
          adjustResponse({
            ok: true,
            provider: "osrm-trip",
            geometry: trip.geometry,
            distance_m: trip.distance_m,
            duration_s: trip.duration_s,
            order: trip.order,
          }),
          req,
        );
      }
      // Trip API failed — fall through to ordinary route below using the
      // caller-supplied order so the dispatcher still sees a usable line.
      console.warn("OSRM trip optimisation failed, falling back to ordered route:", trip);
    } catch (err) {
      console.warn("OSRM trip optimisation threw, falling back:", err);
    }
  }

  // Helper that wraps tryOsrmStitched and shapes the response so the caller
  // gets the same fields as the full-path tryOsrm response.
  const respondWithStitched = async () => {
    const stitched = await tryOsrmStitched(coords as Coord[]);
    if (!stitched.ok) return null;
    return {
      ok: true as const,
      provider: "osrm-stitched",
      geometry: stitched.geometry,
      distance_m: stitched.distance_m,
      duration_s: stitched.duration_s,
      legs: stitched.legs,
      alternatives: stitched.alternatives,
    };
  };

  // (adjustResponse is defined earlier in the handler — applied to every
  // success response so dispatchers see realistic urban-traffic ETAs.)


  try {
    const osrm = await tryOsrm(coords as Coord[], wantAlternatives);
    if (osrm.ok) {
      // For multi-stop tours OSRM rarely returns more than 1 alternative for
      // the whole path. If we asked for alternatives but only got the primary
      // back, fall back to the per-leg stitched approach to give the
      // dispatcher 2-3 genuinely different end-to-end variants.
      let alternatives = osrm.alternatives;
      if (
        wantAlternatives &&
        Array.isArray(alternatives) &&
        alternatives.length < 2 &&
        coords.length >= 3
      ) {
        const stitched = await tryOsrmStitched(coords as Coord[]);
        if (stitched.ok && stitched.alternatives.length >= 1) {
          alternatives = stitched.alternatives;
        }
      }
      if (
        wantAlternatives &&
        Array.isArray(alternatives) &&
        alternatives.length < 2 &&
        coords.length === 2
      ) {
        const viaAlternatives = await tryOsrmViaAlternatives(coords as Coord[]);
        if (viaAlternatives?.length) {
          alternatives = [osrm.alternatives?.[0] ?? {
            geometry: osrm.geometry,
            distance_m: osrm.distance_m,
            duration_s: osrm.duration_s,
            legs: osrm.legs,
          }, ...viaAlternatives].slice(0, 3);
        }
      }
      return secureJsonResponse(
        adjustResponse({
          ok: true,
          provider: "osrm",
          geometry: osrm.geometry,
          distance_m: osrm.distance_m,
          duration_s: osrm.duration_s,
          legs: osrm.legs,
          // Real OSRM-computed driving alternatives (different roads, same stops).
          alternatives,
        }),
        req,
      );
    }

    // Full-path OSRM failed. Recovery path: try per-leg stitching, which
    // splits the tour into individual hops. Each hop is a much smaller request
    // and far less likely to all fail together (most "non-2xx" errors users
    // saw came from the public OSRM demo throttling on the full multi-stop
    // request, while individual legs went through fine).
    console.warn("OSRM full-path failed, attempting stitched recovery:", osrm);
    const recovered = await respondWithStitched();
    if (recovered) {
      return secureJsonResponse(recovered, req);
    }
    return secureJsonResponse(
      { ok: false, provider: "osrm", error: osrm.error, status: osrm.status },
      req,
      502,
    );
  } catch (err) {
    console.error("route-directions upstream error:", err);
    // Network exception (timeout, DNS, etc.). Try stitched as a last resort
    // because per-leg requests are independent and have separate timeouts.
    try {
      const recovered = await respondWithStitched();
      if (recovered) {
        return secureJsonResponse(recovered, req);
      }
    } catch (innerErr) {
      console.error("stitched recovery also failed:", innerErr);
    }
    return secureJsonResponse(
      { ok: false, provider: "osrm", error: "upstream_unavailable" },
      req,
      502,
    );
  }
});
