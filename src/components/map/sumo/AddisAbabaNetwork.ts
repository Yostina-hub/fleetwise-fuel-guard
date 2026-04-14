import type { RoadNode, RoadSegment } from "./types";

// Key intersections/nodes in Addis Ababa
export const NODES: RoadNode[] = [
  { id: "bole_intl",    lat: 8.9806, lng: 38.7998, name: "Bole International Airport" },
  { id: "bole_med",     lat: 8.9950, lng: 38.7860, name: "Bole Medhanialem", signalControlled: true },
  { id: "bole_brass",   lat: 9.0030, lng: 38.7770, name: "Bole Brass", signalControlled: true },
  { id: "meskel_sq",    lat: 9.0107, lng: 38.7618, name: "Meskel Square", signalControlled: true },
  { id: "stadium",      lat: 9.0140, lng: 38.7560, name: "Stadium" },
  { id: "mexico_sq",    lat: 9.0165, lng: 38.7480, name: "Mexico Square", signalControlled: true },
  { id: "lideta",       lat: 9.0190, lng: 38.7370, name: "Lideta", signalControlled: true },
  { id: "piazza",       lat: 9.0320, lng: 38.7470, name: "Piazza", signalControlled: true },
  { id: "churchill",    lat: 9.0240, lng: 38.7520, name: "Churchill Ave (mid)" },
  { id: "arat_kilo",    lat: 9.0350, lng: 38.7590, name: "Arat Kilo", signalControlled: true },
  { id: "sidist_kilo",  lat: 9.0400, lng: 38.7560, name: "Sidist Kilo" },
  { id: "megenagna",    lat: 9.0210, lng: 38.8000, name: "Megenagna", signalControlled: true },
  { id: "hayahulet",    lat: 9.0070, lng: 38.7470, name: "Hayahulet Mazoria", signalControlled: true },
  { id: "sarbet",       lat: 8.9890, lng: 38.7560, name: "Sarbet" },
  { id: "gotera",       lat: 8.9980, lng: 38.7450, name: "Gotera", signalControlled: true },
  { id: "kality",       lat: 8.9500, lng: 38.7600, name: "Kality" },
  { id: "cmc",          lat: 9.0420, lng: 38.8180, name: "CMC" },
  { id: "ayat",         lat: 9.0490, lng: 38.8400, name: "Ayat" },
  { id: "summit",       lat: 9.0270, lng: 38.8100, name: "Summit", signalControlled: true },
  { id: "gerji",        lat: 9.0100, lng: 38.8060, name: "Gerji" },
  { id: "jemo",         lat: 8.9760, lng: 38.7200, name: "Jemo" },
  { id: "merkato",      lat: 9.0300, lng: 38.7350, name: "Merkato" },
  { id: "torhailoch",   lat: 9.0220, lng: 38.7200, name: "Torhailoch", signalControlled: true },
  { id: "lebu",         lat: 8.9700, lng: 38.7000, name: "Lebu" },
  { id: "kotebe",       lat: 9.0400, lng: 38.7900, name: "Kotebe" },
];

const node = (id: string) => {
  const n = NODES.find(n => n.id === id);
  return n ? [n.lng, n.lat] as [number, number] : [38.76, 9.01] as [number, number];
};

// Helper: generate waypoints between two nodes (straight line with optional midpoints)
const segPath = (fromId: string, toId: string, midpoints?: [number, number][]): [number, number][] => {
  const pts: [number, number][] = [node(fromId)];
  if (midpoints) pts.push(...midpoints);
  pts.push(node(toId));
  return pts;
};

// Road segments (bidirectional modeled as separate segments for simplicity)
export const SEGMENTS: RoadSegment[] = [
  // Bole Road corridor
  { id: "bole_1", from: "bole_intl", to: "bole_med", name: "Bole Road (Airport)", speedLimit: 60, lanes: 3, waypoints: segPath("bole_intl", "bole_med") },
  { id: "bole_2", from: "bole_med", to: "bole_brass", name: "Bole Road (Medhanialem)", speedLimit: 50, lanes: 3, waypoints: segPath("bole_med", "bole_brass") },
  { id: "bole_3", from: "bole_brass", to: "meskel_sq", name: "Bole Road (Brass-Meskel)", speedLimit: 40, lanes: 2, waypoints: segPath("bole_brass", "meskel_sq", [[38.7700, 9.0060]]) },

  // Return direction
  { id: "bole_1r", from: "bole_med", to: "bole_intl", name: "Bole Road (return)", speedLimit: 60, lanes: 3, waypoints: segPath("bole_med", "bole_intl") },
  { id: "bole_2r", from: "bole_brass", to: "bole_med", name: "Bole Road (return)", speedLimit: 50, lanes: 3, waypoints: segPath("bole_brass", "bole_med") },
  { id: "bole_3r", from: "meskel_sq", to: "bole_brass", name: "Bole Road (return)", speedLimit: 40, lanes: 2, waypoints: segPath("meskel_sq", "bole_brass", [[38.7700, 9.0060]]) },

  // Churchill Ave
  { id: "church_1", from: "meskel_sq", to: "churchill", name: "Churchill Avenue S", speedLimit: 40, lanes: 2, waypoints: segPath("meskel_sq", "churchill") },
  { id: "church_2", from: "churchill", to: "piazza", name: "Churchill Avenue N", speedLimit: 40, lanes: 2, waypoints: segPath("churchill", "piazza") },
  { id: "church_1r", from: "churchill", to: "meskel_sq", name: "Churchill Avenue S (return)", speedLimit: 40, lanes: 2, waypoints: segPath("churchill", "meskel_sq") },
  { id: "church_2r", from: "piazza", to: "churchill", name: "Churchill Avenue N (return)", speedLimit: 40, lanes: 2, waypoints: segPath("piazza", "churchill") },

  // Meskel Sq to Mexico to Lideta
  { id: "mexico_1", from: "meskel_sq", to: "mexico_sq", name: "Ras Desta Damtew St", speedLimit: 40, lanes: 2, waypoints: segPath("meskel_sq", "mexico_sq", [[38.7550, 9.0130]]) },
  { id: "mexico_2", from: "mexico_sq", to: "lideta", name: "Lideta Road", speedLimit: 35, lanes: 2, waypoints: segPath("mexico_sq", "lideta") },
  { id: "mexico_1r", from: "mexico_sq", to: "meskel_sq", name: "Ras Desta Damtew St (return)", speedLimit: 40, lanes: 2, waypoints: segPath("mexico_sq", "meskel_sq", [[38.7550, 9.0130]]) },

  // Ring Road segments (Megenagna corridor)
  { id: "ring_1", from: "megenagna", to: "summit", name: "Ring Road (Megenagna-Summit)", speedLimit: 60, lanes: 3, waypoints: segPath("megenagna", "summit") },
  { id: "ring_2", from: "summit", to: "cmc", name: "Ring Road (Summit-CMC)", speedLimit: 60, lanes: 3, waypoints: segPath("summit", "cmc") },
  { id: "ring_3", from: "cmc", to: "ayat", name: "CMC-Ayat Road", speedLimit: 50, lanes: 2, waypoints: segPath("cmc", "ayat") },
  { id: "ring_1r", from: "summit", to: "megenagna", name: "Ring Road (return)", speedLimit: 60, lanes: 3, waypoints: segPath("summit", "megenagna") },

  // Bole to Megenagna
  { id: "bole_meg", from: "bole_brass", to: "megenagna", name: "Africa Ave (Bole-Megenagna)", speedLimit: 50, lanes: 2, waypoints: segPath("bole_brass", "megenagna", [[38.7900, 9.0120]]) },
  { id: "bole_megr", from: "megenagna", to: "bole_brass", name: "Africa Ave (return)", speedLimit: 50, lanes: 2, waypoints: segPath("megenagna", "bole_brass", [[38.7900, 9.0120]]) },

  // Gerji area
  { id: "gerji_1", from: "bole_med", to: "gerji", name: "Gerji Road", speedLimit: 40, lanes: 2, waypoints: segPath("bole_med", "gerji") },
  { id: "gerji_2", from: "gerji", to: "megenagna", name: "Gerji-Megenagna", speedLimit: 40, lanes: 2, waypoints: segPath("gerji", "megenagna") },

  // Arat Kilo - Sidist Kilo
  { id: "arat_1", from: "piazza", to: "arat_kilo", name: "Piazza-Arat Kilo", speedLimit: 35, lanes: 2, waypoints: segPath("piazza", "arat_kilo") },
  { id: "arat_2", from: "arat_kilo", to: "sidist_kilo", name: "Arat-Sidist Kilo", speedLimit: 35, lanes: 2, waypoints: segPath("arat_kilo", "sidist_kilo") },
  { id: "arat_1r", from: "arat_kilo", to: "piazza", name: "Arat Kilo-Piazza (return)", speedLimit: 35, lanes: 2, waypoints: segPath("arat_kilo", "piazza") },

  // Southern: Sarbet, Gotera, Kality
  { id: "south_1", from: "meskel_sq", to: "hayahulet", name: "Hayahulet Road", speedLimit: 40, lanes: 2, waypoints: segPath("meskel_sq", "hayahulet") },
  { id: "south_2", from: "hayahulet", to: "gotera", name: "Gotera Road", speedLimit: 40, lanes: 2, waypoints: segPath("hayahulet", "gotera") },
  { id: "south_3", from: "sarbet", to: "kality", name: "Kality Highway", speedLimit: 60, lanes: 3, waypoints: segPath("sarbet", "kality") },
  { id: "south_1r", from: "hayahulet", to: "meskel_sq", name: "Hayahulet (return)", speedLimit: 40, lanes: 2, waypoints: segPath("hayahulet", "meskel_sq") },

  // Western: Merkato, Torhailoch
  { id: "west_1", from: "lideta", to: "merkato", name: "Merkato Road", speedLimit: 30, lanes: 2, waypoints: segPath("lideta", "merkato") },
  { id: "west_2", from: "merkato", to: "torhailoch", name: "Torhailoch Road", speedLimit: 40, lanes: 2, waypoints: segPath("merkato", "torhailoch") },
  { id: "west_3", from: "torhailoch", to: "jemo", name: "Jemo Road", speedLimit: 50, lanes: 2, waypoints: segPath("torhailoch", "jemo") },
  { id: "west_3r", from: "jemo", to: "torhailoch", name: "Jemo Road (return)", speedLimit: 50, lanes: 2, waypoints: segPath("jemo", "torhailoch") },

  // Kotebe connection
  { id: "kotebe_1", from: "megenagna", to: "kotebe", name: "Kotebe Road", speedLimit: 40, lanes: 2, waypoints: segPath("megenagna", "kotebe") },
  { id: "kotebe_1r", from: "kotebe", to: "megenagna", name: "Kotebe Road (return)", speedLimit: 40, lanes: 2, waypoints: segPath("kotebe", "megenagna") },

  // Piazza to Merkato
  { id: "piazza_mkt", from: "piazza", to: "merkato", name: "Piazza-Merkato", speedLimit: 30, lanes: 2, waypoints: segPath("piazza", "merkato") },
  { id: "piazza_mktr", from: "merkato", to: "piazza", name: "Merkato-Piazza (return)", speedLimit: 30, lanes: 2, waypoints: segPath("merkato", "piazza") },

  // Sarbet-Bole
  { id: "sarbet_bole", from: "sarbet", to: "bole_med", name: "Sarbet-Bole", speedLimit: 40, lanes: 2, waypoints: segPath("sarbet", "bole_med") },
  { id: "sarbet_boler", from: "bole_med", to: "sarbet", name: "Bole-Sarbet", speedLimit: 40, lanes: 2, waypoints: segPath("bole_med", "sarbet") },
];

// Compute segment lengths in meters using Haversine
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function computeSegmentLength(seg: RoadSegment): number {
  let total = 0;
  for (let i = 1; i < seg.waypoints.length; i++) {
    total += haversine(seg.waypoints[i - 1][1], seg.waypoints[i - 1][0], seg.waypoints[i][1], seg.waypoints[i][0]);
  }
  return total;
}

// Build adjacency list for routing
export function getOutgoingSegments(nodeId: string): RoadSegment[] {
  return SEGMENTS.filter(s => s.from === nodeId);
}

// Initialize all segment lengths
SEGMENTS.forEach(s => { s.length = computeSegmentLength(s); });
