/**
 * SUMO-style Route Definitions for Addis Ababa
 * Equivalent to SUMO .rou.xml — defines predefined routes vehicles follow
 * Each route is a sequence of segment IDs from source to destination
 */

export interface SumoRoute {
  id: string;
  name: string;
  description: string;
  segments: string[];           // ordered segment IDs
  vehicleTypes: string[];       // allowed vehicle types
  weight: number;               // spawn probability weight
  departureZone: string;        // origin node
  arrivalZone: string;          // destination node
}

export interface SumoVehicleType {
  id: string;
  accel: number;         // m/s²
  decel: number;         // m/s²
  maxSpeed: number;      // km/h
  length: number;        // meters
  minGap: number;        // meters
  sigma: number;         // driver imperfection 0-1
  color: string;
}

// ── Vehicle type definitions (like SUMO vType) ──
export const SUMO_VEHICLE_TYPES: Record<string, SumoVehicleType> = {
  sedan: {
    id: "sedan", accel: 2.6, decel: 4.5, maxSpeed: 60,
    length: 4.5, minGap: 2.5, sigma: 0.5, color: "#22c55e"
  },
  minibus: {
    id: "minibus", accel: 1.8, decel: 3.5, maxSpeed: 50,
    length: 5.5, minGap: 3.0, sigma: 0.6, color: "#eab308"
  },
  bus: {
    id: "bus", accel: 1.2, decel: 3.0, maxSpeed: 45,
    length: 12.0, minGap: 4.0, sigma: 0.4, color: "#3b82f6"
  },
  truck: {
    id: "truck", accel: 1.0, decel: 3.0, maxSpeed: 40,
    length: 10.0, minGap: 4.5, sigma: 0.4, color: "#f97316"
  },
  suv: {
    id: "suv", accel: 2.4, decel: 4.2, maxSpeed: 55,
    length: 5.0, minGap: 2.5, sigma: 0.5, color: "#8b5cf6"
  },
};

// ── Predefined routes (like SUMO route elements) ──
// Each route follows connected segments through the network graph
export const SUMO_ROUTES: SumoRoute[] = [
  // ════════════════════════════════
  // BOLE CORRIDOR (Airport ↔ City Center)
  // ════════════════════════════════
  {
    id: "route_bole_inbound",
    name: "Bole Airport → Meskel Square",
    description: "Airport arrivals heading to city center via Bole Road",
    segments: ["bole_1", "bole_2"],
    vehicleTypes: ["sedan", "suv", "minibus"],
    weight: 15,
    departureZone: "airport",
    arrivalZone: "meskel",
  },
  {
    id: "route_bole_outbound",
    name: "Meskel Square → Bole Airport",
    description: "City center departures heading to airport",
    segments: ["bole_2_r", "bole_1_r"],
    vehicleTypes: ["sedan", "suv", "minibus"],
    weight: 12,
    departureZone: "meskel",
    arrivalZone: "airport",
  },

  // ════════════════════════════════
  // AFRICA AVENUE (East-West)
  // ════════════════════════════════
  {
    id: "route_africa_east",
    name: "Bole Brass → Megenagna",
    description: "Africa Avenue eastbound via Urael and Bambis",
    segments: ["africa_1", "africa_2", "africa_3"],
    vehicleTypes: ["sedan", "minibus", "bus", "suv"],
    weight: 18,
    departureZone: "bole_brass",
    arrivalZone: "megenagna",
  },
  {
    id: "route_africa_west",
    name: "Megenagna → Bole Brass",
    description: "Africa Avenue westbound",
    segments: ["africa_3_r", "africa_2_r", "africa_1_r"],
    vehicleTypes: ["sedan", "minibus", "bus", "suv"],
    weight: 16,
    departureZone: "megenagna",
    arrivalZone: "bole_brass",
  },

  // ════════════════════════════════
  // RING ROAD SOUTH
  // ════════════════════════════════
  {
    id: "route_ring_south_west",
    name: "Meskel → Lideta (Ring Road)",
    description: "Ring Road southbound via Mexico",
    segments: ["ring_s1", "ring_s2"],
    vehicleTypes: ["sedan", "bus", "truck", "suv"],
    weight: 14,
    departureZone: "meskel",
    arrivalZone: "lideta",
  },
  {
    id: "route_ring_south_east",
    name: "Lideta → Meskel (Ring Road)",
    description: "Ring Road eastbound return",
    segments: ["ring_s2_r", "ring_s1_r"],
    vehicleTypes: ["sedan", "bus", "truck", "suv"],
    weight: 12,
    departureZone: "lideta",
    arrivalZone: "meskel",
  },

  // ════════════════════════════════
  // RING ROAD NORTH (CMC / Ayat)
  // ════════════════════════════════
  {
    id: "route_ring_north_out",
    name: "Megenagna → Ayat",
    description: "Ring Road north to CMC and Ayat",
    segments: ["ring_n1", "ring_n2"],
    vehicleTypes: ["sedan", "minibus", "bus", "suv"],
    weight: 10,
    departureZone: "megenagna",
    arrivalZone: "ayat",
  },
  {
    id: "route_ring_north_in",
    name: "Ayat → Megenagna",
    description: "CMC corridor inbound",
    segments: ["conn_4", "ring_n1_r"],
    vehicleTypes: ["sedan", "minibus", "bus"],
    weight: 10,
    departureZone: "ayat",
    arrivalZone: "megenagna",
  },

  // ════════════════════════════════
  // CHURCHILL AVENUE (North-South)
  // ════════════════════════════════
  {
    id: "route_churchill_north",
    name: "Meskel → Piazza",
    description: "Churchill Avenue northbound via Stadium",
    segments: ["church_1", "church_2"],
    vehicleTypes: ["sedan", "minibus", "bus"],
    weight: 12,
    departureZone: "meskel",
    arrivalZone: "piazza",
  },
  {
    id: "route_churchill_south",
    name: "Piazza → Meskel",
    description: "Churchill Avenue southbound",
    segments: ["church_2_r", "church_1_r"],
    vehicleTypes: ["sedan", "minibus", "bus"],
    weight: 10,
    departureZone: "piazza",
    arrivalZone: "meskel",
  },

  // ════════════════════════════════
  // SOUTH CORRIDOR (Gotera / Saris / Kality)
  // ════════════════════════════════
  {
    id: "route_south_out",
    name: "Meskel → Kality",
    description: "Southern corridor via Gotera and Saris",
    segments: ["south_1", "south_2", "south_3"],
    vehicleTypes: ["sedan", "truck", "bus", "suv"],
    weight: 8,
    departureZone: "meskel",
    arrivalZone: "kality",
  },
  {
    id: "route_south_in",
    name: "Kality → Meskel",
    description: "Southern inbound commute",
    segments: ["south_3_r", "south_2_r", "south_1_r"],
    vehicleTypes: ["sedan", "truck", "bus", "minibus"],
    weight: 10,
    departureZone: "kality",
    arrivalZone: "meskel",
  },

  // ════════════════════════════════
  // MERKATO
  // ════════════════════════════════
  {
    id: "route_merkato_from_lideta",
    name: "Lideta → Merkato → Piazza",
    description: "Commercial corridor through Merkato",
    segments: ["merk_1", "merk_2"],
    vehicleTypes: ["sedan", "minibus", "truck"],
    weight: 14,
    departureZone: "lideta",
    arrivalZone: "piazza",
  },
  {
    id: "route_merkato_return",
    name: "Piazza → Merkato → Lideta",
    description: "Return from Piazza through Merkato",
    segments: ["merk_2_r", "merk_1_r"],
    vehicleTypes: ["sedan", "minibus", "truck"],
    weight: 12,
    departureZone: "piazza",
    arrivalZone: "lideta",
  },

  // ════════════════════════════════
  // EAST CORRIDOR (Gerji)
  // ════════════════════════════════
  {
    id: "route_gerji_north",
    name: "Airport → Gerji → Megenagna",
    description: "Eastern bypass via Gerji",
    segments: ["east_1", "east_2"],
    vehicleTypes: ["sedan", "suv", "minibus"],
    weight: 8,
    departureZone: "airport",
    arrivalZone: "megenagna",
  },
  {
    id: "route_gerji_cmc",
    name: "Airport → Gerji → CMC",
    description: "Eastern corridor to CMC",
    segments: ["east_1", "east_3"],
    vehicleTypes: ["sedan", "suv", "bus"],
    weight: 6,
    departureZone: "airport",
    arrivalZone: "cmc",
  },

  // ════════════════════════════════
  // BOLE BULBULA
  // ════════════════════════════════
  {
    id: "route_bulbula_south",
    name: "Bole Brass → Bole Bulbula → Saris",
    description: "Bole Bulbula residential corridor",
    segments: ["bulb_1", "bulb_2"],
    vehicleTypes: ["sedan", "minibus", "suv"],
    weight: 7,
    departureZone: "bole_brass",
    arrivalZone: "saris",
  },
  {
    id: "route_bulbula_north",
    name: "Saris → Bole Bulbula → Bole Brass",
    description: "Bole Bulbula northbound commute",
    segments: ["bulb_2_r", "bulb_1_r"],
    vehicleTypes: ["sedan", "minibus"],
    weight: 7,
    departureZone: "saris",
    arrivalZone: "bole_brass",
  },

  // ════════════════════════════════
  // WEST CORRIDOR (Jemo)
  // ════════════════════════════════
  {
    id: "route_west_out",
    name: "Lideta → Torhailoch → Jemo",
    description: "Western corridor outbound",
    segments: ["west_1", "west_2"],
    vehicleTypes: ["sedan", "minibus", "bus"],
    weight: 6,
    departureZone: "lideta",
    arrivalZone: "jemo",
  },
  {
    id: "route_west_in",
    name: "Jemo → Torhailoch → Lideta",
    description: "Western corridor inbound",
    segments: ["west_2_r", "west_1_r"],
    vehicleTypes: ["sedan", "minibus", "bus"],
    weight: 8,
    departureZone: "jemo",
    arrivalZone: "lideta",
  },

  // ════════════════════════════════
  // CROSS-CITY LONG ROUTES
  // ════════════════════════════════
  {
    id: "route_airport_to_merkato",
    name: "Airport → Meskel → Mexico → Lideta → Merkato",
    description: "Airport to Merkato cross-city",
    segments: ["bole_1", "bole_2", "ring_s1", "ring_s2", "merk_1"],
    vehicleTypes: ["sedan", "truck"],
    weight: 5,
    departureZone: "airport",
    arrivalZone: "merkato",
  },
  {
    id: "route_ayat_to_gotera",
    name: "Ayat → CMC → Megenagna → Africa → Bole → Meskel → Gotera",
    description: "North-east to south cross-city",
    segments: ["conn_4", "ring_n1_r", "africa_3_r", "africa_2_r", "africa_1_r", "bole_2", "south_1"],
    vehicleTypes: ["sedan", "bus"],
    weight: 4,
    departureZone: "ayat",
    arrivalZone: "gotera",
  },
  {
    id: "route_kality_to_piazza",
    name: "Kality → Saris → Gotera → Mexico → Stadium → Piazza",
    description: "Deep south to city center",
    segments: ["south_3_r", "south_2_r", "conn_2_r", "conn_9_r", "church_2"],
    vehicleTypes: ["sedan", "minibus"],
    weight: 5,
    departureZone: "kality",
    arrivalZone: "piazza",
  },
  {
    id: "route_wollo_loop",
    name: "Meskel → Urael → Bambis → Megenagna → Kotebe → Sidist Kilo",
    description: "Eastern loop via Wollo Sefer",
    segments: ["wollo_1", "africa_2", "africa_3", "kot_1", "kot_2"],
    vehicleTypes: ["sedan", "minibus", "bus"],
    weight: 6,
    departureZone: "meskel",
    arrivalZone: "sidist_kilo",
  },
  {
    id: "route_jemo_to_megenagna",
    name: "Jemo → Torhailoch → Lideta → Mexico → Meskel → Urael → Bambis → Megenagna",
    description: "West to east cross-city commute",
    segments: ["west_2_r", "west_1_r", "ring_s2_r", "ring_s1_r", "wollo_1", "africa_2", "africa_3"],
    vehicleTypes: ["sedan", "bus"],
    weight: 4,
    departureZone: "jemo",
    arrivalZone: "megenagna",
  },
  {
    id: "route_circular_inner",
    name: "Meskel → Mexico → Lideta → Piazza → Stadium → Meskel",
    description: "Inner city circular route",
    segments: ["ring_s1", "ring_s2", "conn_3", "church_2_r", "church_1_r"],
    vehicleTypes: ["minibus", "bus"],
    weight: 8,
    departureZone: "meskel",
    arrivalZone: "meskel",
  },
];

/**
 * Select a route using weighted random selection (like SUMO flow definitions)
 */
export function selectWeightedRoute(vehicleType?: string): SumoRoute {
  const eligible = vehicleType
    ? SUMO_ROUTES.filter(r => r.vehicleTypes.includes(vehicleType))
    : SUMO_ROUTES;

  const totalWeight = eligible.reduce((sum, r) => sum + r.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const route of eligible) {
    roll -= route.weight;
    if (roll <= 0) return route;
  }

  return eligible[eligible.length - 1];
}

/**
 * Get a new route that starts from a given node (for re-routing at destination)
 */
export function selectRouteFromNode(nodeId: string, vehicleType?: string): SumoRoute | null {
  const eligible = SUMO_ROUTES.filter(r => {
    if (r.departureZone !== nodeId) return false;
    if (vehicleType && !r.vehicleTypes.includes(vehicleType)) return false;
    return true;
  });

  if (eligible.length === 0) return null;

  const totalWeight = eligible.reduce((sum, r) => sum + r.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const route of eligible) {
    roll -= route.weight;
    if (roll <= 0) return route;
  }
  return eligible[eligible.length - 1];
}
