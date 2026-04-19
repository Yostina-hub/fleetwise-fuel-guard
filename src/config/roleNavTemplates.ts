/**
 * Role-Specific Sidebar Templates
 *
 * Single-purpose roles (driver, technician, auditor) get a curated, focused
 * sidebar instead of a filtered version of the full admin tree. This avoids
 * sparse single-item groups, duplicate entries, and confusing "management"
 * labels for users who don't manage anything.
 *
 * Returns null for roles that should keep the default (filtered) full tree.
 */
import {
  LayoutDashboard,
  Map,
  CalendarClock,
  MapPinned,
  Fuel,
  Wrench,
  ShieldCheck,
  BookOpen,
  Phone,
  Bell,
  FileText,
  Calendar,
  ClipboardList,
  Package,
  BarChart3,
  Users,
  Truck,
  Camera,
  IdCard,
} from "lucide-react";
import type { NavItem } from "@/components/sidebar/SidebarNav";

type T = (key: string, fallback?: any) => string;

/** Driver: focused on their own trips, fuel, vehicle issues, and safety. */
const driverNav = (t: T): NavItem[] => [
  // Pinned
  { icon: LayoutDashboard, label: t("nav.driverPortal", "Driver Portal"), path: "/driver-portal" },
  { icon: Map, label: t("nav.liveTracking", "Live Map"), path: "/map" },

  // My Work
  {
    icon: CalendarClock,
    label: t("nav.myWork", "My Work"),
    subItems: [
      { label: t("nav.myTrips", "My Trips"), path: "/trip-management" },
      { label: t("nav.routeHistory", "Route History"), path: "/route-history" },
      { label: t("nav.driverLogbook", "Logbook"), path: "/driver-logbook" },
    ],
  },

  // Fuel
  {
    icon: Fuel,
    label: t("nav.fuel", "Fuel"),
    subItems: [
      { label: t("nav.fuelRequests", "Fuel Requests"), path: "/fuel-requests" },
      { label: t("nav.consumption", "Consumption"), path: "/fuel" },
    ],
  },

  // Vehicle Issues
  {
    icon: Wrench,
    label: t("nav.vehicleIssues", "Vehicle Issues"),
    subItems: [
      { label: t("nav.requestMaintenance", "Request Maintenance"), path: "/driver-maintenance-request" },
      { label: t("nav.roadsideAssistance", "Roadside Assistance"), path: "/roadside-assistance" },
    ],
  },

  // Safety
  {
    icon: ShieldCheck,
    label: t("nav.safety", "Safety"),
    subItems: [
      { label: t("nav.incidents", "Report Incident"), path: "/incidents" },
    ],
  },

  // My License & Permits
  { icon: IdCard, label: t("nav.myLicense", "My License & Permits"), path: "/my-license" },

  // Alerts
  { icon: Bell, label: t("nav.alerts", "Alerts"), path: "/alerts" },
  { icon: Bell, label: t("nav.notifications", "Notifications"), path: "/notification-center" },
];

/** Technician: focused on work orders, inspections, parts. */
const technicianNav = (t: T): NavItem[] => [
  // Pinned
  { icon: LayoutDashboard, label: t("nav.dashboard", "Dashboard"), path: "/" },
  { icon: Truck, label: t("nav.vehicles", "Vehicles"), path: "/vehicles" },

  // Workshop
  {
    icon: Wrench,
    label: t("nav.workshop", "Workshop"),
    subItems: [
      { label: t("nav.workOrders", "Work Orders"), path: "/work-orders" },
      { label: t("nav.serviceHistory", "Service History"), path: "/maintenance" },
      { label: t("nav.predictiveAI", "Predictive AI"), path: "/predictive-maintenance" },
    ],
  },

  // Inspections
  {
    icon: ClipboardList,
    label: t("nav.inspections", "Inspections"),
    path: "/vehicle-inspections",
  },

  // Inventory
  {
    icon: Package,
    label: t("nav.inventory", "Inventory"),
    subItems: [
      { label: t("nav.partsInventory", "Parts"), path: "/parts-inventory" },
      { label: t("nav.tireManagement", "Tires"), path: "/tire-management" },
    ],
  },

  // Alerts
  { icon: Bell, label: t("nav.alerts", "Alerts"), path: "/alerts" },
  { icon: Bell, label: t("nav.notifications", "Notifications"), path: "/notification-center" },
];

/** Auditor: read-only compliance, reports, documents. */
const auditorNav = (t: T): NavItem[] => [
  // Pinned
  { icon: LayoutDashboard, label: t("nav.dashboard", "Dashboard"), path: "/" },
  { icon: Map, label: t("nav.liveTracking", "Live Map"), path: "/map" },

  // Compliance
  {
    icon: ShieldCheck,
    label: t("nav.compliance", "Compliance"),
    subItems: [
      { label: t("nav.complianceCalendar", "Compliance Calendar"), path: "/compliance-calendar" },
      { label: t("nav.carbonEmissions", "Carbon Emissions"), path: "/carbon-emissions" },
    ],
  },

  // Reports
  {
    icon: BarChart3,
    label: t("nav.reportsKPIs", "Reports & KPIs"),
    subItems: [
      { label: t("nav.reports", "Reports"), path: "/reports" },
      { label: t("nav.kpiScorecards", "KPI Scorecards"), path: "/kpi-scorecards" },
    ],
  },

  // Documents
  {
    icon: FileText,
    label: t("nav.documents", "Documents"),
    path: "/document-management",
  },

  // Alerts
  { icon: Bell, label: t("nav.alerts", "Alerts"), path: "/alerts" },
  { icon: Bell, label: t("nav.notifications", "Notifications"), path: "/notification-center" },
];

/**
 * Returns a curated nav tree if the user is *exclusively* a single-purpose role
 * (driver, technician, or auditor). Returns null otherwise so the default
 * filtered full tree is used.
 *
 * "Exclusively" means the user has no elevated roles like super_admin,
 * org_admin, fleet_manager, operator, operations_manager, fleet_owner, or
 * maintenance_lead — so a driver who is also a fleet_manager keeps the full UI.
 */
const ELEVATED_ROLES = new Set([
  "super_admin",
  "org_admin",
  "fleet_manager",
  "operator",
  "operations_manager",
  "fleet_owner",
  "maintenance_lead",
]);

export function getRoleSpecificNav(
  userRoles: string[],
  t: T,
): NavItem[] | null {
  if (!userRoles || userRoles.length === 0) return null;
  // If user has any elevated role, use the full filtered tree.
  if (userRoles.some((r) => ELEVATED_ROLES.has(r))) return null;

  if (userRoles.includes("driver")) return driverNav(t);
  if (userRoles.includes("technician")) return technicianNav(t);
  if (userRoles.includes("auditor")) return auditorNav(t);

  return null;
}
