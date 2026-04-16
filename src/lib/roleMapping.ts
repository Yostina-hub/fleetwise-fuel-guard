import type { EmployeeType } from "@/hooks/useEmployees";

/**
 * Maps an HR employee_type to the default RBAC role used in user_roles.
 * Used when auto-provisioning login accounts for drivers/employees so that
 * the right portal/permissions activate immediately.
 */
export const EMPLOYEE_TYPE_TO_ROLE: Record<EmployeeType, string> = {
  driver: "driver",
  mechanic: "mechanic",
  technician: "technician",
  dispatcher: "dispatcher",
  manager: "fleet_manager",
  coordinator: "operations_manager",
  office_staff: "viewer",
  other: "viewer",
};

export const getDefaultRoleForEmployeeType = (type: EmployeeType | string | null | undefined): string => {
  if (!type) return "viewer";
  return EMPLOYEE_TYPE_TO_ROLE[type as EmployeeType] ?? "viewer";
};

export const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  org_admin: "Org Admin",
  fleet_owner: "Fleet Owner",
  operations_manager: "Ops Manager",
  fleet_manager: "Fleet Manager",
  dispatcher: "Dispatcher",
  fuel_controller: "Fuel Controller",
  maintenance_lead: "Maintenance Lead",
  operator: "Operator",
  driver: "Driver",
  technician: "Technician",
  mechanic: "Mechanic",
  auditor: "Auditor",
  viewer: "Viewer",
};

export const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-destructive/15 text-destructive border-destructive/30",
  org_admin: "bg-primary/15 text-primary border-primary/30",
  fleet_owner: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  operations_manager: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  fleet_manager: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  dispatcher: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  fuel_controller: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  maintenance_lead: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  operator: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  driver: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  technician: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  mechanic: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  auditor: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  viewer: "bg-muted text-muted-foreground border-border",
};
