// Single source of truth for the application's RBAC roles, mirroring the DB
// `app_role` enum. Used by the Workflow Builder, Inbox, and SOP engine so
// every "who can do this step" picker stays consistent across the app.
//
// Order = recommended display order in dropdowns (most-privileged → operational).

export type AppRole =
  | "super_admin"
  | "org_admin"
  | "fleet_owner"
  | "fleet_manager"
  | "operations_manager"
  | "maintenance_lead"
  | "fuel_controller"
  | "dispatcher"
  | "auditor"
  | "operator"
  | "technician"
  | "mechanic"
  | "driver"
  | "transport_authority"
  | "insurance_admin"
  | "finance_manager"
  | "sourcing_manager"
  | "maintenance_manager"
  | "maintenance_supervisor"
  | "inspection_center"
  | "viewer";

export interface RoleMeta {
  value: AppRole;
  label: string;
  group: "Administration" | "Management" | "Operations" | "Field" | "Read-only";
  description?: string;
}

export const APP_ROLES: RoleMeta[] = [
  // Administration
  { value: "super_admin",        label: "Super Admin",         group: "Administration", description: "Full platform access" },
  { value: "org_admin",          label: "Organization Admin",  group: "Administration", description: "Tenant-level admin" },
  { value: "fleet_owner",        label: "Fleet Owner",         group: "Administration", description: "Owner of the fleet" },

  // Management
  { value: "fleet_manager",      label: "Fleet Manager",       group: "Management",     description: "Manages fleet operations" },
  { value: "operations_manager", label: "Operations Manager",  group: "Management",     description: "Day-to-day operations lead" },
  { value: "maintenance_lead",   label: "Maintenance Lead",    group: "Management",     description: "Workshop / maintenance manager" },
  { value: "fuel_controller",    label: "Fuel Controller",     group: "Management",     description: "Fuel approvals & monitoring" },
  { value: "auditor",            label: "Auditor",             group: "Management",     description: "Read + audit trails" },
  { value: "transport_authority",label: "Transport Authority", group: "Management",     description: "Vehicle registration / Bolo authority" },
  { value: "insurance_admin",    label: "Insurance Admin",     group: "Management",     description: "Insurance policies & renewals" },
  { value: "finance_manager",    label: "Finance Manager",     group: "Management",     description: "Approves & disburses payments" },
  { value: "sourcing_manager",   label: "Sourcing Manager",    group: "Management",     description: "Procurement & supplier management" },
  { value: "maintenance_manager",label: "Maintenance Manager", group: "Management",     description: "Workshop / fleet maintenance manager" },
  { value: "maintenance_supervisor", label: "Maintenance Supervisor", group: "Management", description: "Supervises maintenance jobs" },
  { value: "inspection_center",  label: "Inspection Center",   group: "Operations",     description: "Annual / roadworthy inspection center" },

  // Operations
  { value: "dispatcher",         label: "Dispatcher",          group: "Operations",     description: "Trip & vehicle dispatch" },
  { value: "operator",           label: "Operator",            group: "Operations",     description: "Operational user" },

  // Field
  { value: "technician",         label: "Technician",          group: "Field",          description: "Field technician" },
  { value: "mechanic",           label: "Mechanic",            group: "Field",          description: "Workshop mechanic" },
  { value: "driver",             label: "Driver",              group: "Field",          description: "Vehicle driver" },

  // Read-only
  { value: "viewer",             label: "Viewer",              group: "Read-only",      description: "Read-only access" },
];

/** Group → roles, in the canonical display order. */
export const ROLES_BY_GROUP = APP_ROLES.reduce<Record<string, RoleMeta[]>>((acc, r) => {
  (acc[r.group] ||= []).push(r);
  return acc;
}, {});

export function roleLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return APP_ROLES.find((r) => r.value === value)?.label ?? value;
}

/** Authority Matrix scopes — must match `authority_matrix.scope` values. */
export const AUTHORITY_SCOPES = [
  { value: "vehicle_request",    label: "Vehicle Request" },
  { value: "fuel_request",       label: "Fuel Request" },
  { value: "work_order",         label: "Work Order" },
  { value: "trip",               label: "Trip / Dispatch" },
  { value: "maintenance",        label: "Maintenance" },
  { value: "maintenance_request", label: "Maintenance Request" },
  { value: "fleet_inspection",   label: "Fleet Inspection" },
  { value: "fleet_transfer",     label: "Vehicle Transfer" },
  { value: "vehicle_handover",   label: "Vehicle Handover" },
  { value: "tire_request",       label: "Tire Request" },
  { value: "driver_allowance",   label: "Driver Allowance" },
  { value: "outsource_rental",   label: "Outsource Rental" },
] as const;

export type AuthorityScope = (typeof AUTHORITY_SCOPES)[number]["value"];
