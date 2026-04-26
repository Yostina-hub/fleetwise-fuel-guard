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
  // Public OSRM demo. Reasonable for low traffic; if it ever rate-limits us
  // we can swap in a self-hosted instance without changing the client.
  // `alternatives=2` asks OSRM for up to 2 *real* driving alternatives in
  // addition to the recommended route — these are genuinely different paths
  // through the road network, not synthetic stop reorderings.
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
  try {
    const osrm = await tryOsrm(coords as Coord[]);
    if (osrm.ok) {
      return secureJsonResponse(
        {
          ok: true,
          provider: "osrm",
          geometry: osrm.geometry,
          distance_m: osrm.distance_m,
          duration_s: osrm.duration_s,
          legs: osrm.legs,
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
