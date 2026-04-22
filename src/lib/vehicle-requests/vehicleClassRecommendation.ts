/**
 * Vehicle-class recommendation engine
 * ====================================
 * Implements the "demand-shaping" pattern used by mature fleet operations
 * (Geotab, Samsara, ARI). The user describes their NEED (passengers + cargo
 * + terrain); the system recommends the smallest sufficient vehicle class.
 * Picking a larger class requires a typed justification (audit trail).
 *
 * Why this exists: resources are inversely related to demand, so the most
 * effective intervention is to remove the user's incentive to over-spec by:
 *   1. Defaulting to the smallest sufficient class.
 *   2. Surfacing a "cost band" so users see scarcity before requesting.
 *   3. Forcing a written justification for upgrades (visible to approvers).
 */

export type CargoLoad = "none" | "small" | "medium" | "large";

export type CostBand = "economy" | "standard" | "premium" | "specialised";

/**
 * Capability profile per vehicle type. `value` matches VEHICLE_TYPES_OPTIONS
 * in src/components/fleet/formConstants.ts so the recommendation can be
 * applied directly to the existing `vehicle_type` field.
 */
export interface VehicleClassProfile {
  value: string;
  label: string;
  capacity: number;        // total seats (driver + passengers)
  cargo: CargoLoad;        // max cargo size it can carry
  costBand: CostBand;      // operating-cost tier (used for sort + UX)
  /** Smaller index = preferred (cheaper / smaller). Used for tie-breaking. */
  rank: number;
}

/**
 * The catalogue is intentionally curated (not auto-generated from
 * VEHICLE_TYPES_OPTIONS) so each row encodes operational policy. Heavy
 * trucks / specialised gear are NOT recommendable from the staff form —
 * those go through dispatcher assignment.
 */
export const VEHICLE_CLASS_CATALOG: VehicleClassProfile[] = [
  // Economy — smallest, cheapest, recommended first
  { value: "motorbike",           label: "Motorbike",        capacity: 2,  cargo: "none",   costBand: "economy",     rank: 0 },
  { value: "scooter",             label: "Scooter",          capacity: 2,  cargo: "none",   costBand: "economy",     rank: 1 },
  { value: "sedan",               label: "Sedan",            capacity: 5,  cargo: "small",  costBand: "economy",     rank: 2 },

  // Standard
  { value: "single_cab",          label: "Single Cab",       capacity: 3,  cargo: "medium", costBand: "standard",    rank: 3 },
  { value: "double_cab",          label: "Double Cab",       capacity: 5,  cargo: "medium", costBand: "standard",    rank: 4 },
  { value: "pannel_van",          label: "Panel Van",        capacity: 3,  cargo: "large",  costBand: "standard",    rank: 5 },
  { value: "mini_van",            label: "Mini-Van",         capacity: 8,  cargo: "small",  costBand: "standard",    rank: 6 },

  // Premium (larger group transport, higher cost)
  { value: "mini_bus",            label: "Mini-Bus",         capacity: 14, cargo: "small",  costBand: "premium",     rank: 7 },
  { value: "midi_van_truck",      label: "Midi Van-Truck",   capacity: 6,  cargo: "large",  costBand: "premium",     rank: 8 },
  { value: "midi_bus",            label: "Midi-Bus",         capacity: 25, cargo: "small",  costBand: "premium",     rank: 9 },
  { value: "suv",                 label: "SUV",              capacity: 7,  cargo: "small",  costBand: "premium",     rank: 10 },

  // Specialised — cargo trucks. Not selectable for personnel transport.
  { value: "light_cargo_truck",   label: "Light Cargo Truck", capacity: 3,  cargo: "large", costBand: "specialised", rank: 11 },
  { value: "medium_cargo_truck",  label: "Medium Cargo Truck",capacity: 3,  cargo: "large", costBand: "specialised", rank: 12 },
  { value: "heavy_cargo_truck",   label: "Heavy Cargo Truck", capacity: 3,  cargo: "large", costBand: "specialised", rank: 13 },
  { value: "dump_truck",          label: "Dump Truck",        capacity: 3,  cargo: "large", costBand: "specialised", rank: 14 },
  { value: "heavy_cargo_crane",   label: "Heavy Cargo Crane", capacity: 3,  cargo: "large", costBand: "specialised", rank: 15 },

  // Other
  { value: "bicycle",             label: "Bicycle",          capacity: 1,  cargo: "none",   costBand: "economy",     rank: 16 },
];

/** Cargo size ordering — used to test "X covers Y" in the recommendation. */
const CARGO_ORDER: Record<CargoLoad, number> = { none: 0, small: 1, medium: 2, large: 3 };

/** Lookup helper. Returns null if the type isn't in the catalogue. */
export function getVehicleClassProfile(value: string | null | undefined): VehicleClassProfile | null {
  if (!value) return null;
  return VEHICLE_CLASS_CATALOG.find((v) => v.value === value) ?? null;
}

/**
 * Vehicle types that DO carry passengers as their primary purpose. Anything
 * not in this set is a cargo/courier vehicle — the requester's "passenger
 * count" doesn't apply (we store -1 to mean N/A in submissions).
 *
 * Driver always rides; "passengers" means *additional* people beyond the
 * driver, so trucks, vans, motorbikes, scooters, bicycles → N/A.
 */
const PASSENGER_VEHICLE_VALUES = new Set<string>([
  "sedan",
  "double_cab",
  "mini_van",
  "mini_bus",
  "midi_bus",
  "suv",
]);

/** True when this vehicle class is intended to carry passengers (other than the driver). */
export function isPassengerVehicleType(value: string | null | undefined): boolean {
  if (!value) return false;
  return PASSENGER_VEHICLE_VALUES.has(value);
}

/** Sentinel value stored in `vehicle_requests.passengers` for non-passenger vehicles. */
export const NON_PASSENGER_SENTINEL = -1;

/**
 * Returns the smallest / cheapest vehicle class that satisfies the demand.
 * Falls back to the largest matching capacity row if no row in the
 * catalogue can carry the requested passenger count (caller should treat
 * this as "needs dispatcher assignment").
 */
export function recommendVehicleClass(input: {
  passengers: number;
  cargo: CargoLoad;
}): VehicleClassProfile | null {
  const passengers = Math.max(1, input.passengers || 1);
  const cargoNeeded = CARGO_ORDER[input.cargo] ?? 0;

  // Only personnel-transport rows are recommendable. Cargo trucks and
  // specialised gear are reserved for dispatcher routing.
  const eligible = VEHICLE_CLASS_CATALOG
    .filter((v) => v.costBand !== "specialised")
    .filter((v) => v.capacity >= passengers)
    .filter((v) => CARGO_ORDER[v.cargo] >= cargoNeeded)
    .sort((a, b) => a.rank - b.rank);

  return eligible[0] ?? null;
}

/**
 * Returns true when the user's chosen vehicle is strictly larger / more
 * expensive than the recommendation. Used to gate the justification field.
 */
export function isUpgradeOverRecommendation(
  chosen: string | null | undefined,
  recommended: string | null | undefined
): boolean {
  if (!chosen || !recommended || chosen === recommended) return false;
  const c = getVehicleClassProfile(chosen);
  const r = getVehicleClassProfile(recommended);
  if (!c || !r) return false;
  return c.rank > r.rank;
}

/** Friendly cost-band label used in the UI. */
export const COST_BAND_LABELS: Record<CostBand, string> = {
  economy: "Economy",
  standard: "Standard",
  premium: "Premium",
  specialised: "Specialised",
};

/** Tailwind-friendly colour token per cost band (uses semantic tokens only). */
export const COST_BAND_TONE: Record<CostBand, string> = {
  economy:     "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  standard:    "bg-primary/10 text-primary border-primary/30",
  premium:     "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  specialised: "bg-destructive/10 text-destructive border-destructive/30",
};

/**
 * Business-only purpose taxonomy, organised into 5 functional groups.
 * Personal / family / relative use is intentionally absent — the form
 * blocks free-text "personal" purposes.
 *
 * Groups:
 *   1. Operational & Business Activities
 *   2. Transportation & Logistics
 *   3. Administrative & Support
 *   4. Emergency Use
 *   5. Social & Organizational Affairs (Restricted Use)
 *
 * Legacy values (client_visit, site_inspection, training, logistics,
 * personnel_shuttle, executive_travel, emergency_response, official_errand,
 * social_affairs) are kept as hidden aliases so historical rows still resolve.
 */
export type BusinessPurposeGroup =
  | "operational"
  | "transport"
  | "admin"
  | "emergency"
  | "social";

export const BUSINESS_PURPOSE_GROUPS: { id: BusinessPurposeGroup; label: string; restricted?: boolean }[] = [
  { id: "operational", label: "Operational & Business Activities" },
  { id: "transport",   label: "Transportation & Logistics" },
  { id: "admin",       label: "Administrative & Support" },
  { id: "emergency",   label: "Emergency Use" },
  { id: "social",      label: "Social & Organizational Affairs (Restricted Use)", restricted: true },
];

export const BUSINESS_PURPOSE_CATEGORIES: {
  value: string;
  label: string;
  description: string;
  group: BusinessPurposeGroup;
  hidden?: boolean;
}[] = [
  // 1. Operational & Business Activities
  { value: "official_meeting",   label: "Official meetings & site visits", description: "Travel to meetings, project sites, or partner locations.", group: "operational" },
  { value: "field_operation",    label: "Field operations",                description: "Inspections, supervision, or on-site technical work.",     group: "operational" },
  { value: "project_travel",     label: "Project-related travel",          description: "Activities directly tied to ongoing projects.",            group: "operational" },
  { value: "events_conferences", label: "Events & conferences",            description: "Transporting staff or materials to official events.",      group: "operational" },
  { value: "training_workshops", label: "Training & workshops",            description: "Attending or facilitating external sessions.",             group: "operational" },

  // 2. Transportation & Logistics
  { value: "staff_transport",    label: "Transporting staff",              description: "Movement between offices, sites, or work locations.",      group: "transport" },
  { value: "client_visitor",     label: "Client or visitor transport",     description: "Pick-up/drop-off of guests, partners, or VIPs.",           group: "transport" },
  { value: "airport_transfer",   label: "Airport transfers",               description: "Official business travel pick-up and drop-off.",           group: "transport" },
  { value: "delivery_logistics", label: "Delivery & logistics",            description: "Transporting goods, documents, or equipment.",             group: "transport" },

  // 3. Administrative & Support
  { value: "admin_errand",       label: "Administrative errands",          description: "Banking, government offices, official paperwork.",         group: "admin" },
  { value: "maintenance_trip",   label: "Maintenance trips",               description: "Vehicle servicing, repair, or inspection.",                group: "admin" },

  // 4. Emergency Use
  { value: "emergency",          label: "Emergency situations",            description: "Urgent travel for breakdowns, incidents, or critical tasks.", group: "emergency" },

  // 5. Social & Organizational Affairs (Restricted Use)
  { value: "company_event",      label: "Official company events",         description: "Team-building, annual gatherings, celebrations.",          group: "social" },
  { value: "employee_welfare",   label: "Employee welfare activities",     description: "Hospital visits, bereavement support, staff assistance.",  group: "social" },
  { value: "csr",                label: "Corporate social responsibility", description: "Community outreach, charity, volunteering.",               group: "social" },
  { value: "hosting_guests",     label: "Hosting official guests",         description: "Transport for social or networking events tied to work.",  group: "social" },
  { value: "cultural_event",     label: "Cultural or national events",     description: "Participation in recognized public or organizational events.", group: "social" },

  // Catch-all
  { value: "other_business",     label: "Other business",                  description: "Other work-related purpose (describe in detail).",         group: "operational" },

  // Legacy aliases — hidden from the picker but accepted for old records.
  { value: "client_visit",       label: "Client visit (legacy)",           description: "Legacy alias for official meetings.",                      group: "operational", hidden: true },
  { value: "site_inspection",    label: "Site inspection (legacy)",        description: "Legacy alias for field operations.",                       group: "operational", hidden: true },
  { value: "training",           label: "Training (legacy)",               description: "Legacy alias for training & workshops.",                   group: "operational", hidden: true },
  { value: "logistics",          label: "Logistics (legacy)",              description: "Legacy alias for delivery & logistics.",                   group: "transport",   hidden: true },
  { value: "personnel_shuttle",  label: "Personnel shuttle (legacy)",      description: "Legacy alias for transporting staff.",                     group: "transport",   hidden: true },
  { value: "executive_travel",   label: "Executive travel (legacy)",       description: "Legacy alias for official meetings.",                      group: "operational", hidden: true },
  { value: "emergency_response", label: "Emergency response (legacy)",     description: "Legacy alias for emergency situations.",                   group: "emergency",   hidden: true },
  { value: "official_errand",    label: "Official errand (legacy)",        description: "Legacy alias for administrative errands.",                 group: "admin",       hidden: true },
  { value: "social_affairs",     label: "Social affairs (legacy)",         description: "Legacy alias for company events.",                         group: "social",      hidden: true },
];

/** Cargo-load options surfaced in the form. */
export const CARGO_LOAD_OPTIONS: { value: CargoLoad; label: string; description: string }[] = [
  { value: "none",   label: "None",          description: "Passengers only." },
  { value: "small",  label: "Small",         description: "Briefcase, laptop, hand-carried items." },
  { value: "medium", label: "Medium",        description: "Boxes, tools, small equipment (fits in a sedan trunk)." },
  { value: "large",  label: "Large",         description: "Pallets, bulky equipment, multiple boxes (needs van or pickup)." },
];
