/**
 * Geofence + distance utilities used by vehicle assignment, auto-dispatch
 * and consolidation flows. Pure functions — safe for client and edge runtime
 * (no Supabase dependency).
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface GeofenceLite {
  id: string;
  name: string;
  geometry_type: "circle" | "polygon" | string;
  center_lat?: number | null;
  center_lng?: number | null;
  radius_meters?: number | null;
  polygon_points?: Array<{ lat: number; lng: number }> | null;
  is_active?: boolean | null;
}

const R_KM = 6371;

export const haversineKm = (a: LatLng, b: LatLng): number => {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(sa)));
};

/** Standard ray-casting point-in-polygon. */
export const pointInPolygon = (
  point: LatLng,
  polygon: Array<{ lat: number; lng: number }>,
): boolean => {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;
    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi || 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

export const isInsideGeofence = (
  point: LatLng,
  fence: GeofenceLite,
): boolean => {
  if (!fence || fence.is_active === false) return false;
  if (
    fence.geometry_type === "circle" &&
    fence.center_lat != null &&
    fence.center_lng != null &&
    fence.radius_meters
  ) {
    const km = haversineKm(point, {
      lat: Number(fence.center_lat),
      lng: Number(fence.center_lng),
    });
    return km * 1000 <= fence.radius_meters;
  }
  if (fence.geometry_type === "polygon" && Array.isArray(fence.polygon_points)) {
    return pointInPolygon(point, fence.polygon_points);
  }
  return false;
};

/** Returns the first matching geofence (or null). */
export const findContainingGeofence = (
  point: LatLng,
  fences: GeofenceLite[],
): GeofenceLite | null => {
  for (const f of fences) if (isInsideGeofence(point, f)) return f;
  return null;
};
