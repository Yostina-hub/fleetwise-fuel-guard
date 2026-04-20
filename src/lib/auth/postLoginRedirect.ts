/**
 * Post-login routing helper.
 *
 * Drivers should land on the Driver Portal (their limited workspace) instead
 * of the executive Dashboard. All other roles continue to "/" as before.
 *
 * `roles` comes from the `user_roles` table via `useAuthContext`.
 */
export type RoleRow = { role: string };

const DRIVER_LANDING = "/driver-portal";
const DEFAULT_LANDING = "/";

/**
 * A user is treated as "driver-only" when they carry the `driver` role
 * and no elevated staff/admin role. This prevents bouncing super_admins or
 * fleet managers (who may also drive occasionally) away from the dashboard.
 */
const ELEVATED_ROLES = new Set([
  "super_admin",
  "org_admin",
  "fleet_owner",
  "operations_manager",
  "fleet_manager",
  "dispatcher",
  "fuel_controller",
  "maintenance_lead",
  "maintenance_manager",
  "maintenance_supervisor",
  "sourcing_manager",
  "finance_manager",
  "auditor",
  "transport_authority",
  "insurance_admin",
]);

export function isDriverOnly(roles: RoleRow[] | undefined | null): boolean {
  if (!roles || roles.length === 0) return false;
  const names = roles.map((r) => r.role);
  const hasDriver = names.includes("driver");
  if (!hasDriver) return false;
  return !names.some((r) => ELEVATED_ROLES.has(r));
}

export function getPostLoginPath(roles: RoleRow[] | undefined | null): string {
  return isDriverOnly(roles) ? DRIVER_LANDING : DEFAULT_LANDING;
}
