import type { SimVehicle, SimulationState, VehicleType, TrafficSignal } from "./types";
import { SEGMENTS, NODES, getOutgoingSegments } from "./AddisAbabaNetwork";

const VEHICLE_COLORS: Record<VehicleType, string> = {
  sedan: "#22c55e",
  minibus: "#eab308",
  bus: "#3b82f6",
  truck: "#f97316",
  suv: "#8b5cf6",
};

const VEHICLE_TYPES: VehicleType[] = ["sedan", "sedan", "sedan", "minibus", "minibus", "bus", "truck", "suv"];

const PLATES_PREFIX = ["AA", "OR", "ET", "DR", "SN", "TG", "AM"];

function randomPlate(): string {
  const pfx = PLATES_PREFIX[Math.floor(Math.random() * PLATES_PREFIX.length)];
  const num = Math.floor(Math.random() * 9000 + 1000);
  const sfx = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return `${pfx}-${num}-${sfx}`;
}

function interpolateAlongWaypoints(
  waypoints: [number, number][],
  progress: number
): { lng: number; lat: number; heading: number } {
  if (waypoints.length < 2) return { lng: waypoints[0][0], lat: waypoints[0][1], heading: 0 };

  // Compute cumulative distances
  const dists: number[] = [0];
  for (let i = 1; i < waypoints.length; i++) {
    const dx = waypoints[i][0] - waypoints[i - 1][0];
    const dy = waypoints[i][1] - waypoints[i - 1][1];
    dists.push(dists[i - 1] + Math.sqrt(dx * dx + dy * dy));
  }
  const totalDist = dists[dists.length - 1];
  const targetDist = progress * totalDist;

  for (let i = 1; i < dists.length; i++) {
    if (targetDist <= dists[i]) {
      const segDist = dists[i] - dists[i - 1];
      const t = segDist > 0 ? (targetDist - dists[i - 1]) / segDist : 0;
      const lng = waypoints[i - 1][0] + t * (waypoints[i][0] - waypoints[i - 1][0]);
      const lat = waypoints[i - 1][1] + t * (waypoints[i][1] - waypoints[i - 1][1]);
      const heading =
        (Math.atan2(
          waypoints[i][0] - waypoints[i - 1][0],
          waypoints[i][1] - waypoints[i - 1][1]
        ) *
          180) /
        Math.PI;
      return { lng, lat, heading: (heading + 360) % 360 };
    }
  }

  const last = waypoints[waypoints.length - 1];
  return { lng: last[0], lat: last[1], heading: 0 };
}

function createVehicle(id: number): SimVehicle {
  const type = VEHICLE_TYPES[Math.floor(Math.random() * VEHICLE_TYPES.length)];
  const seg = SEGMENTS[Math.floor(Math.random() * SEGMENTS.length)];
  const progress = Math.random();
  const pos = interpolateAlongWaypoints(seg.waypoints, progress);
  const maxSpeed = type === "truck" ? 40 : type === "bus" ? 45 : type === "minibus" ? 50 : 60;

  return {
    id: `sumo_v_${id}`,
    type,
    plate: randomPlate(),
    segmentId: seg.id,
    segmentProgress: progress,
    speed: Math.random() * Math.min(maxSpeed, seg.speedLimit),
    maxSpeed,
    acceleration: 0,
    lat: pos.lat,
    lng: pos.lng,
    heading: pos.heading,
    fuel: 40 + Math.random() * 55,
    status: "moving",
    routeSegments: [seg.id],
    routeIndex: 0,
    color: VEHICLE_COLORS[type],
  };
}

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
  return {
    vehicles,
    signals: createSignals(),
    time: 0,
    running: true,
    speed: 1,
    vehicleCount,
  };
}

export function stepSimulation(state: SimulationState, dtReal: number): SimulationState {
  if (!state.running) return state;
  const dt = dtReal * state.speed; // simulation seconds

  // Update signals
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

  // Signal lookup by nodeId
  const signalMap = new Map(signals.map(s => [s.nodeId, s]));

  // Update vehicles
  const vehicles = state.vehicles.map(v => {
    const seg = SEGMENTS.find(s => s.id === v.segmentId);
    if (!seg || !seg.length) return v;

    // Check if approaching a signal-controlled intersection (end of segment)
    const endNode = NODES.find(n => n.id === seg.to);
    const signal = endNode ? signalMap.get(endNode.id) : undefined;
    const nearEnd = v.segmentProgress > 0.85;

    let targetSpeed = Math.min(v.maxSpeed, seg.speedLimit);

    // Slow down / stop at red/amber signals
    if (signal && nearEnd) {
      if (signal.phase === "red") targetSpeed = 0;
      else if (signal.phase === "amber") targetSpeed = Math.min(targetSpeed, 10);
    }

    // Simple car-following: acceleration towards target
    const speedDiff = targetSpeed - v.speed;
    const accel = speedDiff > 0
      ? Math.min(2.5, speedDiff) // accelerate gently
      : Math.max(-4.5, speedDiff); // brake harder

    let newSpeed = Math.max(0, v.speed + accel * dt);

    // Advance along segment
    const distMeters = (newSpeed / 3.6) * dt; // km/h to m/s
    let newProgress = v.segmentProgress + distMeters / seg.length;
    let newSegmentId = v.segmentId;
    let newRouteSegments = v.routeSegments;
    let newRouteIndex = v.routeIndex;

    // Handle segment completion
    if (newProgress >= 1) {
      // Pick next segment from outgoing edges
      const outgoing = getOutgoingSegments(seg.to);
      if (outgoing.length > 0) {
        const nextSeg = outgoing[Math.floor(Math.random() * outgoing.length)];
        newSegmentId = nextSeg.id;
        newProgress = newProgress - 1; // carry over
        newRouteSegments = [...v.routeSegments.slice(-5), nextSeg.id];
        newRouteIndex++;
      } else {
        // Dead end - teleport to random segment
        const randSeg = SEGMENTS[Math.floor(Math.random() * SEGMENTS.length)];
        newSegmentId = randSeg.id;
        newProgress = 0;
        newRouteSegments = [randSeg.id];
        newRouteIndex = 0;
      }
    }

    const activeSeg = SEGMENTS.find(s => s.id === newSegmentId) || seg;
    const pos = interpolateAlongWaypoints(activeSeg.waypoints, Math.min(newProgress, 0.999));

    const status: SimVehicle["status"] = newSpeed < 0.5 ? "stopped" : newSpeed < 5 ? "idle" : "moving";

    return {
      ...v,
      segmentId: newSegmentId,
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
    };
  });

  // Adjust vehicle count if needed
  let adjustedVehicles = vehicles;
  if (vehicles.length < state.vehicleCount) {
    for (let i = vehicles.length; i < state.vehicleCount; i++) {
      adjustedVehicles.push(createVehicle(i + state.time * 1000));
    }
  } else if (vehicles.length > state.vehicleCount) {
    adjustedVehicles = vehicles.slice(0, state.vehicleCount);
  }

  return {
    ...state,
    vehicles: adjustedVehicles,
    signals,
    time: state.time + dt,
  };
}
