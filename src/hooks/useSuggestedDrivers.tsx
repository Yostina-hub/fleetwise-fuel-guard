/**
 * useSuggestedDrivers
 * -------------------
 * Returns a ranked list of drivers suggested for a vehicle request.
 *
 * Ranking strategy (never filters by pool — only ranks, so supervisors can
 * cross-pool):
 *   1. License match for the requested vehicle category (HARD by default).
 *   2. Drivers whose `assigned_vehicle.specific_pool` matches the request pool.
 *   3. Drivers whose `assigned_pool` matches the request pool.
 *   4. Active, free drivers (status = 'active', not on a trip).
 *   5. Fallback: all active drivers in the org.
 *
 * Drivers currently `on_trip` are de-prioritised but still returned so the
 * supervisor can see them (with a busy badge).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  evaluateDriverLicense,
  type LicenseClass,
  type LicenseEvaluation,
} from "@/lib/driverLicenseMatching";

export interface SuggestedDriver {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  status: string | null;
  pool: string | null;
  /** Vehicle this driver is permanently assigned to (vehicles.assigned_driver_id reverse). */
  assigned_vehicle_id: string | null;
  assigned_vehicle_plate: string | null;
  assigned_vehicle_pool: string | null;
  /** Active trip this driver is currently on (vehicle_requests). */
  active_trip_id: string | null;
  active_trip_status: string | null;
  in_pool: boolean;
  is_busy: boolean;
  is_top_pick: boolean;
  /** Human availability summary. */
  availability: "available" | "on_trip" | "off_duty" | "suspended" | "inactive";
  /** Raw license fields, copied from drivers table. */
  license_class: string | null;
  license_expiry: string | null;
  license_verified: boolean | null;
  /** Computed license suitability for the target vehicle (null when no
   *  vehicle context was supplied). */
  license: LicenseEvaluation | null;
}

interface VehicleContext {
  vehicle_category?: string | null;
  vehicle_type?: string | null;
  seating_capacity?: number | null;
}

interface Args {
  organizationId?: string | null;
  poolName?: string | null;
  /** Vehicle to evaluate licence suitability against. When omitted, the
   *  hook still returns drivers but skips the licence check. */
  vehicle?: VehicleContext | null;
  /** Explicit override (e.g. request.required_license_classes). */
  requiredLicenseClasses?: LicenseClass[] | null;
  /** When true, drivers without a matching/valid license are excluded. */
  strictLicense?: boolean;
  enabled?: boolean;
}

export const useSuggestedDrivers = ({
  organizationId,
  poolName,
  vehicle,
  requiredLicenseClasses,
  strictLicense = false,
  enabled = true,
}: Args) => {
  return useQuery({
    queryKey: [
      "suggested-drivers",
      organizationId,
      poolName,
      vehicle?.vehicle_category ?? null,
      vehicle?.vehicle_type ?? null,
      vehicle?.seating_capacity ?? null,
      requiredLicenseClasses?.join(",") ?? null,
      strictLicense,
    ],
    enabled: enabled && !!organizationId,
    staleTime: 30_000,
    queryFn: async (): Promise<SuggestedDriver[]> => {
      const { data: drivers, error } = await (supabase as any)
        .from("drivers")
        .select(
          "id, first_name, last_name, phone, status, assigned_pool, license_class, license_expiry, license_verified",
        )
        .eq("organization_id", organizationId!)
        .order("first_name")
        .limit(500);
      if (error) throw error;
      const list = (drivers || []) as any[];
      if (list.length === 0) return [];

      // Resolve which vehicle each driver is permanently assigned to.
      const driverIds = list.map((d) => d.id);
      const { data: vehicles } = await (supabase as any)
        .from("vehicles")
        .select("id, plate_number, specific_pool, assigned_driver_id")
        .in("assigned_driver_id", driverIds);
      const driverVehicleMap = new Map<
        string,
        { vehicleId: string; plate: string | null; pool: string | null }
      >();
      (vehicles || []).forEach((v: any) => {
        if (v.assigned_driver_id) {
          driverVehicleMap.set(v.assigned_driver_id, {
            vehicleId: v.id,
            plate: v.plate_number || null,
            pool: v.specific_pool || null,
          });
        }
      });

      // Active trips per driver — so the picker can show "On trip VR-XXX".
      const { data: activeTrips } = await (supabase as any)
        .from("vehicle_requests")
        .select("id, assigned_driver_id, status")
        .eq("organization_id", organizationId!)
        .in("status", ["assigned", "in_progress", "checked_out"])
        .in("assigned_driver_id", driverIds);
      const tripByDriver = new Map<string, { id: string; status: string }>();
      (activeTrips || []).forEach((t: any) => {
        if (t.assigned_driver_id) {
          tripByDriver.set(t.assigned_driver_id, { id: t.id, status: t.status });
        }
      });

      const scored: SuggestedDriver[] = list.map((d) => {
        const veh = driverVehicleMap.get(d.id);
        const driverPool = d.assigned_pool || null;
        const inPool =
          !!poolName &&
          ((veh?.pool && veh.pool === poolName) ||
            (driverPool && driverPool === poolName));
        const trip = tripByDriver.get(d.id);
        let availability: SuggestedDriver["availability"] = "available";
        if (d.status === "suspended") availability = "suspended";
        else if (d.status === "off_duty") availability = "off_duty";
        else if (d.status && d.status !== "active") availability = "inactive";
        else if (trip || d.status === "on_trip") availability = "on_trip";
        const isBusy = availability !== "available";

        const license = vehicle
          ? evaluateDriverLicense(
              {
                license_class: d.license_class,
                license_expiry: d.license_expiry,
                license_verified: d.license_verified,
              },
              vehicle,
              requiredLicenseClasses ?? null,
            )
          : null;

        return {
          id: d.id,
          first_name: d.first_name,
          last_name: d.last_name,
          phone: d.phone,
          status: d.status,
          pool: driverPool,
          assigned_vehicle_id: veh?.vehicleId || null,
          assigned_vehicle_plate: veh?.plate || null,
          assigned_vehicle_pool: veh?.pool || null,
          active_trip_id: trip?.id || null,
          active_trip_status: trip?.status || null,
          in_pool: !!inPool,
          is_busy: isBusy,
          is_top_pick: false,
          availability,
          license_class: d.license_class ?? null,
          license_expiry: d.license_expiry ?? null,
          license_verified: d.license_verified ?? null,
          license,
        };
      });

      // License hard-filter (only meaningful when we have a vehicle context).
      const filtered = (strictLicense && vehicle)
        ? scored.filter((d) => d.license?.matches && !d.license.expired)
        : scored;

      // Sort:
      //   1. license: matches+valid > matches+warning > mismatch
      //   2. availability
      //   3. in-pool
      //   4. has assigned vehicle
      //   5. name
      const availabilityRank: Record<string, number> = {
        available: 0,
        on_trip: 1,
        off_duty: 2,
        suspended: 3,
        inactive: 4,
      };
      const licenseRank = (l: LicenseEvaluation | null): number => {
        if (!l) return 1; // unknown — neutral
        if (l.expired || !l.matches) return 3;
        if (l.unverified || l.expiresSoon) return 1;
        return 0;
      };
      filtered.sort((a, b) => {
        const la = licenseRank(a.license);
        const lb = licenseRank(b.license);
        if (la !== lb) return la - lb;
        const ra = availabilityRank[a.availability] ?? 9;
        const rb = availabilityRank[b.availability] ?? 9;
        if (ra !== rb) return ra - rb;
        if (a.in_pool !== b.in_pool) return a.in_pool ? -1 : 1;
        if (!!a.assigned_vehicle_id !== !!b.assigned_vehicle_id) {
          return a.assigned_vehicle_id ? -1 : 1;
        }
        return (a.first_name || "").localeCompare(b.first_name || "");
      });

      // Top pick = first available driver whose licence (if evaluated) matches.
      const topAvailable = filtered.find(
        (d) =>
          d.availability === "available" &&
          (!d.license || (d.license.matches && !d.license.expired)),
      );
      if (topAvailable) topAvailable.is_top_pick = true;
      return filtered;
    },
  });
};
