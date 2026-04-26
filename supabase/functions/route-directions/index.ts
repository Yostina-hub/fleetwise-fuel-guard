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

interface Coord {
  0: number; // lng
  1: number; // lat
}

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

  // Every leg must have at least one option, otherwise we can't stitch.
  if (legResults.some((opts) => opts.length === 0)) {
    return { ok: false as const, error: "osrm_leg_failed" };
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
  try {
    const osrm = await tryOsrm(coords as Coord[], wantAlternatives);
    if (osrm.ok) {
      return secureJsonResponse(
        {
          ok: true,
          provider: "osrm",
          geometry: osrm.geometry,
          distance_m: osrm.distance_m,
          duration_s: osrm.duration_s,
          legs: osrm.legs,
          // Real OSRM-computed driving alternatives (different roads, same stops).
          alternatives: osrm.alternatives,
        },
        req,
      );
    }
    console.warn("OSRM routing failed:", osrm);
    return secureJsonResponse(
      { ok: false, provider: "osrm", error: osrm.error, status: osrm.status },
      req,
      502,
    );
  } catch (err) {
    console.error("route-directions upstream error:", err);
    return secureJsonResponse(
      { ok: false, provider: "osrm", error: "upstream_unavailable" },
      req,
      502,
    );
  }
});
