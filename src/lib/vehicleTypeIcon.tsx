import {
  Truck,
  Car,
  Bus,
  Bike,
  Tractor,
  Caravan,
  Construction,
  Ambulance,
  Forklift,
  Ship,
  Plane,
  CarFront,
  CarTaxiFront,
  type LucideIcon,
} from "lucide-react";

/**
 * Resolve a Lucide icon for a given `vehicles.vehicle_type` value (or any
 * loose synonyms users may have entered). Always returns a sensible fallback
 * so the UI never breaks for unknown types.
 */
export const getVehicleTypeIcon = (vehicleType?: string | null): LucideIcon => {
  const t = (vehicleType ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!t) return Car;

  // Heavy / commercial trucks
  if (
    t.includes("truck") ||
    t.includes("lorry") ||
    t.includes("trailer") ||
    t.includes("hauler") ||
    t.includes("semi") ||
    t.includes("tipper") ||
    t.includes("dump")
  ) {
    return Truck;
  }

  // Buses / coaches
  if (t.includes("bus") || t.includes("coach") || t.includes("minibus") || t.includes("shuttle")) {
    return Bus;
  }

  // Vans / pickups
  if (t.includes("van") || t.includes("pickup") || t.includes("suv") || t.includes("4x4") || t.includes("crossover")) {
    return CarFront;
  }

  // Two-wheelers
  if (t.includes("motorbike") || t.includes("motorcycle") || t.includes("scooter") || t.includes("bike")) {
    return Bike;
  }

  // Agricultural / heavy equipment
  if (t.includes("tractor") || t.includes("plough")) return Tractor;
  if (t.includes("excavator") || t.includes("loader") || t.includes("bulldozer") || t.includes("crane") || t.includes("construction")) {
    return Construction;
  }
  if (t.includes("forklift")) return Forklift;

  // Caravans / trailers (recreation)
  if (t.includes("caravan") || t.includes("camper") || t.includes("rv")) return Caravan;

  // Emergency
  if (t.includes("ambulance")) return Ambulance;

  // Other modes
  if (t.includes("ship") || t.includes("boat") || t.includes("vessel")) return Ship;
  if (t.includes("plane") || t.includes("aircraft") || t.includes("helicopter")) return Plane;

  // Taxi / cab
  if (t.includes("taxi") || t.includes("cab")) return CarTaxiFront;

  // Default: passenger car / sedan
  return Car;
};
