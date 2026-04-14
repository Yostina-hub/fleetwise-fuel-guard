// SUMO Simulation Types

export interface RoadNode {
  id: string;
  lat: number;
  lng: number;
  name?: string;
  signalControlled?: boolean;
}

export interface RoadSegment {
  id: string;
  from: string; // node id
  to: string;   // node id
  name: string;
  speedLimit: number; // km/h
  lanes: number;
  waypoints: [number, number][]; // [lng, lat] polyline
  length?: number; // meters, computed
}

export type VehicleType = 'sedan' | 'minibus' | 'bus' | 'truck' | 'suv';

export interface SimVehicle {
  id: string;
  type: VehicleType;
  plate: string;
  segmentId: string;
  segmentProgress: number; // 0-1 along segment
  speed: number;           // km/h
  maxSpeed: number;
  acceleration: number;    // m/s²
  lat: number;
  lng: number;
  heading: number;         // degrees
  fuel: number;            // percent
  status: 'moving' | 'idle' | 'stopped';
  routeSegments: string[]; // sequence of segment ids
  routeIndex: number;
  color: string;
}

export interface TrafficSignal {
  nodeId: string;
  phase: 'green' | 'amber' | 'red';
  greenDuration: number;   // seconds
  amberDuration: number;
  redDuration: number;
  elapsed: number;
}

export interface SimulationState {
  vehicles: SimVehicle[];
  signals: TrafficSignal[];
  time: number;          // simulation seconds elapsed
  running: boolean;
  speed: number;         // multiplier
  vehicleCount: number;
}
