import type { SimVehicle, SimulationState, VehicleType, TrafficSignal, SimDeviceInfo, SimDriverInfo } from "./types";
import { SEGMENTS, NODES } from "./AddisAbabaNetwork";
import { SUMO_VEHICLE_TYPES, selectWeightedRoute, selectRouteFromNode } from "./SumoRoutes";

// ── Realistic Ethiopian plates ──
const PLATES_PREFIX = ["AA", "OR", "ET", "DR", "SN", "TG", "AM"];
function randomPlate(): string {
  const pfx = PLATES_PREFIX[Math.floor(Math.random() * PLATES_PREFIX.length)];
  const num = Math.floor(Math.random() * 9000 + 1000);
  const sfx = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return `${pfx}-${num}-${sfx}`;
}

// ── Vehicle make/model combos ──
const VEHICLE_MAKES: Record<VehicleType, { make: string; model: string; year: number }[]> = {
  sedan: [
    { make: "Toyota", model: "Corolla", year: 2021 },
    { make: "Toyota", model: "Yaris", year: 2022 },
    { make: "Hyundai", model: "Elantra", year: 2020 },
    { make: "Suzuki", model: "Dzire", year: 2023 },
    { make: "Volkswagen", model: "Jetta", year: 2019 },
  ],
  minibus: [
    { make: "Toyota", model: "HiAce", year: 2020 },
    { make: "Hyundai", model: "H-100", year: 2021 },
    { make: "Nissan", model: "Urvan", year: 2019 },
  ],
  bus: [
    { make: "Yutong", model: "ZK6122H", year: 2022 },
    { make: "King Long", model: "XMQ6127", year: 2021 },
    { make: "Zhongtong", model: "LCK6129", year: 2023 },
  ],
  truck: [
    { make: "Sinotruk", model: "HOWO", year: 2020 },
    { make: "Isuzu", model: "FTR", year: 2021 },
    { make: "FAW", model: "J6P", year: 2022 },
  ],
  suv: [
    { make: "Toyota", model: "Land Cruiser", year: 2022 },
    { make: "Toyota", model: "Hilux", year: 2023 },
    { make: "Mitsubishi", model: "Pajero", year: 2021 },
  ],
};

// ── Tracker device models ──
const TRACKER_MODELS = [
  "Teltonika FMB920", "Teltonika FMB140", "Queclink GV310LAU",
  "Coban GPS103", "Ruptela FM-Tco4", "YTWL CA100F",
  "Concox GT06N", "Meitrack T366G",
];

// ── Ethiopian driver names ──
const FIRST_NAMES = [
  "Abebe", "Dawit", "Yohannes", "Solomon", "Girma", "Tesfaye",
  "Mulugeta", "Bekele", "Haile", "Kidane", "Tadesse", "Mengistu",
  "Amanuel", "Bereket", "Dereje", "Fikru", "Getachew", "Henok",
];
const LAST_NAMES = [
  "Kebede", "Tadesse", "Hailu", "Wolde", "Gebre", "Tessema",
  "Mekonnen", "Lemma", "Desta", "Assefa", "Negash", "Alemu",
  "Worku", "Bekele", "Demissie", "Biruk", "Teshome", "Abera",
];

// ── Generator helpers ──
function randomIMEI(): string {
  let imei = "35";
  for (let i = 0; i < 13; i++) imei += Math.floor(Math.random() * 10);
  return imei;
}

function randomICCID(): string {
  let iccid = "8925";
  for (let i = 0; i < 16; i++) iccid += Math.floor(Math.random() * 10);
  return iccid;
}

function randomPhone(): string {
  return `+2519${Math.floor(Math.random() * 90000000 + 10000000)}`;
}

function randomLicense(): string {
  const region = PLATES_PREFIX[Math.floor(Math.random() * PLATES_PREFIX.length)];
  return `${region}-DL-${Math.floor(Math.random() * 900000 + 100000)}`;
}

function createDeviceInfo(): SimDeviceInfo {
  return {
    imei: randomIMEI(),
    trackerModel: TRACKER_MODELS[Math.floor(Math.random() * TRACKER_MODELS.length)],
    simIccid: randomICCID(),
    firmwareVersion: `v${Math.floor(Math.random() * 3 + 1)}.${Math.floor(Math.random() * 9)}.${Math.floor(Math.random() * 20)}`,
    status: "online",
    lastHeartbeat: new Date().toISOString(),
    signalStrength: 60 + Math.floor(Math.random() * 40),
    satelliteCount: 6 + Math.floor(Math.random() * 8),
    hdop: +(0.6 + Math.random() * 2).toFixed(1),
    fixType: Math.random() > 0.2 ? "3D" : "2D",
    batteryVoltage: +(3.5 + Math.random() * 0.7).toFixed(2),
    externalPower: Math.random() > 0.1,
    reportingInterval: [10, 15, 30, 60][Math.floor(Math.random() * 4)],
  };
}

function createDriverInfo(): SimDriverInfo {
  return {
    name: `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`,
    phone: randomPhone(),
    licenseNumber: randomLicense(),
    status: "on_duty",
  };
}

const EARTH_RADIUS_METERS = 6371000;
const waypointMetricsCache = new WeakMap<[number, number][], { cumulative: number[]; total: number }>();

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function distanceBetweenWaypointsMeters(a: [number, number], b: [number, number]): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const haversine =
    sinLat * sinLat +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * sinLng * sinLng;

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function calculateBearing(a: [number, number], b: [number, number]): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);
  const dLng = toRadians(lng2 - lng1);

  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function getWaypointMetrics(waypoints: [number, number][]): { cumulative: number[]; total: number } {
  const cached = waypointMetricsCache.get(waypoints);
  if (cached) return cached;

  const cumulative: number[] = [0];
  for (let i = 1; i < waypoints.length; i++) {
    cumulative.push(cumulative[i - 1] + distanceBetweenWaypointsMeters(waypoints[i - 1], waypoints[i]));
  }

  const metrics = {
    cumulative,
    total: cumulative[cumulative.length - 1] ?? 0,
  };

  waypointMetricsCache.set(waypoints, metrics);
  return metrics;
}

function getSegmentLengthMeters(segment: typeof SEGMENTS[number]): number {
  const geometricLength = getWaypointMetrics(segment.waypoints).total;
  return geometricLength > 0 ? geometricLength : Math.max(segment.length ?? 1, 1);
}

// ── Interpolation along polyline using real geometry distances ──
function interpolateAlongWaypoints(
  waypoints: [number, number][],
  progress: number
): { lng: number; lat: number; heading: number } {
  if (waypoints.length === 0) return { lng: 0, lat: 0, heading: 0 };
  if (waypoints.length === 1) return { lng: waypoints[0][0], lat: waypoints[0][1], heading: 0 };

  const { cumulative, total } = getWaypointMetrics(waypoints);
  if (total <= 0) {
    return {
      lng: waypoints[0][0],
      lat: waypoints[0][1],
      heading: calculateBearing(waypoints[0], waypoints[waypoints.length - 1]),
    };
  }

  const clampedProgress = Math.max(0, Math.min(progress, 0.999999));
  const targetDist = clampedProgress * total;

  for (let i = 1; i < cumulative.length; i++) {
    if (targetDist <= cumulative[i]) {
      const segDist = cumulative[i] - cumulative[i - 1];
      const t = segDist > 0 ? (targetDist - cumulative[i - 1]) / segDist : 0;
      const lng = waypoints[i - 1][0] + t * (waypoints[i][0] - waypoints[i - 1][0]);
      const lat = waypoints[i - 1][1] + t * (waypoints[i][1] - waypoints[i - 1][1]);
      return {
        lng,
        lat,
        heading: calculateBearing(waypoints[i - 1], waypoints[i]),
      };
    }
  }

  const last = waypoints[waypoints.length - 1];
  return {
    lng: last[0],
    lat: last[1],
    heading: calculateBearing(waypoints[waypoints.length - 2], last),
  };
}

// ── Segment lookup cache ──
const segmentById = new Map(SEGMENTS.map(s => [s.id, s]));

function getSegment(id: string) {
  return segmentById.get(id);
}

function getReverseSegmentId(segmentId: string): string {
  return segmentId.endsWith("_r") ? segmentId.slice(0, -2) : `${segmentId}_r`;
}

function buildReturnRoute(routeSegments: string[]): string[] {
  return [...routeSegments]
    .reverse()
    .map(getReverseSegmentId)
    .filter((segmentId) => segmentById.has(segmentId));
}

function resolveNextSegment(
  currentSegment: typeof SEGMENTS[number],
  routeSegments: string[],
  routeIndex: number,
  vehicleType: VehicleType
): {
  nextSegment: typeof SEGMENTS[number];
  nextRouteSegments: string[];
  nextRouteIndex: number;
} | null {
  const nextRouteIdx = routeIndex + 1;
  if (nextRouteIdx < routeSegments.length) {
    const nextSegment = getSegment(routeSegments[nextRouteIdx]);
    if (nextSegment && nextSegment.from === currentSegment.to) {
      return {
        nextSegment,
        nextRouteSegments: routeSegments,
        nextRouteIndex: nextRouteIdx,
      };
    }
    return null;
  }

  const destinationNode = currentSegment.to;
  const nextRoute = selectRouteFromNode(destinationNode, vehicleType);
  const nextRouteFirstSegment = nextRoute ? getSegment(nextRoute.segments[0]) : undefined;
  if (nextRoute && nextRouteFirstSegment && nextRouteFirstSegment.from === destinationNode) {
    return {
      nextSegment: nextRouteFirstSegment,
      nextRouteSegments: [...nextRoute.segments],
      nextRouteIndex: 0,
    };
  }

  const returnRoute = buildReturnRoute(routeSegments);
  const returnSegment = returnRoute[0] ? getSegment(returnRoute[0]) : undefined;
  if (returnSegment && returnSegment.from === destinationNode) {
    return {
      nextSegment: returnSegment,
      nextRouteSegments: returnRoute,
      nextRouteIndex: 0,
    };
  }

  return null;
}

// ── Vehicle factory — now uses predefined SUMO routes ──
function createVehicle(id: number): SimVehicle {
  const route = selectWeightedRoute();
  const type = route.vehicleTypes[Math.floor(Math.random() * route.vehicleTypes.length)] as VehicleType;
  const vType = SUMO_VEHICLE_TYPES[type];

  const firstSegId = route.segments[0];
  const seg = getSegment(firstSegId);
  if (!seg) {
    const fallbackSeg = SEGMENTS[Math.floor(Math.random() * SEGMENTS.length)];
    return createVehicleFallback(id, fallbackSeg, type);
  }

  const progress = Math.random() * 0.8;
  const pos = interpolateAlongWaypoints(seg.waypoints, progress);
  const makeInfo = VEHICLE_MAKES[type][Math.floor(Math.random() * VEHICLE_MAKES[type].length)];

  return {
    id: `sumo_v_${id}`,
    type,
    plate: randomPlate(),
    segmentId: firstSegId,
    segmentProgress: progress,
    speed: Math.random() * Math.min(vType.maxSpeed, seg.speedLimit) * 0.8,
    maxSpeed: vType.maxSpeed,
    acceleration: 0,
    lat: pos.lat,
    lng: pos.lng,
    heading: pos.heading,
    fuel: 40 + Math.random() * 55,
    status: "moving",
    routeSegments: [...route.segments],
    routeIndex: 0,
    color: vType.color,
    device: createDeviceInfo(),
    driver: createDriverInfo(),
    odometer: Math.floor(10000 + Math.random() * 150000),
    engineTemp: 75 + Math.random() * 20,
    rpm: 800 + Math.floor(Math.random() * 2500),
    ignitionOn: true,
    doorOpen: false,
    seatbeltOn: Math.random() > 0.15,
    make: makeInfo.make,
    model: makeInfo.model,
    year: makeInfo.year,
    currentRoadName: seg.name,
  };
}

function createVehicleFallback(id: number, seg: typeof SEGMENTS[0], type: VehicleType): SimVehicle {
  const vType = SUMO_VEHICLE_TYPES[type];
  const progress = Math.random();
  const pos = interpolateAlongWaypoints(seg.waypoints, progress);
  const makeInfo = VEHICLE_MAKES[type][Math.floor(Math.random() * VEHICLE_MAKES[type].length)];

  return {
    id: `sumo_v_${id}`,
    type,
    plate: randomPlate(),
    segmentId: seg.id,
    segmentProgress: progress,
    speed: Math.random() * Math.min(vType.maxSpeed, seg.speedLimit),
    maxSpeed: vType.maxSpeed,
    acceleration: 0,
    lat: pos.lat,
    lng: pos.lng,
    heading: pos.heading,
    fuel: 40 + Math.random() * 55,
    status: "moving",
    routeSegments: [seg.id],
    routeIndex: 0,
    color: vType.color,
    device: createDeviceInfo(),
    driver: createDriverInfo(),
    odometer: Math.floor(10000 + Math.random() * 150000),
    engineTemp: 75 + Math.random() * 20,
    rpm: 800 + Math.floor(Math.random() * 2500),
    ignitionOn: true,
    doorOpen: false,
    seatbeltOn: Math.random() > 0.15,
    make: makeInfo.make,
    model: makeInfo.model,
    year: makeInfo.year,
    currentRoadName: seg.name,
  };
}

// ── Signal factory ──
function createSignals(): TrafficSignal[] {
  return NODES.filter(n => n.signalControlled).map(n => ({
    nodeId: n.id,
    phase: (["green", "amber", "red"] as const)[Math.floor(Math.random() * 3)],
    greenDuration: 25 + Math.random() * 15,
    amberDuration: 4,
    redDuration: 20 + Math.random() * 15,
    elapsed: Math.random() * 20,
  }));
}

export function createInitialState(vehicleCount: number): SimulationState {
  const vehicles: SimVehicle[] = [];
  for (let i = 0; i < vehicleCount; i++) {
    vehicles.push(createVehicle(i));
  }
  return { vehicles, signals: createSignals(), time: 0, running: true, speed: 1, vehicleCount };
}

// ── Simulation step — vehicles follow their route plan ──
export function stepSimulation(state: SimulationState, dtReal: number): SimulationState {
  if (!state.running) return state;
  const dt = dtReal * state.speed;

  const signals = state.signals.map(sig => {
    let { phase, elapsed, greenDuration, amberDuration, redDuration } = sig;
    elapsed += dt;
    const totalCycle = greenDuration + amberDuration + redDuration;
    const cyclePos = elapsed % totalCycle;
    if (cyclePos < greenDuration) phase = "green";
    else if (cyclePos < greenDuration + amberDuration) phase = "amber";
    else phase = "red";
    return { ...sig, phase, elapsed };
  });

  const signalMap = new Map(signals.map(s => [s.nodeId, s]));

  const vehicles = state.vehicles.map(v => {
    const seg = getSegment(v.segmentId);
    if (!seg) return v;

    const endNode = NODES.find(n => n.id === seg.to);
    const signal = endNode ? signalMap.get(endNode.id) : undefined;
    const nearEnd = v.segmentProgress > 0.85;

    const vType = SUMO_VEHICLE_TYPES[v.type] || SUMO_VEHICLE_TYPES.sedan;
    let targetSpeed = Math.min(vType.maxSpeed, seg.speedLimit);
    targetSpeed *= 1 - vType.sigma * 0.1 * (Math.random() - 0.3);

    if (signal && nearEnd) {
      if (signal.phase === "red") targetSpeed = 0;
      else if (signal.phase === "amber") targetSpeed = Math.min(targetSpeed, 10);
    }

    const speedDiff = targetSpeed - v.speed;
    const accel = speedDiff > 0
      ? Math.min(vType.accel, speedDiff)
      : Math.max(-vType.decel, speedDiff);
    let newSpeed = Math.max(0, v.speed + accel * dt);

    const distMeters = (newSpeed / 3.6) * dt;
    let activeSeg = seg;
    let newProgress = Math.max(0, Math.min(v.segmentProgress, 0.999));
    let newRouteSegments = v.routeSegments;
    let newRouteIndex = v.routeIndex;
    let newRoadName = activeSeg.name;
    let remainingDistance = distMeters;
    let routeBlocked = false;

    while (remainingDistance > 0) {
      const activeSegmentLength = getSegmentLengthMeters(activeSeg);
      if (activeSegmentLength <= 0) break;

      const remainingOnSegment = Math.max(0, (1 - newProgress) * activeSegmentLength);

      if (remainingDistance < remainingOnSegment) {
        newProgress += remainingDistance / activeSegmentLength;
        remainingDistance = 0;
        break;
      }

      remainingDistance = Math.max(0, remainingDistance - remainingOnSegment);

      const nextState = resolveNextSegment(activeSeg, newRouteSegments, newRouteIndex, v.type);
      if (!nextState) {
        newProgress = 0.999;
        newSpeed = 0;
        newRoadName = activeSeg.name;
        routeBlocked = true;
        break;
      }

      activeSeg = nextState.nextSegment;
      newRouteSegments = nextState.nextRouteSegments;
      newRouteIndex = nextState.nextRouteIndex;
      newRoadName = activeSeg.name;
      newProgress = 0;

      if (remainingDistance <= 0.01) {
        remainingDistance = 0;
        break;
      }
    }

    const pos = interpolateAlongWaypoints(activeSeg.waypoints, Math.min(newProgress, 0.999));
    const status: SimVehicle["status"] = newSpeed < 0.5 ? "stopped" : newSpeed < 5 ? "idle" : "moving";

    const newRpm = newSpeed < 1 ? 750 + Math.random() * 100 : 1000 + (newSpeed / 60) * 3000 + (Math.random() - 0.5) * 200;
    const newEngineTemp = Math.min(105, Math.max(70, v.engineTemp + (Math.random() - 0.48) * 0.3));
    const deviceSignal = Math.max(20, Math.min(100, v.device.signalStrength + (Math.random() - 0.5) * 4));
    const satCount = Math.max(3, Math.min(14, v.device.satelliteCount + (Math.random() > 0.9 ? (Math.random() > 0.5 ? 1 : -1) : 0)));

    return {
      ...v,
      segmentId: activeSeg.id,
      segmentProgress: Math.min(newProgress, 0.999),
      speed: Math.round(newSpeed * 10) / 10,
      acceleration: accel,
      lat: pos.lat,
      lng: pos.lng,
      heading: pos.heading,
      fuel: Math.max(0, v.fuel - dt * 0.001 * (newSpeed / 50)),
      status,
      routeSegments: newRouteSegments,
      routeIndex: newRouteIndex,
      currentRoadName: routeBlocked ? v.currentRoadName : newRoadName,
      odometer: v.odometer + distMeters / 1000,
      engineTemp: Math.round(newEngineTemp * 10) / 10,
      rpm: Math.round(newRpm),
      ignitionOn: newSpeed > 0 || status === "idle",
      device: {
        ...v.device,
        signalStrength: Math.round(deviceSignal),
        satelliteCount: satCount,
        lastHeartbeat: new Date().toISOString(),
        status: (deviceSignal < 30 ? "degraded" : "online") as SimDeviceInfo["status"],
        hdop: +(Math.max(0.5, v.device.hdop + (Math.random() - 0.5) * 0.2)).toFixed(1),
      },
    };
  });

  // Gradual spawning/despawning — max 3 vehicles per tick for smooth transitions
  let adjustedVehicles = vehicles;
  const diff = state.vehicleCount - vehicles.length;

  if (diff > 0) {
    const spawnCount = Math.min(diff, 3); // spawn up to 3 per tick
    const newVehicles = [...vehicles];
    for (let i = 0; i < spawnCount; i++) {
      const uid = Math.floor(state.time * 1000) + vehicles.length + i;
      newVehicles.push(createVehicle(uid));
    }
    adjustedVehicles = newVehicles;
  } else if (diff < 0) {
    const removeCount = Math.min(-diff, 3); // remove up to 3 per tick
    adjustedVehicles = vehicles.slice(0, vehicles.length - removeCount);
  }

  return { ...state, vehicles: adjustedVehicles, signals, time: state.time + dt };
}
