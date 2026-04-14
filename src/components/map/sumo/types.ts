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
  from: string;
  to: string;
  name: string;
  speedLimit: number;
  lanes: number;
  waypoints: [number, number][];
  length?: number;
}

export type VehicleType = 'sedan' | 'minibus' | 'bus' | 'truck' | 'suv';

// IoT Device information attached to each simulated vehicle
export interface SimDeviceInfo {
  imei: string;
  trackerModel: string;
  simIccid: string;
  firmwareVersion: string;
  status: 'online' | 'offline' | 'degraded';
  lastHeartbeat: string;
  signalStrength: number;     // 0-100
  satelliteCount: number;     // 3-14
  hdop: number;               // GPS accuracy 0.5-5.0
  fixType: '2D' | '3D' | 'DGPS';
  batteryVoltage: number;     // device battery 3.2-4.2V
  externalPower: boolean;
  reportingInterval: number;  // seconds
}

// Driver info attached to vehicle
export interface SimDriverInfo {
  name: string;
  phone: string;
  licenseNumber: string;
  status: 'on_duty' | 'off_duty' | 'break';
}

export interface SimVehicle {
  id: string;
  type: VehicleType;
  plate: string;
  segmentId: string;
  segmentProgress: number;
  speed: number;
  maxSpeed: number;
  acceleration: number;
  lat: number;
  lng: number;
  heading: number;
  fuel: number;
  status: 'moving' | 'idle' | 'stopped';
  routeSegments: string[];
  routeIndex: number;
  color: string;
  // IoT device telemetry
  device: SimDeviceInfo;
  driver: SimDriverInfo;
  // Extended telemetry
  odometer: number;           // km
  engineTemp: number;         // celsius
  rpm: number;
  ignitionOn: boolean;
  doorOpen: boolean;
  seatbeltOn: boolean;
  // Make/model for display
  make: string;
  model: string;
  year: number;
}

export interface TrafficSignal {
  nodeId: string;
  phase: 'green' | 'amber' | 'red';
  greenDuration: number;
  amberDuration: number;
  redDuration: number;
  elapsed: number;
}

export interface SimulationState {
  vehicles: SimVehicle[];
  signals: TrafficSignal[];
  time: number;
  running: boolean;
  speed: number;
  vehicleCount: number;
}
