import type { RoadNode, RoadSegment } from "./types";

// Key intersections/nodes in Addis Ababa (refined coordinates)
export const NODES: RoadNode[] = [
  { id: "bole_intl",    lat: 8.97790, lng: 38.79930, name: "Bole International Airport" },
  { id: "bole_med",     lat: 8.99560, lng: 38.78520, name: "Bole Medhanialem", signalControlled: true },
  { id: "bole_brass",   lat: 9.00420, lng: 38.77380, name: "Bole Brass", signalControlled: true },
  { id: "bole_dembel",  lat: 9.00870, lng: 38.76830, name: "Bole Dembel", signalControlled: true },
  { id: "meskel_sq",    lat: 9.01080, lng: 38.76150, name: "Meskel Square", signalControlled: true },
  { id: "stadium",      lat: 9.01380, lng: 38.75620, name: "Stadium" },
  { id: "mexico_sq",    lat: 9.01660, lng: 38.74850, name: "Mexico Square", signalControlled: true },
  { id: "lideta",       lat: 9.01980, lng: 38.73750, name: "Lideta", signalControlled: true },
  { id: "piazza",       lat: 9.03100, lng: 38.74680, name: "Piazza", signalControlled: true },
  { id: "churchill_mid",lat: 9.02350, lng: 38.75250, name: "Churchill Ave Mid" },
  { id: "arat_kilo",    lat: 9.03400, lng: 38.75880, name: "Arat Kilo", signalControlled: true },
  { id: "sidist_kilo",  lat: 9.03850, lng: 38.76350, name: "Sidist Kilo", signalControlled: true },
  { id: "megenagna",    lat: 9.02080, lng: 38.80020, name: "Megenagna", signalControlled: true },
  { id: "hayahulet",    lat: 9.00680, lng: 38.74750, name: "Hayahulet Mazoria", signalControlled: true },
  { id: "sarbet",       lat: 8.98950, lng: 38.75680, name: "Sarbet" },
  { id: "gotera",       lat: 8.99750, lng: 38.74450, name: "Gotera", signalControlled: true },
  { id: "kality",       lat: 8.95150, lng: 38.75980, name: "Kality" },
  { id: "cmc",          lat: 9.04200, lng: 38.81800, name: "CMC", signalControlled: true },
  { id: "ayat",         lat: 9.04850, lng: 38.84050, name: "Ayat" },
  { id: "summit",       lat: 9.02700, lng: 38.81050, name: "Summit", signalControlled: true },
  { id: "gerji",        lat: 9.01050, lng: 38.80620, name: "Gerji" },
  { id: "jemo",         lat: 8.97680, lng: 38.72050, name: "Jemo" },
  { id: "merkato",      lat: 9.03000, lng: 38.73500, name: "Merkato", signalControlled: true },
  { id: "torhailoch",   lat: 9.02200, lng: 38.72050, name: "Torhailoch", signalControlled: true },
  { id: "lebu",         lat: 8.97050, lng: 38.70050, name: "Lebu" },
  { id: "kotebe",       lat: 9.04050, lng: 38.79050, name: "Kotebe" },
  { id: "bole_bulbula", lat: 8.97200, lng: 38.77450, name: "Bole Bulbula" },
  { id: "wollo_sefer",  lat: 9.01500, lng: 38.76850, name: "Wollo Sefer", signalControlled: true },
  { id: "urael",        lat: 9.01400, lng: 38.77550, name: "Urael", signalControlled: true },
  { id: "bambis",       lat: 9.01680, lng: 38.78600, name: "Bambis" },
  { id: "olympia",      lat: 9.01350, lng: 38.76380, name: "Olympia" },
  { id: "kazanchis",    lat: 9.01880, lng: 38.76150, name: "Kazanchis", signalControlled: true },
  { id: "filwoha",      lat: 9.02650, lng: 38.75550, name: "Filwoha" },
  { id: "autobus",      lat: 9.02450, lng: 38.74250, name: "Autobus Tera", signalControlled: true },
  { id: "teklehaimanot", lat: 9.02850, lng: 38.73950, name: "Teklehaimanot", signalControlled: true },
  { id: "total",        lat: 9.01050, lng: 38.79100, name: "Total" },
  { id: "atlas",        lat: 9.01580, lng: 38.79500, name: "Atlas" },
  { id: "22_mazoria",   lat: 9.02450, lng: 38.76700, name: "22 Mazoria", signalControlled: true },
  { id: "imperial",     lat: 9.03300, lng: 38.75350, name: "Imperial Hotel" },
  { id: "saris",        lat: 8.96800, lng: 38.75250, name: "Saris" },
];

// Road segments with detailed waypoints following actual road geometry
// Format: [lng, lat] pairs tracing the road curves
export const SEGMENTS: RoadSegment[] = [
  // ═══════════════════════════════════════
  // BOLE ROAD CORRIDOR (Airport → Meskel Sq)
  // ═══════════════════════════════════════
  {
    id: "bole_1", from: "bole_intl", to: "bole_med",
    name: "Bole Road (Airport Section)", speedLimit: 60, lanes: 3,
    waypoints: [
      [38.79930, 8.97790], // Airport
      [38.79850, 8.97950], // slight curve
      [38.79700, 8.98150],
      [38.79520, 8.98380],
      [38.79350, 8.98580],
      [38.79150, 8.98780],
      [38.78950, 8.98980],
      [38.78750, 8.99180],
      [38.78620, 8.99380],
      [38.78520, 8.99560], // Bole Medhanialem
    ],
  },
  {
    id: "bole_1r", from: "bole_med", to: "bole_intl",
    name: "Bole Road (Airport Return)", speedLimit: 60, lanes: 3,
    waypoints: [
      [38.78520, 8.99560],
      [38.78620, 8.99380],
      [38.78750, 8.99180],
      [38.78950, 8.98980],
      [38.79150, 8.98780],
      [38.79350, 8.98580],
      [38.79520, 8.98380],
      [38.79700, 8.98150],
      [38.79850, 8.97950],
      [38.79930, 8.97790],
    ],
  },
  {
    id: "bole_2", from: "bole_med", to: "bole_brass",
    name: "Bole Road (Medhanialem-Brass)", speedLimit: 50, lanes: 3,
    waypoints: [
      [38.78520, 8.99560],
      [38.78400, 8.99680],
      [38.78250, 8.99850],
      [38.78100, 9.00000],
      [38.77950, 9.00100],
      [38.77800, 9.00200],
      [38.77600, 9.00300],
      [38.77380, 9.00420],
    ],
  },
  {
    id: "bole_2r", from: "bole_brass", to: "bole_med",
    name: "Bole Road (Brass-Medhanialem Return)", speedLimit: 50, lanes: 3,
    waypoints: [
      [38.77380, 9.00420],
      [38.77600, 9.00300],
      [38.77800, 9.00200],
      [38.78100, 9.00000],
      [38.78250, 8.99850],
      [38.78400, 8.99680],
      [38.78520, 8.99560],
    ],
  },
  {
    id: "bole_3", from: "bole_brass", to: "bole_dembel",
    name: "Bole Road (Brass-Dembel)", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.77380, 9.00420],
      [38.77250, 9.00520],
      [38.77100, 9.00620],
      [38.77000, 9.00700],
      [38.76900, 9.00800],
      [38.76830, 9.00870],
    ],
  },
  {
    id: "bole_3r", from: "bole_dembel", to: "bole_brass",
    name: "Bole Road (Dembel-Brass Return)", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.76830, 9.00870],
      [38.76900, 9.00800],
      [38.77000, 9.00700],
      [38.77100, 9.00620],
      [38.77250, 9.00520],
      [38.77380, 9.00420],
    ],
  },
  {
    id: "bole_4", from: "bole_dembel", to: "meskel_sq",
    name: "Bole Road (Dembel-Meskel)", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.76830, 9.00870],
      [38.76700, 9.00920],
      [38.76550, 9.00950],
      [38.76400, 9.01000],
      [38.76250, 9.01050],
      [38.76150, 9.01080],
    ],
  },
  {
    id: "bole_4r", from: "meskel_sq", to: "bole_dembel",
    name: "Bole Road (Meskel-Dembel Return)", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.76150, 9.01080],
      [38.76250, 9.01050],
      [38.76400, 9.01000],
      [38.76550, 9.00950],
      [38.76700, 9.00920],
      [38.76830, 9.00870],
    ],
  },

  // ═══════════════════════════════════════
  // AFRICA AVENUE (Bole Brass → Urael → Megenagna)
  // ═══════════════════════════════════════
  {
    id: "africa_1", from: "bole_brass", to: "urael",
    name: "Africa Ave (Brass-Urael)", speedLimit: 50, lanes: 3,
    waypoints: [
      [38.77380, 9.00420],
      [38.77420, 9.00550],
      [38.77450, 9.00700],
      [38.77470, 9.00850],
      [38.77480, 9.01000],
      [38.77500, 9.01150],
      [38.77550, 9.01400],
    ],
  },
  {
    id: "africa_1r", from: "urael", to: "bole_brass",
    name: "Africa Ave (Urael-Brass Return)", speedLimit: 50, lanes: 3,
    waypoints: [
      [38.77550, 9.01400],
      [38.77500, 9.01150],
      [38.77480, 9.01000],
      [38.77470, 9.00850],
      [38.77450, 9.00700],
      [38.77420, 9.00550],
      [38.77380, 9.00420],
    ],
  },
  {
    id: "africa_2", from: "urael", to: "bambis",
    name: "Africa Ave (Urael-Bambis)", speedLimit: 50, lanes: 3,
    waypoints: [
      [38.77550, 9.01400],
      [38.77700, 9.01450],
      [38.77850, 9.01500],
      [38.78000, 9.01520],
      [38.78200, 9.01550],
      [38.78400, 9.01600],
      [38.78600, 9.01680],
    ],
  },
  {
    id: "africa_2r", from: "bambis", to: "urael",
    name: "Africa Ave (Bambis-Urael Return)", speedLimit: 50, lanes: 3,
    waypoints: [
      [38.78600, 9.01680],
      [38.78400, 9.01600],
      [38.78200, 9.01550],
      [38.78000, 9.01520],
      [38.77850, 9.01500],
      [38.77700, 9.01450],
      [38.77550, 9.01400],
    ],
  },
  {
    id: "africa_3", from: "bambis", to: "megenagna",
    name: "Africa Ave (Bambis-Megenagna)", speedLimit: 50, lanes: 3,
    waypoints: [
      [38.78600, 9.01680],
      [38.78800, 9.01750],
      [38.79000, 9.01800],
      [38.79200, 9.01850],
      [38.79500, 9.01950],
      [38.79700, 9.02000],
      [38.79850, 9.02050],
      [38.80020, 9.02080],
    ],
  },
  {
    id: "africa_3r", from: "megenagna", to: "bambis",
    name: "Africa Ave (Megenagna-Bambis Return)", speedLimit: 50, lanes: 3,
    waypoints: [
      [38.80020, 9.02080],
      [38.79850, 9.02050],
      [38.79700, 9.02000],
      [38.79500, 9.01950],
      [38.79200, 9.01850],
      [38.79000, 9.01800],
      [38.78800, 9.01750],
      [38.78600, 9.01680],
    ],
  },

  // ═══════════════════════════════════════
  // CHURCHILL AVENUE (Meskel Sq → Piazza)
  // ═══════════════════════════════════════
  {
    id: "church_1", from: "meskel_sq", to: "churchill_mid",
    name: "Churchill Ave (Meskel-Mid)", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.76150, 9.01080],
      [38.76050, 9.01200],
      [38.75950, 9.01350],
      [38.75800, 9.01500],
      [38.75650, 9.01650],
      [38.75500, 9.01850],
      [38.75400, 9.02050],
      [38.75350, 9.02200],
      [38.75250, 9.02350],
    ],
  },
  {
    id: "church_1r", from: "churchill_mid", to: "meskel_sq",
    name: "Churchill Ave (Mid-Meskel Return)", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.75250, 9.02350],
      [38.75350, 9.02200],
      [38.75400, 9.02050],
      [38.75500, 9.01850],
      [38.75650, 9.01650],
      [38.75800, 9.01500],
      [38.75950, 9.01350],
      [38.76050, 9.01200],
      [38.76150, 9.01080],
    ],
  },
  {
    id: "church_2", from: "churchill_mid", to: "piazza",
    name: "Churchill Ave (Mid-Piazza)", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.75250, 9.02350],
      [38.75200, 9.02450],
      [38.75100, 9.02550],
      [38.75000, 9.02650],
      [38.74900, 9.02750],
      [38.74800, 9.02900],
      [38.74750, 9.03000],
      [38.74680, 9.03100],
    ],
  },
  {
    id: "church_2r", from: "piazza", to: "churchill_mid",
    name: "Churchill Ave (Piazza-Mid Return)", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.74680, 9.03100],
      [38.74750, 9.03000],
      [38.74800, 9.02900],
      [38.74900, 9.02750],
      [38.75000, 9.02650],
      [38.75100, 9.02550],
      [38.75200, 9.02450],
      [38.75250, 9.02350],
    ],
  },

  // ═══════════════════════════════════════
  // MESKEL SQ → WOLLO SEFER → URAEL (inner ring)
  // ═══════════════════════════════════════
  {
    id: "wollo_1", from: "meskel_sq", to: "wollo_sefer",
    name: "Meskel-Wollo Sefer", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.76150, 9.01080],
      [38.76300, 9.01120],
      [38.76450, 9.01180],
      [38.76600, 9.01250],
      [38.76700, 9.01350],
      [38.76850, 9.01500],
    ],
  },
  {
    id: "wollo_1r", from: "wollo_sefer", to: "meskel_sq",
    name: "Wollo Sefer-Meskel Return", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.76850, 9.01500],
      [38.76700, 9.01350],
      [38.76600, 9.01250],
      [38.76450, 9.01180],
      [38.76300, 9.01120],
      [38.76150, 9.01080],
    ],
  },
  {
    id: "wollo_2", from: "wollo_sefer", to: "urael",
    name: "Wollo Sefer-Urael", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.76850, 9.01500],
      [38.77000, 9.01480],
      [38.77150, 9.01450],
      [38.77300, 9.01420],
      [38.77550, 9.01400],
    ],
  },
  {
    id: "wollo_2r", from: "urael", to: "wollo_sefer",
    name: "Urael-Wollo Sefer Return", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.77550, 9.01400],
      [38.77300, 9.01420],
      [38.77150, 9.01450],
      [38.77000, 9.01480],
      [38.76850, 9.01500],
    ],
  },

  // ═══════════════════════════════════════
  // MESKEL SQ → KAZANCHIS → 22 MAZORIA (Ring Rd inner)
  // ═══════════════════════════════════════
  {
    id: "kaz_1", from: "meskel_sq", to: "kazanchis",
    name: "Meskel-Kazanchis", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.76150, 9.01080],
      [38.76150, 9.01200],
      [38.76120, 9.01350],
      [38.76100, 9.01500],
      [38.76100, 9.01650],
      [38.76120, 9.01800],
      [38.76150, 9.01880],
    ],
  },
  {
    id: "kaz_1r", from: "kazanchis", to: "meskel_sq",
    name: "Kazanchis-Meskel Return", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.76150, 9.01880],
      [38.76120, 9.01800],
      [38.76100, 9.01650],
      [38.76100, 9.01500],
      [38.76120, 9.01350],
      [38.76150, 9.01200],
      [38.76150, 9.01080],
    ],
  },
  {
    id: "kaz_2", from: "kazanchis", to: "22_mazoria",
    name: "Kazanchis-22 Mazoria", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.76150, 9.01880],
      [38.76200, 9.01950],
      [38.76300, 9.02050],
      [38.76400, 9.02150],
      [38.76500, 9.02250],
      [38.76600, 9.02350],
      [38.76700, 9.02450],
    ],
  },
  {
    id: "kaz_2r", from: "22_mazoria", to: "kazanchis",
    name: "22 Mazoria-Kazanchis Return", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.76700, 9.02450],
      [38.76600, 9.02350],
      [38.76500, 9.02250],
      [38.76400, 9.02150],
      [38.76300, 9.02050],
      [38.76200, 9.01950],
      [38.76150, 9.01880],
    ],
  },

  // ═══════════════════════════════════════
  // ARAT KILO → SIDIST KILO → PIAZZA
  // ═══════════════════════════════════════
  {
    id: "arat_1", from: "piazza", to: "arat_kilo",
    name: "Piazza-Arat Kilo", speedLimit: 35, lanes: 2,
    waypoints: [
      [38.74680, 9.03100],
      [38.74850, 9.03120],
      [38.75000, 9.03150],
      [38.75150, 9.03200],
      [38.75300, 9.03250],
      [38.75500, 9.03300],
      [38.75700, 9.03350],
      [38.75880, 9.03400],
    ],
  },
  {
    id: "arat_1r", from: "arat_kilo", to: "piazza",
    name: "Arat Kilo-Piazza Return", speedLimit: 35, lanes: 2,
    waypoints: [
      [38.75880, 9.03400],
      [38.75700, 9.03350],
      [38.75500, 9.03300],
      [38.75300, 9.03250],
      [38.75150, 9.03200],
      [38.75000, 9.03150],
      [38.74850, 9.03120],
      [38.74680, 9.03100],
    ],
  },
  {
    id: "arat_2", from: "arat_kilo", to: "sidist_kilo",
    name: "Arat-Sidist Kilo", speedLimit: 35, lanes: 2,
    waypoints: [
      [38.75880, 9.03400],
      [38.75950, 9.03450],
      [38.76050, 9.03550],
      [38.76150, 9.03650],
      [38.76250, 9.03750],
      [38.76350, 9.03850],
    ],
  },
  {
    id: "arat_2r", from: "sidist_kilo", to: "arat_kilo",
    name: "Sidist-Arat Kilo Return", speedLimit: 35, lanes: 2,
    waypoints: [
      [38.76350, 9.03850],
      [38.76250, 9.03750],
      [38.76150, 9.03650],
      [38.76050, 9.03550],
      [38.75950, 9.03450],
      [38.75880, 9.03400],
    ],
  },

  // ═══════════════════════════════════════
  // MESKEL SQ → MEXICO SQ → LIDETA (south-west)
  // ═══════════════════════════════════════
  {
    id: "mexico_1", from: "meskel_sq", to: "stadium",
    name: "Meskel-Stadium", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.76150, 9.01080],
      [38.76000, 9.01150],
      [38.75900, 9.01200],
      [38.75800, 9.01280],
      [38.75700, 9.01350],
      [38.75620, 9.01380],
    ],
  },
  {
    id: "mexico_1r", from: "stadium", to: "meskel_sq",
    name: "Stadium-Meskel Return", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.75620, 9.01380],
      [38.75700, 9.01350],
      [38.75800, 9.01280],
      [38.75900, 9.01200],
      [38.76000, 9.01150],
      [38.76150, 9.01080],
    ],
  },
  {
    id: "mexico_2", from: "stadium", to: "mexico_sq",
    name: "Stadium-Mexico", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.75620, 9.01380],
      [38.75500, 9.01420],
      [38.75350, 9.01480],
      [38.75200, 9.01520],
      [38.75050, 9.01580],
      [38.74900, 9.01620],
      [38.74850, 9.01660],
    ],
  },
  {
    id: "mexico_2r", from: "mexico_sq", to: "stadium",
    name: "Mexico-Stadium Return", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.74850, 9.01660],
      [38.74900, 9.01620],
      [38.75050, 9.01580],
      [38.75200, 9.01520],
      [38.75350, 9.01480],
      [38.75500, 9.01420],
      [38.75620, 9.01380],
    ],
  },
  {
    id: "mexico_3", from: "mexico_sq", to: "lideta",
    name: "Mexico-Lideta", speedLimit: 35, lanes: 2,
    waypoints: [
      [38.74850, 9.01660],
      [38.74700, 9.01720],
      [38.74500, 9.01780],
      [38.74300, 9.01850],
      [38.74100, 9.01900],
      [38.73900, 9.01950],
      [38.73750, 9.01980],
    ],
  },
  {
    id: "mexico_3r", from: "lideta", to: "mexico_sq",
    name: "Lideta-Mexico Return", speedLimit: 35, lanes: 2,
    waypoints: [
      [38.73750, 9.01980],
      [38.73900, 9.01950],
      [38.74100, 9.01900],
      [38.74300, 9.01850],
      [38.74500, 9.01780],
      [38.74700, 9.01720],
      [38.74850, 9.01660],
    ],
  },

  // ═══════════════════════════════════════
  // RING ROAD (Megenagna → Summit → CMC → Ayat)
  // ═══════════════════════════════════════
  {
    id: "ring_1", from: "megenagna", to: "summit",
    name: "Ring Road (Megenagna-Summit)", speedLimit: 60, lanes: 3,
    waypoints: [
      [38.80020, 9.02080],
      [38.80150, 9.02100],
      [38.80350, 9.02150],
      [38.80500, 9.02250],
      [38.80650, 9.02350],
      [38.80800, 9.02500],
      [38.80900, 9.02600],
      [38.81050, 9.02700],
    ],
  },
  {
    id: "ring_1r", from: "summit", to: "megenagna",
    name: "Ring Road (Summit-Megenagna Return)", speedLimit: 60, lanes: 3,
    waypoints: [
      [38.81050, 9.02700],
      [38.80900, 9.02600],
      [38.80800, 9.02500],
      [38.80650, 9.02350],
      [38.80500, 9.02250],
      [38.80350, 9.02150],
      [38.80150, 9.02100],
      [38.80020, 9.02080],
    ],
  },
  {
    id: "ring_2", from: "summit", to: "cmc",
    name: "Ring Road (Summit-CMC)", speedLimit: 60, lanes: 3,
    waypoints: [
      [38.81050, 9.02700],
      [38.81150, 9.02850],
      [38.81250, 9.03000],
      [38.81350, 9.03200],
      [38.81450, 9.03400],
      [38.81550, 9.03600],
      [38.81650, 9.03800],
      [38.81750, 9.04000],
      [38.81800, 9.04200],
    ],
  },
  {
    id: "ring_2r", from: "cmc", to: "summit",
    name: "Ring Road (CMC-Summit Return)", speedLimit: 60, lanes: 3,
    waypoints: [
      [38.81800, 9.04200],
      [38.81750, 9.04000],
      [38.81650, 9.03800],
      [38.81550, 9.03600],
      [38.81450, 9.03400],
      [38.81350, 9.03200],
      [38.81250, 9.03000],
      [38.81150, 9.02850],
      [38.81050, 9.02700],
    ],
  },
  {
    id: "ring_3", from: "cmc", to: "ayat",
    name: "CMC-Ayat Road", speedLimit: 50, lanes: 2,
    waypoints: [
      [38.81800, 9.04200],
      [38.82050, 9.04250],
      [38.82350, 9.04350],
      [38.82650, 9.04450],
      [38.82950, 9.04550],
      [38.83250, 9.04650],
      [38.83600, 9.04750],
      [38.84050, 9.04850],
    ],
  },
  {
    id: "ring_3r", from: "ayat", to: "cmc",
    name: "Ayat-CMC Return", speedLimit: 50, lanes: 2,
    waypoints: [
      [38.84050, 9.04850],
      [38.83600, 9.04750],
      [38.83250, 9.04650],
      [38.82950, 9.04550],
      [38.82650, 9.04450],
      [38.82350, 9.04350],
      [38.82050, 9.04250],
      [38.81800, 9.04200],
    ],
  },

  // ═══════════════════════════════════════
  // GERJI AREA
  // ═══════════════════════════════════════
  {
    id: "gerji_1", from: "bole_med", to: "gerji",
    name: "Gerji Road", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.78520, 8.99560],
      [38.78700, 8.99650],
      [38.78900, 8.99800],
      [38.79100, 8.99950],
      [38.79350, 9.00100],
      [38.79600, 9.00300],
      [38.79850, 9.00500],
      [38.80100, 9.00700],
      [38.80350, 9.00850],
      [38.80620, 9.01050],
    ],
  },
  {
    id: "gerji_1r", from: "gerji", to: "bole_med",
    name: "Gerji Road Return", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.80620, 9.01050],
      [38.80350, 9.00850],
      [38.80100, 9.00700],
      [38.79850, 9.00500],
      [38.79600, 9.00300],
      [38.79350, 9.00100],
      [38.79100, 8.99950],
      [38.78900, 8.99800],
      [38.78700, 8.99650],
      [38.78520, 8.99560],
    ],
  },
  {
    id: "gerji_2", from: "gerji", to: "megenagna",
    name: "Gerji-Megenagna", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.80620, 9.01050],
      [38.80550, 9.01200],
      [38.80450, 9.01400],
      [38.80350, 9.01550],
      [38.80250, 9.01700],
      [38.80150, 9.01850],
      [38.80050, 9.01980],
      [38.80020, 9.02080],
    ],
  },
  {
    id: "gerji_2r", from: "megenagna", to: "gerji",
    name: "Megenagna-Gerji Return", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.80020, 9.02080],
      [38.80050, 9.01980],
      [38.80150, 9.01850],
      [38.80250, 9.01700],
      [38.80350, 9.01550],
      [38.80450, 9.01400],
      [38.80550, 9.01200],
      [38.80620, 9.01050],
    ],
  },

  // ═══════════════════════════════════════
  // BOLE ROAD → TOTAL → ATLAS → MEGENAGNA (via Bole sub-road)
  // ═══════════════════════════════════════
  {
    id: "total_1", from: "bole_brass", to: "total",
    name: "Bole-Total", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.77380, 9.00420],
      [38.77600, 9.00550],
      [38.77850, 9.00650],
      [38.78100, 9.00750],
      [38.78400, 9.00850],
      [38.78700, 9.00950],
      [38.79100, 9.01050],
    ],
  },
  {
    id: "total_1r", from: "total", to: "bole_brass",
    name: "Total-Bole Return", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.79100, 9.01050],
      [38.78700, 9.00950],
      [38.78400, 9.00850],
      [38.78100, 9.00750],
      [38.77850, 9.00650],
      [38.77600, 9.00550],
      [38.77380, 9.00420],
    ],
  },
  {
    id: "total_2", from: "total", to: "atlas",
    name: "Total-Atlas", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.79100, 9.01050],
      [38.79200, 9.01150],
      [38.79300, 9.01300],
      [38.79400, 9.01450],
      [38.79500, 9.01580],
    ],
  },
  {
    id: "total_2r", from: "atlas", to: "total",
    name: "Atlas-Total Return", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.79500, 9.01580],
      [38.79400, 9.01450],
      [38.79300, 9.01300],
      [38.79200, 9.01150],
      [38.79100, 9.01050],
    ],
  },
  {
    id: "atlas_meg", from: "atlas", to: "megenagna",
    name: "Atlas-Megenagna", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.79500, 9.01580],
      [38.79600, 9.01650],
      [38.79700, 9.01750],
      [38.79800, 9.01850],
      [38.79900, 9.01950],
      [38.80020, 9.02080],
    ],
  },
  {
    id: "atlas_megr", from: "megenagna", to: "atlas",
    name: "Megenagna-Atlas Return", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.80020, 9.02080],
      [38.79900, 9.01950],
      [38.79800, 9.01850],
      [38.79700, 9.01750],
      [38.79600, 9.01650],
      [38.79500, 9.01580],
    ],
  },

  // ═══════════════════════════════════════
  // SOUTHERN CORRIDOR (Sarbet → Saris → Kality)
  // ═══════════════════════════════════════
  {
    id: "south_1", from: "meskel_sq", to: "hayahulet",
    name: "Meskel-Hayahulet", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.76150, 9.01080],
      [38.76000, 9.01020],
      [38.75800, 9.00950],
      [38.75600, 9.00880],
      [38.75400, 9.00820],
      [38.75200, 9.00750],
      [38.74750, 9.00680],
    ],
  },
  {
    id: "south_1r", from: "hayahulet", to: "meskel_sq",
    name: "Hayahulet-Meskel Return", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.74750, 9.00680],
      [38.75200, 9.00750],
      [38.75400, 9.00820],
      [38.75600, 9.00880],
      [38.75800, 9.00950],
      [38.76000, 9.01020],
      [38.76150, 9.01080],
    ],
  },
  {
    id: "south_2", from: "hayahulet", to: "gotera",
    name: "Hayahulet-Gotera", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.74750, 9.00680],
      [38.74650, 9.00550],
      [38.74550, 9.00400],
      [38.74500, 9.00200],
      [38.74450, 9.00000],
      [38.74450, 9.99750],
    ],
  },
  {
    id: "south_2r", from: "gotera", to: "hayahulet",
    name: "Gotera-Hayahulet Return", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.74450, 8.99750],
      [38.74450, 9.00000],
      [38.74500, 9.00200],
      [38.74550, 9.00400],
      [38.74650, 9.00550],
      [38.74750, 9.00680],
    ],
  },
  {
    id: "south_3", from: "sarbet", to: "saris",
    name: "Sarbet-Saris", speedLimit: 50, lanes: 2,
    waypoints: [
      [38.75680, 8.98950],
      [38.75600, 8.98800],
      [38.75500, 8.98600],
      [38.75400, 8.98400],
      [38.75350, 8.98200],
      [38.75300, 8.98000],
      [38.75250, 8.97800],
      [38.75250, 8.96800],
    ],
  },
  {
    id: "south_3r", from: "saris", to: "sarbet",
    name: "Saris-Sarbet Return", speedLimit: 50, lanes: 2,
    waypoints: [
      [38.75250, 8.96800],
      [38.75250, 8.97800],
      [38.75300, 8.98000],
      [38.75350, 8.98200],
      [38.75400, 8.98400],
      [38.75500, 8.98600],
      [38.75600, 8.98800],
      [38.75680, 8.98950],
    ],
  },
  {
    id: "south_4", from: "saris", to: "kality",
    name: "Saris-Kality", speedLimit: 60, lanes: 3,
    waypoints: [
      [38.75250, 8.96800],
      [38.75350, 8.96600],
      [38.75500, 8.96400],
      [38.75600, 8.96200],
      [38.75700, 8.96000],
      [38.75800, 8.95800],
      [38.75900, 8.95500],
      [38.75980, 8.95150],
    ],
  },
  {
    id: "south_4r", from: "kality", to: "saris",
    name: "Kality-Saris Return", speedLimit: 60, lanes: 3,
    waypoints: [
      [38.75980, 8.95150],
      [38.75900, 8.95500],
      [38.75800, 8.95800],
      [38.75700, 8.96000],
      [38.75600, 8.96200],
      [38.75500, 8.96400],
      [38.75350, 8.96600],
      [38.75250, 8.96800],
    ],
  },

  // ═══════════════════════════════════════
  // WESTERN CORRIDOR (Lideta → Merkato → Torhailoch → Jemo)
  // ═══════════════════════════════════════
  {
    id: "west_1", from: "lideta", to: "teklehaimanot",
    name: "Lideta-Teklehaimanot", speedLimit: 30, lanes: 2,
    waypoints: [
      [38.73750, 9.01980],
      [38.73800, 9.02100],
      [38.73850, 9.02250],
      [38.73850, 9.02400],
      [38.73850, 9.02550],
      [38.73850, 9.02700],
      [38.73950, 9.02850],
    ],
  },
  {
    id: "west_1r", from: "teklehaimanot", to: "lideta",
    name: "Teklehaimanot-Lideta Return", speedLimit: 30, lanes: 2,
    waypoints: [
      [38.73950, 9.02850],
      [38.73850, 9.02700],
      [38.73850, 9.02550],
      [38.73850, 9.02400],
      [38.73850, 9.02250],
      [38.73800, 9.02100],
      [38.73750, 9.01980],
    ],
  },
  {
    id: "west_2", from: "teklehaimanot", to: "merkato",
    name: "Teklehaimanot-Merkato", speedLimit: 30, lanes: 2,
    waypoints: [
      [38.73950, 9.02850],
      [38.73850, 9.02900],
      [38.73750, 9.02950],
      [38.73650, 9.02980],
      [38.73550, 9.03000],
      [38.73500, 9.03000],
    ],
  },
  {
    id: "west_2r", from: "merkato", to: "teklehaimanot",
    name: "Merkato-Teklehaimanot Return", speedLimit: 30, lanes: 2,
    waypoints: [
      [38.73500, 9.03000],
      [38.73550, 9.03000],
      [38.73650, 9.02980],
      [38.73750, 9.02950],
      [38.73850, 9.02900],
      [38.73950, 9.02850],
    ],
  },
  {
    id: "west_3", from: "merkato", to: "torhailoch",
    name: "Merkato-Torhailoch", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.73500, 9.03000],
      [38.73350, 9.02950],
      [38.73150, 9.02850],
      [38.72950, 9.02750],
      [38.72700, 9.02600],
      [38.72450, 9.02450],
      [38.72250, 9.02300],
      [38.72050, 9.02200],
    ],
  },
  {
    id: "west_3r", from: "torhailoch", to: "merkato",
    name: "Torhailoch-Merkato Return", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.72050, 9.02200],
      [38.72250, 9.02300],
      [38.72450, 9.02450],
      [38.72700, 9.02600],
      [38.72950, 9.02750],
      [38.73150, 9.02850],
      [38.73350, 9.02950],
      [38.73500, 9.03000],
    ],
  },
  {
    id: "west_4", from: "torhailoch", to: "jemo",
    name: "Torhailoch-Jemo", speedLimit: 50, lanes: 2,
    waypoints: [
      [38.72050, 9.02200],
      [38.72050, 9.02050],
      [38.72050, 9.01850],
      [38.72050, 9.01600],
      [38.72050, 9.01350],
      [38.72050, 9.01050],
      [38.72050, 9.00750],
      [38.72050, 9.00400],
      [38.72050, 9.00000],
      [38.72050, 8.99500],
      [38.72050, 8.98500],
      [38.72050, 8.97680],
    ],
  },
  {
    id: "west_4r", from: "jemo", to: "torhailoch",
    name: "Jemo-Torhailoch Return", speedLimit: 50, lanes: 2,
    waypoints: [
      [38.72050, 8.97680],
      [38.72050, 8.98500],
      [38.72050, 8.99500],
      [38.72050, 9.00000],
      [38.72050, 9.00400],
      [38.72050, 9.00750],
      [38.72050, 9.01050],
      [38.72050, 9.01350],
      [38.72050, 9.01600],
      [38.72050, 9.01850],
      [38.72050, 9.02050],
      [38.72050, 9.02200],
    ],
  },

  // ═══════════════════════════════════════
  // PIAZZA → AUTOBUS TERA → MERKATO
  // ═══════════════════════════════════════
  {
    id: "piazza_auto", from: "piazza", to: "autobus",
    name: "Piazza-Autobus Tera", speedLimit: 30, lanes: 2,
    waypoints: [
      [38.74680, 9.03100],
      [38.74600, 9.03050],
      [38.74500, 9.02950],
      [38.74400, 9.02800],
      [38.74350, 9.02650],
      [38.74300, 9.02500],
      [38.74250, 9.02450],
    ],
  },
  {
    id: "piazza_autor", from: "autobus", to: "piazza",
    name: "Autobus Tera-Piazza Return", speedLimit: 30, lanes: 2,
    waypoints: [
      [38.74250, 9.02450],
      [38.74300, 9.02500],
      [38.74350, 9.02650],
      [38.74400, 9.02800],
      [38.74500, 9.02950],
      [38.74600, 9.03050],
      [38.74680, 9.03100],
    ],
  },
  {
    id: "auto_mkt", from: "autobus", to: "merkato",
    name: "Autobus-Merkato", speedLimit: 30, lanes: 2,
    waypoints: [
      [38.74250, 9.02450],
      [38.74100, 9.02500],
      [38.73950, 9.02600],
      [38.73800, 9.02750],
      [38.73650, 9.02850],
      [38.73500, 9.03000],
    ],
  },
  {
    id: "auto_mktr", from: "merkato", to: "autobus",
    name: "Merkato-Autobus Return", speedLimit: 30, lanes: 2,
    waypoints: [
      [38.73500, 9.03000],
      [38.73650, 9.02850],
      [38.73800, 9.02750],
      [38.73950, 9.02600],
      [38.74100, 9.02500],
      [38.74250, 9.02450],
    ],
  },

  // ═══════════════════════════════════════
  // KOTEBE
  // ═══════════════════════════════════════
  {
    id: "kotebe_1", from: "megenagna", to: "kotebe",
    name: "Megenagna-Kotebe", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.80020, 9.02080],
      [38.79900, 9.02200],
      [38.79750, 9.02400],
      [38.79600, 9.02600],
      [38.79450, 9.02800],
      [38.79300, 9.03000],
      [38.79150, 9.03300],
      [38.79100, 9.03600],
      [38.79050, 9.04050],
    ],
  },
  {
    id: "kotebe_1r", from: "kotebe", to: "megenagna",
    name: "Kotebe-Megenagna Return", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.79050, 9.04050],
      [38.79100, 9.03600],
      [38.79150, 9.03300],
      [38.79300, 9.03000],
      [38.79450, 9.02800],
      [38.79600, 9.02600],
      [38.79750, 9.02400],
      [38.79900, 9.02200],
      [38.80020, 9.02080],
    ],
  },

  // ═══════════════════════════════════════
  // FILWOHA → IMPERIAL (north inner link)
  // ═══════════════════════════════════════
  {
    id: "filwoha_1", from: "churchill_mid", to: "filwoha",
    name: "Churchill-Filwoha", speedLimit: 35, lanes: 2,
    waypoints: [
      [38.75250, 9.02350],
      [38.75300, 9.02400],
      [38.75350, 9.02480],
      [38.75400, 9.02550],
      [38.75500, 9.02600],
      [38.75550, 9.02650],
    ],
  },
  {
    id: "filwoha_1r", from: "filwoha", to: "churchill_mid",
    name: "Filwoha-Churchill Return", speedLimit: 35, lanes: 2,
    waypoints: [
      [38.75550, 9.02650],
      [38.75500, 9.02600],
      [38.75400, 9.02550],
      [38.75350, 9.02480],
      [38.75300, 9.02400],
      [38.75250, 9.02350],
    ],
  },

  // ═══════════════════════════════════════
  // BOLE BULBULA → SARBET
  // ═══════════════════════════════════════
  {
    id: "bulbula_1", from: "bole_med", to: "bole_bulbula",
    name: "Bole Med-Bulbula", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.78520, 8.99560],
      [38.78400, 8.99400],
      [38.78250, 8.99200],
      [38.78100, 8.99000],
      [38.77900, 8.98800],
      [38.77700, 8.98400],
      [38.77550, 8.98000],
      [38.77450, 8.97200],
    ],
  },
  {
    id: "bulbula_1r", from: "bole_bulbula", to: "bole_med",
    name: "Bulbula-Bole Med Return", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.77450, 8.97200],
      [38.77550, 8.98000],
      [38.77700, 8.98400],
      [38.77900, 8.98800],
      [38.78100, 8.99000],
      [38.78250, 8.99200],
      [38.78400, 8.99400],
      [38.78520, 8.99560],
    ],
  },
  {
    id: "sarbet_bole", from: "sarbet", to: "bole_med",
    name: "Sarbet-Bole Med", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.75680, 8.98950],
      [38.75900, 8.99000],
      [38.76100, 8.99050],
      [38.76350, 8.99100],
      [38.76600, 8.99150],
      [38.76850, 8.99200],
      [38.77100, 8.99250],
      [38.77400, 8.99300],
      [38.77700, 8.99350],
      [38.78000, 8.99400],
      [38.78250, 8.99450],
      [38.78520, 8.99560],
    ],
  },
  {
    id: "sarbet_boler", from: "bole_med", to: "sarbet",
    name: "Bole Med-Sarbet Return", speedLimit: 40, lanes: 2,
    waypoints: [
      [38.78520, 8.99560],
      [38.78250, 8.99450],
      [38.78000, 8.99400],
      [38.77700, 8.99350],
      [38.77400, 8.99300],
      [38.77100, 8.99250],
      [38.76850, 8.99200],
      [38.76600, 8.99150],
      [38.76350, 8.99100],
      [38.76100, 8.99050],
      [38.75900, 8.99000],
      [38.75680, 8.98950],
    ],
  },
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
