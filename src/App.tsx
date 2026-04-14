import { useState, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { ImpersonationProvider } from "./hooks/useImpersonation";
import { PageLoader } from "@/components/PageLoader";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { CommandPalette } from "./components/CommandPalette";
import { lazyWithRetry } from "@/lib/lazyWithRetry";

// Lazy-load all pages for code splitting
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"), "Dashboard");
const MapView = lazyWithRetry(() => import("./pages/MapView"), "MapView");
const Fleet = lazyWithRetry(() => import("./pages/Fleet"), "Fleet");
const Vehicles = lazyWithRetry(() => import("./pages/Vehicles"), "Vehicles");
const DriverScoring = lazyWithRetry(() => import("./pages/DriverScoring"), "DriverScoring");
const Drivers = lazyWithRetry(() => import("./pages/Drivers"), "Drivers");
const DriverManagement = lazyWithRetry(() => import("./pages/DriverManagement"), "DriverManagement");
const DriverCompliance = lazyWithRetry(() => import("./pages/DriverCompliance"), "DriverCompliance");
const DriverSafety = lazyWithRetry(() => import("./pages/DriverSafety"), "DriverSafety");
const DriverPerformance = lazyWithRetry(() => import("./pages/DriverPerformance"), "DriverPerformance");
const DriverHR = lazyWithRetry(() => import("./pages/DriverHR"), "DriverHR");
const FuelMonitoring = lazyWithRetry(() => import("./pages/FuelMonitoring"), "FuelMonitoring");
const Alerts = lazyWithRetry(() => import("./pages/Alerts"), "Alerts");
const Maintenance = lazyWithRetry(() => import("./pages/Maintenance"), "Maintenance");
const Reports = lazyWithRetry(() => import("./pages/Reports"), "Reports");
const Settings = lazyWithRetry(() => import("./pages/Settings"), "Settings");
const Auth = lazyWithRetry(() => import("./pages/Auth"), "Auth");
const UserManagement = lazyWithRetry(() => import("./pages/UserManagement"), "UserManagement");
const Security = lazyWithRetry(() => import("./pages/Security"), "Security");
const SecurityDashboard = lazyWithRetry(() => import("./pages/SecurityDashboard"), "SecurityDashboard");
const Integrations = lazyWithRetry(() => import("./pages/Integrations"), "Integrations");
const Administration = lazyWithRetry(() => import("./pages/Administration"), "Administration");
const RoutesPage = lazyWithRetry(() => import("./pages/Routes"), "RoutesPage");
const WorkOrders = lazyWithRetry(() => import("./pages/WorkOrders"), "WorkOrders");
const Incidents = lazyWithRetry(() => import("./pages/Incidents"), "Incidents");
const SystemConfig = lazyWithRetry(() => import("./pages/SystemConfig"), "SystemConfig");
const DeviceIntegration = lazyWithRetry(() => import("./pages/DeviceIntegration"), "DeviceIntegration");
const RouteHistory = lazyWithRetry(() => import("./pages/RouteHistory"), "RouteHistory");
const Geofencing = lazyWithRetry(() => import("./pages/Geofencing"), "Geofencing");
const SpeedGovernor = lazyWithRetry(() => import("./pages/SpeedGovernor"), "SpeedGovernor");
const FleetScheduling = lazyWithRetry(() => import("./pages/FleetScheduling"), "FleetScheduling");
const Dispatch = lazyWithRetry(() => import("./pages/Dispatch"), "Dispatch");
const DriverApp = lazyWithRetry(() => import("./pages/DriverApp"), "DriverApp");
const WorkflowBuilder = lazyWithRetry(() => import("./pages/WorkflowBuilder"), "WorkflowBuilder");
const TripManagement = lazyWithRetry(() => import("./pages/TripManagement"), "TripManagement");
const Organizations = lazyWithRetry(() => import("./pages/Organizations"), "Organizations");
const EVManagement = lazyWithRetry(() => import("./pages/EVManagement"), "EVManagement");
const VehicleRequests = lazyWithRetry(() => import("./pages/VehicleRequests"), "VehicleRequests");
const TireManagement = lazyWithRetry(() => import("./pages/TireManagement"), "TireManagement");
const ColdChain = lazyWithRetry(() => import("./pages/ColdChain"), "ColdChain");
const RentalVehicles = lazyWithRetry(() => import("./pages/RentalVehicles"), "RentalVehicles");
const DashCam = lazyWithRetry(() => import("./pages/DashCam"), "DashCam");
const ADASReports = lazyWithRetry(() => import("./pages/ADASReports"), "ADASReports");
const DashboardBuilder = lazyWithRetry(() => import("./pages/DashboardBuilder"), "DashboardBuilder");
const PerformanceSimulation = lazyWithRetry(() => import("./pages/PerformanceSimulation"), "PerformanceSimulation");
const PredictiveMaintenance = lazyWithRetry(() => import("./pages/PredictiveMaintenance"), "PredictiveMaintenance");
const FuelRequests = lazyWithRetry(() => import("./pages/FuelRequests"), "FuelRequests");
const DriverLogbook = lazyWithRetry(() => import("./pages/DriverLogbook"), "DriverLogbook");
const RoadsideAssistance = lazyWithRetry(() => import("./pages/RoadsideAssistance"), "RoadsideAssistance");
const CarbonEmissions = lazyWithRetry(() => import("./pages/CarbonEmissions"), "CarbonEmissions");
const DelegationMatrixPage = lazyWithRetry(() => import("./pages/DelegationMatrix"), "DelegationMatrix");
const VehicleInspections = lazyWithRetry(() => import("./pages/VehicleInspections"), "VehicleInspections");
const AlcoholFatigueDetection = lazyWithRetry(() => import("./pages/AlcoholFatigueDetection"), "AlcoholFatigueDetection");
const HardwareSensors = lazyWithRetry(() => import("./pages/HardwareSensors"), "HardwareSensors");
const AccidentInsurance = lazyWithRetry(() => import("./pages/AccidentInsurance"), "AccidentInsurance");
const DocumentManagement = lazyWithRetry(() => import("./pages/DocumentManagement"), "DocumentManagement");
const ComplianceCalendar = lazyWithRetry(() => import("./pages/ComplianceCalendar"), "ComplianceCalendar");

const PartsInventory = lazyWithRetry(() => import("./pages/PartsInventory"), "PartsInventory");
const VendorManagement = lazyWithRetry(() => import("./pages/VendorManagement"), "VendorManagement");
const PenaltiesFines = lazyWithRetry(() => import("./pages/PenaltiesFines"), "PenaltiesFines");
const ContractManagement = lazyWithRetry(() => import("./pages/ContractManagement"), "ContractManagement");
const KPIScorecard = lazyWithRetry(() => import("./pages/KPIScorecard"), "KPIScorecard");
const NotificationCenterPage = lazyWithRetry(() => import("./pages/NotificationCenter"), "NotificationCenter");
const BulkOperations = lazyWithRetry(() => import("./pages/BulkOperations"), "BulkOperations");
const PassengerTracking = lazyWithRetry(() => import("./pages/PassengerTracking"), "PassengerTracking");
const RFIDPairing = lazyWithRetry(() => import("./pages/RFIDPairing"), "RFIDPairing");
const FuelCardProviders = lazyWithRetry(() => import("./pages/FuelCardProviders"), "FuelCardProviders");
const InstallApp = lazyWithRetry(() => import("./pages/InstallApp"), "InstallApp");
const FuelEventsMap = lazyWithRetry(() => import("./pages/FuelEventsMap"), "FuelEventsMap");
const InfrastructureMonitoring = lazyWithRetry(() => import("./pages/InfrastructureMonitoring"), "InfrastructureMonitoring");
const OperationsConsole = lazyWithRetry(() => import("./pages/OperationsConsole"), "OperationsConsole");
const NotFound = lazyWithRetry(() => import("./pages/NotFound"), "NotFound");

const App = () => {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }));
  
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <OrganizationProvider>
            <SidebarProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <CommandPalette />
                  <ImpersonationProvider>
                  <ErrorBoundary>
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        <Route path="/auth" element={<Auth />} />
                        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                        <Route path="/map" element={<ProtectedRoute><MapView /></ProtectedRoute>} />
                        <Route path="/vehicles" element={<ProtectedRoute><Vehicles /></ProtectedRoute>} />
                        <Route path="/fleet" element={<ProtectedRoute><Fleet /></ProtectedRoute>} />
                        <Route path="/driver-scoring" element={<ProtectedRoute><DriverScoring /></ProtectedRoute>} />
                        <Route path="/drivers" element={<ProtectedRoute><Drivers /></ProtectedRoute>} />
                        <Route path="/driver-management" element={<ProtectedRoute><DriverManagement /></ProtectedRoute>} />
                        <Route path="/driver-compliance" element={<ProtectedRoute><DriverCompliance /></ProtectedRoute>} />
                        <Route path="/driver-safety" element={<ProtectedRoute><DriverSafety /></ProtectedRoute>} />
                        <Route path="/driver-performance" element={<ProtectedRoute><DriverPerformance /></ProtectedRoute>} />
                        <Route path="/driver-hr" element={<ProtectedRoute><DriverHR /></ProtectedRoute>} />
                        <Route path="/fuel" element={<ProtectedRoute><FuelMonitoring /></ProtectedRoute>} />
                        <Route path="/fuel-monitoring" element={<ProtectedRoute><FuelMonitoring /></ProtectedRoute>} />
                        <Route path="/incidents" element={<ProtectedRoute><Incidents /></ProtectedRoute>} />
                        <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
                        <Route path="/maintenance" element={<ProtectedRoute><Maintenance /></ProtectedRoute>} />
                        <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                        <Route path="/users" element={<ProtectedRoute requiredRoles={["super_admin", "org_admin"]}><UserManagement /></ProtectedRoute>} />
                        <Route path="/security" element={<ProtectedRoute requiredRole="super_admin"><Security /></ProtectedRoute>} />
                        <Route path="/security-dashboard" element={<ProtectedRoute requiredRole="super_admin"><SecurityDashboard /></ProtectedRoute>} />
                        <Route path="/integrations" element={<ProtectedRoute requiredRole="super_admin"><Integrations /></ProtectedRoute>} />
                        <Route path="/administration" element={<ProtectedRoute requiredRole="super_admin"><Administration /></ProtectedRoute>} />
                        <Route path="/organizations" element={<ProtectedRoute requiredRole="super_admin"><Organizations /></ProtectedRoute>} />
                        <Route path="/routes" element={<ProtectedRoute><RoutesPage /></ProtectedRoute>} />
                        <Route path="/route-history" element={<ProtectedRoute><RouteHistory /></ProtectedRoute>} />
                        <Route path="/geofencing" element={<ProtectedRoute><Geofencing /></ProtectedRoute>} />
                        <Route path="/speed-governor" element={<ProtectedRoute><SpeedGovernor /></ProtectedRoute>} />
                        <Route path="/work-orders" element={<ProtectedRoute><WorkOrders /></ProtectedRoute>} />
                        <Route path="/fleet-scheduling" element={<ProtectedRoute><FleetScheduling /></ProtectedRoute>} />
                        <Route path="/dispatch" element={<ProtectedRoute><Dispatch /></ProtectedRoute>} />
                        <Route path="/driver-app" element={<ProtectedRoute><DriverApp /></ProtectedRoute>} />
                        <Route path="/config" element={<ProtectedRoute requiredRole="super_admin"><SystemConfig /></ProtectedRoute>} />
                        <Route path="/devices" element={<ProtectedRoute><DeviceIntegration /></ProtectedRoute>} />
                        <Route path="/workflow-builder" element={<ProtectedRoute><WorkflowBuilder /></ProtectedRoute>} />
                        <Route path="/trip-management" element={<ProtectedRoute><TripManagement /></ProtectedRoute>} />
                        <Route path="/ev-management" element={<ProtectedRoute><EVManagement /></ProtectedRoute>} />
                        <Route path="/vehicle-requests" element={<ProtectedRoute><VehicleRequests /></ProtectedRoute>} />
                        <Route path="/tire-management" element={<ProtectedRoute><TireManagement /></ProtectedRoute>} />
                        <Route path="/cold-chain" element={<ProtectedRoute><ColdChain /></ProtectedRoute>} />
                        <Route path="/rental-vehicles" element={<ProtectedRoute><RentalVehicles /></ProtectedRoute>} />
                        <Route path="/dash-cam" element={<ProtectedRoute><DashCam /></ProtectedRoute>} />
                        <Route path="/adas-reports" element={<ProtectedRoute><ADASReports /></ProtectedRoute>} />
                        <Route path="/dashboard-builder" element={<ProtectedRoute><DashboardBuilder /></ProtectedRoute>} />
                        <Route path="/performance-simulation" element={<ProtectedRoute><PerformanceSimulation /></ProtectedRoute>} />
                        <Route path="/predictive-maintenance" element={<ProtectedRoute><PredictiveMaintenance /></ProtectedRoute>} />
                        <Route path="/fuel-requests" element={<ProtectedRoute><FuelRequests /></ProtectedRoute>} />
                        <Route path="/driver-logbook" element={<ProtectedRoute><DriverLogbook /></ProtectedRoute>} />
                        <Route path="/roadside-assistance" element={<ProtectedRoute><RoadsideAssistance /></ProtectedRoute>} />
                        <Route path="/carbon-emissions" element={<ProtectedRoute><CarbonEmissions /></ProtectedRoute>} />
                        <Route path="/delegation-matrix" element={<ProtectedRoute><DelegationMatrixPage /></ProtectedRoute>} />
                        <Route path="/vehicle-inspections" element={<ProtectedRoute><VehicleInspections /></ProtectedRoute>} />
                        <Route path="/alcohol-fatigue" element={<ProtectedRoute><AlcoholFatigueDetection /></ProtectedRoute>} />
                        <Route path="/hardware-sensors" element={<ProtectedRoute><HardwareSensors /></ProtectedRoute>} />
                        <Route path="/accident-insurance" element={<ProtectedRoute><AccidentInsurance /></ProtectedRoute>} />
                        <Route path="/document-management" element={<ProtectedRoute><DocumentManagement /></ProtectedRoute>} />
                        <Route path="/compliance-calendar" element={<ProtectedRoute><ComplianceCalendar /></ProtectedRoute>} />
                        
                        <Route path="/parts-inventory" element={<ProtectedRoute><PartsInventory /></ProtectedRoute>} />
                        <Route path="/vendor-management" element={<ProtectedRoute><VendorManagement /></ProtectedRoute>} />
                        <Route path="/penalties-fines" element={<ProtectedRoute><PenaltiesFines /></ProtectedRoute>} />
                        <Route path="/contract-management" element={<ProtectedRoute><ContractManagement /></ProtectedRoute>} />
                        <Route path="/kpi-scorecards" element={<ProtectedRoute><KPIScorecard /></ProtectedRoute>} />
                        <Route path="/notification-center" element={<ProtectedRoute><NotificationCenterPage /></ProtectedRoute>} />
                        <Route path="/bulk-operations" element={<ProtectedRoute><BulkOperations /></ProtectedRoute>} />
                        <Route path="/passenger-tracking" element={<ProtectedRoute><PassengerTracking /></ProtectedRoute>} />
                        <Route path="/rfid-pairing" element={<ProtectedRoute><RFIDPairing /></ProtectedRoute>} />
                        <Route path="/fuel-card-providers" element={<ProtectedRoute><FuelCardProviders /></ProtectedRoute>} />
                        <Route path="/install" element={<InstallApp />} />
                        <Route path="/fuel-events-map" element={<ProtectedRoute><FuelEventsMap /></ProtectedRoute>} />
                        <Route path="/infrastructure-monitoring" element={<ProtectedRoute requiredRole="super_admin"><InfrastructureMonitoring /></ProtectedRoute>} />
                        <Route path="/operations-console" element={<ProtectedRoute requiredRole="super_admin"><OperationsConsole /></ProtectedRoute>} />
                        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </ErrorBoundary>
                  </ImpersonationProvider>
                </BrowserRouter>
              </TooltipProvider>
            </SidebarProvider>
          </OrganizationProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
