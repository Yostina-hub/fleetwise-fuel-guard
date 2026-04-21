import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Tables subscribed for **app-wide** auto-refresh. When a row changes here,
 * we walk the TanStack Query cache and invalidate any active query whose key
 * matches one of the configured prefixes — so list views update instantly
 * without each page having to wire its own realtime subscription.
 *
 * NOTE: every table listed here MUST be in the `supabase_realtime`
 * Postgres publication (see migration `enable_realtime_*`).
 */
const TABLE_QUERY_PREFIXES: Record<string, string[]> = {
  // Requests
  vehicle_requests: ["vehicle-requests", "vehicle-requests-panel", "vr-list", "vehicle_requests"],
  vehicle_request_approvals: ["vehicle-request-approvals"],
  vehicle_request_assignments: ["vehicle-request-assignments", "vr-assignments"],
  vehicle_request_stops: ["vehicle-request-stops", "vr-stops"],
  fuel_requests: ["fuel-requests", "fuel_requests"],
  fuel_request_approvals: ["fuel-request-approvals"],
  tire_requests: ["tire-requests"],
  safety_comfort_requests: ["safety-comfort-requests"],
  // Fleet & assets
  vehicles: ["vehicles", "fleet-vehicles", "vehicle"],
  fleet_assets: ["fleet-assets", "assets"],
  vehicle_inspections: ["vehicle-inspections", "inspections"],
  vehicle_insurance: ["vehicle-insurance"],
  generators: ["generators"],
  rental_vehicles: ["rental-vehicles"],
  // Drivers & HR
  drivers: ["drivers", "driver-list"],
  driver_attendance: ["driver-attendance"],
  driver_leave_requests: ["driver-leave-requests"],
  driver_training: ["driver-training"],
  driver_penalties: ["driver-penalties"],
  driver_vehicle_assignments: ["driver-vehicle-assignments"],
  driver_groups: ["driver-groups"],
  mechanics: ["mechanics"],
  employees: ["employees"],
  // Trips & dispatch
  trips: ["trips"],
  trip_assignments: ["trip-assignments"],
  trip_approvals: ["trip-approvals"],
  trip_requests: ["trip-requests"],
  dispatch_jobs: ["dispatch-jobs", "dispatch"],
  routes: ["routes"],
  route_plans: ["route-plans"],
  // Maintenance & work orders
  work_orders: ["work-orders", "work_orders"],
  work_order_operations: ["work-order-operations"],
  work_order_materials: ["work-order-materials"],
  work_order_approvals: ["work-order-approvals"],
  maintenance_schedules: ["maintenance-schedules", "maintenance_schedules"],
  maintenance_tickets: ["maintenance-tickets"],
  maintenance_contracts: ["maintenance-contracts"],
  parts_inventory: ["parts-inventory", "parts"],
  tire_inventory: ["tire-inventory"],
  // Fuel
  fuel_transactions: ["fuel-transactions"],
  fuel_events: ["fuel-events"],
  fuel_work_orders: ["fuel-work-orders"],
  fuel_depots: ["fuel-depots"],
  approved_fuel_stations: ["approved-fuel-stations", "fuel-stations"],
  driver_fuel_cards: ["driver-fuel-cards"],
  // Alerts & incidents
  alerts: ["alerts"],
  alert_rules: ["alert-rules"],
  incidents: ["incidents"],
  accident_claims: ["accident-claims"],
  internal_accident_claims: ["internal-accident-claims"],
  dash_cam_events: ["dashcam-events", "dash-cam-events"],
  geofences: ["geofences", "geofences-location-picker"],
  geofence_events: ["geofence-events"],
  panic_button_events: ["panic-events"],
  sos_alerts: ["sos-alerts"],
  speed_violations: ["speed-violations"],
  // Outsource & vendors
  outsource_contracts: ["outsource-contracts"],
  outsource_payments: ["outsource-payments"],
  outsource_payment_requests: ["outsource-payment-requests"],
  outsource_vehicle_attendance: ["outsource-vehicle-attendance"],
  vendors: ["vendors"],
  contracts: ["contracts"],
  purchase_orders: ["purchase-orders"],
  // Org
  organizations: ["organizations"],
  organization_settings: ["organization-settings"],
  departments: ["departments"],
  depots: ["depots"],
  fleet_pools: ["fleet-pools", "pools"],
  business_units: ["business-units"],
  cost_centers: ["cost-centers"],
  profiles: ["profiles"],
  user_roles: ["user-roles"],
  // Notifications
  notifications: ["notifications"],
  notification_center: ["notification-center"],
  // Sensors
  iot_sensors: ["iot-sensors"],
  sensors: ["sensors"],
  tpms_readings: ["tpms-readings"],
};

/**
 * Mount once near the root of the app (inside QueryClientProvider). Subscribes
 * to Postgres changes for all configured tables and invalidates the matching
 * TanStack query keys so list views refresh automatically.
 */
export function RealtimeQuerySync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const tables = Object.keys(TABLE_QUERY_PREFIXES);
    if (tables.length === 0) return;

    const channel = supabase.channel("global-realtime-query-sync");

    for (const table of tables) {
      channel.on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table },
        () => {
          const prefixes = TABLE_QUERY_PREFIXES[table] || [];
          for (const prefix of prefixes) {
            // Match any active query whose first key segment === prefix.
            queryClient.invalidateQueries({
              predicate: (query) => {
                const key = query.queryKey;
                if (!Array.isArray(key) || key.length === 0) return false;
                return typeof key[0] === "string" && key[0] === prefix;
              },
            });
          }
        }
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return null;
}

export default RealtimeQuerySync;
