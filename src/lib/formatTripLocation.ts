/**
 * formatTripLocation
 * ------------------
 * `trips.start_location` and `trips.end_location` are JSONB columns and may
 * arrive as `{ name, lat, lng, ... }`, `{ lat, lng }`, a plain string, or
 * `null`. Rendering an object directly inside JSX throws
 * "Objects are not valid as a React child", so every UI that surfaces a trip
 * location MUST run it through this helper.
 */
export type TripLocationLike =
  | string
  | { name?: string | null; address?: string | null; lat?: number | null; lng?: number | null }
  | null
  | undefined;

export function formatTripLocation(loc: TripLocationLike, fallback = "—"): string {
  if (loc == null) return fallback;
  if (typeof loc === "string") return loc.trim() || fallback;
  if (typeof loc === "object") {
    const o = loc as Record<string, unknown>;
    const name = typeof o.name === "string" ? o.name.trim() : "";
    if (name) return name;
    const address = typeof o.address === "string" ? o.address.trim() : "";
    if (address) return address;
    const lat = typeof o.lat === "number" ? o.lat : Number(o.lat);
    const lng = typeof o.lng === "number" ? o.lng : Number(o.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
    }
  }
  return fallback;
}
