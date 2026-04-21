/**
 * routePrefetch
 * -------------
 * Page-to-page navigation lag was caused by lazy-loaded route chunks being
 * fetched only at click time. This registry maps every protected route path
 * to its dynamic `import()` so we can warm the chunk cache *before* the user
 * clicks — typically on `mouseenter`, `focus`, or `touchstart` of a sidebar
 * link. Vite/browsers cache the resulting module, so the actual lazy() inside
 * App.tsx resolves instantly when navigation happens.
 *
 * Usage:
 *   prefetchRoute("/fuel-monitoring");        // explicit
 *   <PrefetchLink to="...">                   // automatic on hover/focus
 *
 * Calling `prefetchRoute` for an unknown path is a no-op. Calling it more
 * than once is also free — the import promise is cached after the first call.
 */
type Importer = () => Promise<unknown>;

// Each entry uses the *same* dynamic import expression as App.tsx so Vite
// emits the exact same chunk and serves it from cache on the second call.
const IMPORTERS: Record<string, Importer> = {
  "/": () => import("@/pages/Dashboard"),
  "/map": () => import("@/pages/MapView"),
  "/vehicles": () => import("@/pages/Vehicles"),
  "/fleet": () => import("@/pages/Fleet"),
  "/driver-scoring": () => import("@/pages/DriverScoring"),
  "/drivers": () => import("@/pages/Drivers"),
  "/driver-management": () => import("@/pages/DriverManagement"),
  "/driver-compliance": () => import("@/pages/DriverCompliance"),
  "/driver-safety": () => import("@/pages/DriverSafety"),
  "/driver-performance": () => import("@/pages/DriverPerformance"),
  "/driver-hr": () => import("@/pages/DriverHR"),
  "/fuel": () => import("@/pages/FuelMonitoring"),
  "/fuel-monitoring": () => import("@/pages/FuelMonitoring"),
  "/incidents": () => import("@/pages/Incidents"),
  "/alerts": () => import("@/pages/Alerts"),
  "/maintenance": () => import("@/pages/Maintenance"),
  "/reports": () => import("@/pages/Reports"),
  "/settings": () => import("@/pages/Settings"),
  "/users": () => import("@/pages/UserManagement"),
  "/rbac": () => import("@/pages/RBACManagement"),
  "/security": () => import("@/pages/Security"),
  "/security-dashboard": () => import("@/pages/SecurityDashboard"),
  "/integrations": () => import("@/pages/Integrations"),
  "/administration": () => import("@/pages/Administration"),
  "/organizations": () => import("@/pages/Organizations"),
  "/routes": () => import("@/pages/Routes"),
  "/route-history": () => import("@/pages/RouteHistory"),
  "/geofencing": () => import("@/pages/Geofencing"),
  "/speed-governor": () => import("@/pages/SpeedGovernor"),
  "/work-orders": () => import("@/pages/WorkOrders"),
  "/fleet-scheduling": () => import("@/pages/FleetScheduling"),
  "/dispatch": () => import("@/pages/Dispatch"),
  "/driver-app": () => import("@/pages/DriverApp"),
  "/config": () => import("@/pages/SystemConfig"),
  "/devices": () => import("@/pages/DeviceIntegration"),
  "/workflow-builder": () => import("@/pages/WorkflowBuilder"),
  "/inbox": () => import("@/pages/Inbox"),
  "/forms": () => import("@/pages/Forms"),
  "/trip-management": () => import("@/pages/TripManagement"),
  "/ev-management": () => import("@/pages/EVManagement"),
  "/vehicle-requests": () => import("@/pages/VehicleRequests"),
  "/pool-supervisors": () => import("@/pages/PoolSupervisors"),
  "/my-requests": () => import("@/pages/RequesterPortal"),
  "/tire-management": () => import("@/pages/TireManagement"),
  "/cold-chain": () => import("@/pages/IoTSensorManagement"),
  "/rental-vehicles": () => import("@/pages/RentalVehicles"),
  "/route-planning": () => import("@/pages/RoutePlanning"),
  "/dash-cam": () => import("@/pages/DashCam"),
  "/adas-reports": () => import("@/pages/ADASReports"),
  "/dashboard-builder": () => import("@/pages/DashboardBuilder"),
  "/performance-simulation": () => import("@/pages/PerformanceSimulation"),
  "/predictive-maintenance": () => import("@/pages/PredictiveMaintenance"),
  "/fuel-requests": () => import("@/pages/FuelRequests"),
  "/generators": () => import("@/pages/Generators"),
  "/outsource-management": () => import("@/pages/OutsourceManagement"),
  "/third-party-claims": () => import("@/pages/ThirdPartyClaims"),
  "/internal-accident-maintenance": () => import("@/pages/InternalAccidentMaintenance"),
  "/driver-logbook": () => import("@/pages/DriverLogbook"),
  "/roadside-assistance": () => import("@/pages/RoadsideAssistance"),
  "/carbon-emissions": () => import("@/pages/CarbonEmissions"),
  "/delegation-matrix": () => import("@/pages/DelegationMatrix"),
  "/vehicle-inspections": () => import("@/pages/VehicleInspections"),
  "/alcohol-fatigue": () => import("@/pages/AlcoholFatigueDetection"),
  "/hardware-sensors": () => import("@/pages/IoTSensorManagement"),
  "/iot-sensors": () => import("@/pages/IoTSensorManagement"),
  "/accident-insurance": () => import("@/pages/AccidentInsurance"),
  "/document-management": () => import("@/pages/DocumentManagement"),
  "/compliance-calendar": () => import("@/pages/ComplianceCalendar"),
  "/maintenance-enterprise": () => import("@/pages/MaintenanceEnterprise"),
  "/driver-maintenance-request": () => import("@/pages/DriverMaintenanceRequest"),
  "/driver-portal": () => import("@/pages/DriverPortal"),
  "/parts-inventory": () => import("@/pages/PartsInventory"),
  "/vendor-management": () => import("@/pages/VendorManagement"),
  "/penalties-fines": () => import("@/pages/PenaltiesFines"),
  "/contract-management": () => import("@/pages/ContractManagement"),
  "/kpi-scorecards": () => import("@/pages/KPIScorecard"),
  "/notification-center": () => import("@/pages/NotificationCenter"),
  "/bulk-operations": () => import("@/pages/BulkOperations"),
  "/passenger-tracking": () => import("@/pages/PassengerTracking"),
  "/rfid-pairing": () => import("@/pages/RFIDPairing"),
  "/fuel-card-providers": () => import("@/pages/FuelCardProviders"),
  "/fuel-events-map": () => import("@/pages/FuelEventsMap"),
  "/infrastructure-monitoring": () => import("@/pages/InfrastructureMonitoring"),
  "/operations-console": () => import("@/pages/OperationsConsole"),
  "/system-architecture": () => import("@/pages/SystemArchitecture"),
  "/licensing-compliance": () => import("@/pages/LicensingCompliance"),
  "/vehicle-profile": () => import("@/pages/VehicleProfile"),
  "/asset-management": () => import("@/pages/AssetManagement"),
  "/3pl": () => import("@/pages/ThirdPartyLogistics"),
  "/supplier-portal": () => import("@/pages/SupplierPortal"),
  "/supplier-payments": () => import("@/pages/SupplierPaymentReview"),
  "/sop": () => import("@/pages/SopHub"),
  "/sop/fleet-inspection": () => import("@/pages/FleetInspectionWithEbsForm"),
  "/sop/vehicle-registration": () => import("@/pages/sop-workflows"),
  "/sop/vehicle-insurance-renewal": () => import("@/pages/sop-workflows"),
  "/sop/preventive-maintenance": () => import("@/pages/sop-workflows"),
  "/sop/breakdown-maintenance": () => import("@/pages/sop-workflows"),
  "/sop/vehicle-dispatch": () => import("@/pages/sop-workflows"),
  "/sop/driver-onboarding": () => import("@/pages/sop-workflows"),
  "/sop/driver-training": () => import("@/pages/sop-workflows"),
  "/sop/driver-allowance": () => import("@/pages/sop-workflows"),
  "/sop/vehicle-disposal": () => import("@/pages/sop-workflows"),
  "/sop/roadside-assistance": () => import("@/pages/sop-workflows"),
  "/sop/license-renewal": () => import("@/pages/sop-workflows"),
  "/sop/outsource-rental": () => import("@/pages/sop-workflows"),
  "/sop/safety-comfort": () => import("@/pages/sop-workflows"),
  "/sop/vehicle-handover": () => import("@/pages/sop-workflows"),
  "/sop/vehicle-handover/catalog": () => import("@/pages/HandoverCatalogAdmin"),
  "/sop/fleet-transfer": () => import("@/pages/sop-workflows"),
  "/sop/fuel-request": () => import("@/pages/sop-workflows"),
  "/sop/vehicle-request": () => import("@/pages/sop-workflows"),
  "/my-license": () => import("@/pages/MyLicense"),
};

// Cache of in-flight / completed prefetches to avoid duplicate work.
const inflight = new Map<string, Promise<unknown>>();

const normalize = (path: string): string => {
  const base = (path.split("?")[0] || path).split("#")[0];
  if (base.length > 1 && base.endsWith("/")) return base.slice(0, -1);
  return base;
};

/**
 * Warm the chunk cache for a given route path. Safe to call repeatedly and
 * for unknown paths. Errors are swallowed because prefetching is a hint, not
 * a requirement — the real lazy() boundary will surface failures on click.
 */
export const prefetchRoute = (path: string | undefined): void => {
  if (!path) return;
  const key = normalize(path);
  if (inflight.has(key)) return;
  const importer = IMPORTERS[key];
  if (!importer) return;
  try {
    const p = importer().catch(() => {
      // If prefetch fails (e.g., offline), drop the cache entry so a real
      // navigation can retry.
      inflight.delete(key);
    });
    inflight.set(key, p);
  } catch {
    /* no-op */
  }
};
