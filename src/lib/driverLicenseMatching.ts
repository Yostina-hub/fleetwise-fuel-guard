/**
 * driverLicenseMatching
 * ---------------------
 * Maps a vehicle's category / type to the minimum Ethiopian driving-license
 * classes required to operate it, then checks whether a given driver's license
 * satisfies those requirements (and is unexpired + verified).
 *
 * Ethiopian driving-license classes (per FTA guidance) — used as defaults:
 *   Class 1  Motorcycle (≤ 200cc)
 *   Class 2  Automobile / SUV (private, up to ~12 seats)
 *   Class 3  Public transport: minibus / taxi up to ~24 seats
 *   Class 4  Heavy commercial truck (no trailer)
 *   Class 5  Articulated / trailer / heavy bus (>24 seats)
 *
 * The mapping is intentionally permissive: a driver with a higher class can
 * usually drive lower-class vehicles, so we accept "≥ minimum" matches.
 *
 * If the request explicitly lists `required_license_classes`, that takes
 * precedence over the inferred mapping.
 */

export type LicenseClass = "1" | "2" | "3" | "4" | "5";

const CLASS_RANK: Record<LicenseClass, number> = {
  "1": 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
};

/** Normalise free-form license strings ("Class 3", "iii", "C3") to "1".."5". */
export const normaliseLicenseClass = (raw?: string | null): LicenseClass | null => {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  // Roman numerals
  const roman: Record<string, LicenseClass> = { i: "1", ii: "2", iii: "3", iv: "4", v: "5" };
  if (roman[s]) return roman[s];
  // Pull first digit 1-5
  const m = s.match(/[1-5]/);
  if (m) return m[0] as LicenseClass;
  return null;
};

/** Parse a driver's `license_class` field which may contain multiple classes
 *  ("2,3" or "Class 2 / 3"). Returns all normalised classes the driver holds. */
export const parseDriverLicenseClasses = (raw?: string | null): LicenseClass[] => {
  if (!raw) return [];
  const parts = raw.split(/[\s,/|;+&-]+/).filter(Boolean);
  const out = new Set<LicenseClass>();
  parts.forEach((p) => {
    const c = normaliseLicenseClass(p);
    if (c) out.add(c);
  });
  // Single-token fallback
  if (out.size === 0) {
    const c = normaliseLicenseClass(raw);
    if (c) out.add(c);
  }
  return Array.from(out);
};

interface VehicleProfile {
  vehicle_category?: string | null;
  vehicle_type?: string | null;
  seating_capacity?: number | null;
}

/**
 * Infer the minimum license class for a vehicle. We use category/type keywords
 * first; otherwise fall back to seating capacity.
 */
export const inferRequiredLicenseClass = (v: VehicleProfile): LicenseClass => {
  const tokens = `${v.vehicle_category ?? ""} ${v.vehicle_type ?? ""}`.toLowerCase();
  if (/(motor|moto|bike|scooter)/.test(tokens)) return "1";
  if (/(trailer|articulat|semi|tanker|truck-trailer)/.test(tokens)) return "5";
  if (/(heavy|truck|lorry|tipper|dump|cargo)/.test(tokens)) return "4";
  if (/(bus|minibus|coach|van|shuttle|taxi|public)/.test(tokens)) return "3";
  if (/(suv|sedan|pickup|automobile|car|hatch|wagon|jeep|4x4)/.test(tokens)) return "2";
  // Capacity-based fallback
  const seats = v.seating_capacity ?? 0;
  if (seats > 24) return "5";
  if (seats > 12) return "3";
  if (seats > 0) return "2";
  return "2";
};

export interface LicenseEvaluation {
  /** Required class derived for the vehicle. */
  required: LicenseClass;
  /** Driver's parsed classes. */
  held: LicenseClass[];
  /** True if the driver holds at least the required class (or higher). */
  matches: boolean;
  /** True when license_expiry is in the past. */
  expired: boolean;
  /** True when license_expiry is within the next 30 days. */
  expiresSoon: boolean;
  /** True when license_verified is explicitly false (unverified). */
  unverified: boolean;
  /** Short human-readable summary for badges. */
  summary: string;
}

interface DriverProfile {
  license_class?: string | null;
  license_expiry?: string | null;
  license_verified?: boolean | null;
}

const DAY_MS = 86_400_000;

export const evaluateDriverLicense = (
  driver: DriverProfile,
  vehicle: VehicleProfile,
  /** Optional explicit override (e.g. from vehicle_request.required_license_classes). */
  explicitRequired?: LicenseClass | LicenseClass[] | null,
): LicenseEvaluation => {
  const requiredList = (() => {
    if (!explicitRequired) return [inferRequiredLicenseClass(vehicle)];
    return Array.isArray(explicitRequired) ? explicitRequired : [explicitRequired];
  })();
  const required = requiredList[0];
  const held = parseDriverLicenseClasses(driver.license_class);

  // Driver matches if any held class rank ≥ any required class rank.
  const minRequiredRank = Math.min(...requiredList.map((c) => CLASS_RANK[c] ?? 9));
  const maxHeldRank = held.length ? Math.max(...held.map((c) => CLASS_RANK[c] ?? 0)) : 0;
  const matches = held.length > 0 && maxHeldRank >= minRequiredRank;

  let expired = false;
  let expiresSoon = false;
  if (driver.license_expiry) {
    const exp = new Date(driver.license_expiry).getTime();
    if (!Number.isNaN(exp)) {
      const now = Date.now();
      expired = exp < now;
      expiresSoon = !expired && exp - now < 30 * DAY_MS;
    }
  }
  const unverified = driver.license_verified === false;

  let summary: string;
  if (!held.length) summary = "No license on file";
  else if (!matches) summary = `Needs Class ${required} (has ${held.join(",")})`;
  else if (expired) summary = "License expired";
  else if (unverified) summary = "License unverified";
  else if (expiresSoon) summary = "License expires soon";
  else summary = `Class ${held.join(",")} ✓`;

  return { required, held, matches, expired, expiresSoon, unverified, summary };
};
