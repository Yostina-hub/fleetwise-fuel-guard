/**
 * Sidebar RBAC Access Configuration
 *
 * Maps each navigation path to the roles allowed to see it.
 * If a path is NOT listed here, it defaults to visible for all authenticated users.
 * Super admins always see everything (handled at filter level).
 *
 * Roles: super_admin, org_admin, fleet_manager, operator, technician, driver, viewer, auditor
 */

// Roles that manage fleet assets
const FLEET_ROLES = ["org_admin", "fleet_manager", "operations_manager", "operator"] as const;
// Roles that manage drivers
const DRIVER_MGMT_ROLES = ["org_admin", "fleet_manager", "operations_manager"] as const;
// Roles that manage operations
const OPS_ROLES = ["org_admin", "fleet_manager", "operations_manager", "operator"] as const;
// Roles that can view reports
const REPORT_ROLES = ["org_admin", "fleet_manager", "operations_manager", "operator", "auditor"] as const;
// Maintenance roles
const MAINT_ROLES = ["org_admin", "fleet_manager", "operations_manager", "technician"] as const;
// Safety / compliance roles
const SAFETY_ROLES = ["org_admin", "fleet_manager", "operations_manager", "operator"] as const;

/**
 * Path-to-roles map. Key = exact path (without query string).
 * Value = array of roles that may access this path.
 * Paths not listed are accessible to ALL authenticated users.
 */
export const PATH_ROLE_ACCESS: Record<string, string[]> = {
  // ── Quick Access — open to all ──
  "/":          [], // empty = everyone
  "/map":       [],
  "/vehicles":  [],

  // ── Fleet Management ──
  "/fleet":            [...FLEET_ROLES],
  "/devices":          [...FLEET_ROLES],
  "/hardware-sensors": [...FLEET_ROLES],
  "/rfid-pairing":     [...FLEET_ROLES],
  "/rental-vehicles":  [...FLEET_ROLES],

  // ── Driver Management ──
  "/driver-management":  [...DRIVER_MGMT_ROLES],
  "/drivers":            [...DRIVER_MGMT_ROLES, "operator"],
  "/driver-scoring":     [...DRIVER_MGMT_ROLES],
  "/driver-compliance":  [...DRIVER_MGMT_ROLES],
  "/driver-safety":      [...DRIVER_MGMT_ROLES],
  "/driver-performance": [...DRIVER_MGMT_ROLES],
  "/driver-hr":          ["org_admin"],

  // ── Trip / Operations ──
  "/trip-management":  [...OPS_ROLES, "driver"],
  "/fleet-scheduling": [...OPS_ROLES],
  "/dispatch":         [...OPS_ROLES],
  // Vehicle Requests admin queue: NOT for driver-only users — drivers
  // see their assigned trips on /driver-portal instead.
  "/vehicle-requests": [...OPS_ROLES, "fleet_owner", "auditor", "dispatcher"],
  // Pool Supervisors workspace — allocate vehicle + driver from the pool.
  "/pool-supervisors": [...OPS_ROLES, "fleet_owner", "fleet_supervisor", "dispatcher"],

  // ── Routes & Locations ──
  "/routes":          [...OPS_ROLES],
  "/route-history":   [...OPS_ROLES, "driver"],
  "/geofencing":      [...FLEET_ROLES],
  "/passenger-tracking": [...OPS_ROLES],

  // ── Fuel & Energy ──
  "/fuel":                [...FLEET_ROLES, "driver"],
  "/fuel-requests":       [...FLEET_ROLES, "driver"],
  "/fuel-card-providers": ["org_admin", "fleet_manager"],
  "/ev-management":       [...FLEET_ROLES],
  "/carbon-emissions":    ["org_admin", "fleet_manager", "auditor"],

  // ── Safety & Compliance ──
  "/speed-governor":       [...SAFETY_ROLES],
  "/incidents":            [...SAFETY_ROLES, "driver"],
  "/accident-insurance":   ["org_admin", "fleet_manager"],
  "/roadside-assistance":  [...SAFETY_ROLES, "driver"],
  "/driver-logbook":       [...SAFETY_ROLES, "driver"],
  "/alcohol-fatigue":      [...SAFETY_ROLES],
  "/vehicle-inspections":  [...SAFETY_ROLES, "technician"],
  "/penalties-fines":      [...SAFETY_ROLES],
  "/compliance-calendar":  [...SAFETY_ROLES, "auditor"],

  // ── Dash Cam / ADAS ──
  "/dash-cam":      [...SAFETY_ROLES],
  "/adas-reports":  [...SAFETY_ROLES],

  // ── Cold Chain ──
  "/cold-chain": [...FLEET_ROLES],

  // ── Maintenance ──
  "/maintenance":            [...MAINT_ROLES],
  "/work-orders":            [...MAINT_ROLES],
  "/maintenance-enterprise": [...MAINT_ROLES],
  "/driver-maintenance-request": [...MAINT_ROLES, "driver"],
  "/driver-portal":              [...MAINT_ROLES, "driver", "fleet_owner", "operations_manager"],
  "/predictive-maintenance": [...MAINT_ROLES],
  "/tire-management":        [...MAINT_ROLES],
  "/parts-inventory":        [...MAINT_ROLES],
  "/vendor-management":      ["org_admin", "fleet_manager"],

  // ── Alerts & Notifications — open to all ──
  "/alerts":              [],
  "/notification-center": [],

  // ── Reports & Analytics ──
  "/reports":                 [...REPORT_ROLES],
  "/kpi-scorecards":          [...REPORT_ROLES],
  "/dashboard-builder":       ["org_admin", "fleet_manager"],
  "/performance-simulation":  ["org_admin", "fleet_manager"],

  // ── Documents ──
  "/document-management": ["org_admin", "fleet_manager", "auditor"],
  "/contract-management": ["org_admin"],

  // ── Driver self-service ──
  "/my-license": [], // open to all authenticated; the page handles non-drivers gracefully

  // ── Requester Portal (basic 'user' role + admins/managers can preview) ──
  "/my-requests": ["user", "org_admin", "fleet_manager", "operations_manager"],

  // ── Tools & Automation ──
  "/workflow-builder":   ["org_admin"],
  "/forms":              ["org_admin", "fleet_manager"],
  "/delegation-matrix":  ["org_admin"],
  "/bulk-operations":    ["org_admin", "fleet_manager"],

  // ── Settings ──
  "/settings": ["org_admin", "fleet_manager"],

  // ── Admin items ──
  "/organizations":            [], // filtered by isSuperAdmin in SidebarNav
  "/users":                    [], // filtered by isSuperAdmin/isOrgAdmin
  "/security":                 [],
  "/security-dashboard":       [],
  "/integrations":             [],
  "/config":                   [],
  "/administration":           [],
  "/system-architecture":      [],
  "/infrastructure-monitoring":[],
  "/operations-console":       [],
  "/licensing-compliance":     [],
};

/**
 * Check if a path is accessible to the given roles.
 * @returns true if user can see this item
 */
/**
 * Paths a basic 'user' (Requester) is allowed to see.
 * Anything outside this allow-list is hidden, even if the path defaults to "all".
 * Keeps the requester portal minimal and prevents accidental exposure of fleet/admin tooling.
 */
const BASIC_USER_ALLOWED_PATHS = new Set<string>([
  "/my-requests",
  "/my-license",
  "/notification-center",
  "/alerts",
]);

export function isPathAccessible(path: string, userRoles: string[]): boolean {
  // Super admin sees everything
  if (userRoles.includes("super_admin")) return true;

  // Strip query string for lookup
  const basePath = path.split("?")[0] || path;
  // Remove trailing slash (except root)
  const normalized = basePath.length > 1 && basePath.endsWith("/")
    ? basePath.slice(0, -1)
    : basePath;

  // Basic 'user' role (Requester) — strict allow-list only.
  // Only applies when the user has NO elevated role.
  const elevatedRoles = [
    "super_admin", "org_admin", "fleet_manager", "operations_manager",
    "operator", "technician", "driver", "auditor", "viewer",
    "finance_manager", "sourcing_manager", "insurance_admin",
    "fleet_owner", "mechanic", "dispatcher",
  ];
  const isBasicUserOnly =
    userRoles.includes("user") && !userRoles.some((r) => elevatedRoles.includes(r));
  if (isBasicUserOnly) {
    return BASIC_USER_ALLOWED_PATHS.has(normalized);
  }

  const allowedRoles = PATH_ROLE_ACCESS[normalized];

  // Not in map → visible to all (non-basic-user) authenticated users
  if (allowedRoles === undefined) return true;
  // Empty array → visible to all (non-basic-user) authenticated users
  if (allowedRoles.length === 0) return true;

  return userRoles.some((r) => allowedRoles.includes(r));
}
