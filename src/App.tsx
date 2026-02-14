import { useState, lazy, Suspense } from "react";
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

// Lazy-load all pages for code splitting
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MapView = lazy(() => import("./pages/MapView"));
const Fleet = lazy(() => import("./pages/Fleet"));
const Vehicles = lazy(() => import("./pages/Vehicles"));
const DriverScoring = lazy(() => import("./pages/DriverScoring"));
const Drivers = lazy(() => import("./pages/Drivers"));
const DriverManagement = lazy(() => import("./pages/DriverManagement"));
const FuelMonitoring = lazy(() => import("./pages/FuelMonitoring"));
const Alerts = lazy(() => import("./pages/Alerts"));
const Maintenance = lazy(() => import("./pages/Maintenance"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const Auth = lazy(() => import("./pages/Auth"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const Security = lazy(() => import("./pages/Security"));
const SecurityDashboard = lazy(() => import("./pages/SecurityDashboard"));
const Integrations = lazy(() => import("./pages/Integrations"));
const Administration = lazy(() => import("./pages/Administration"));
const RoutesPage = lazy(() => import("./pages/Routes"));
const WorkOrders = lazy(() => import("./pages/WorkOrders"));
const Incidents = lazy(() => import("./pages/Incidents"));
const SystemConfig = lazy(() => import("./pages/SystemConfig"));
const DeviceIntegration = lazy(() => import("./pages/DeviceIntegration"));
const RouteHistory = lazy(() => import("./pages/RouteHistory"));
const Geofencing = lazy(() => import("./pages/Geofencing"));
const SpeedGovernor = lazy(() => import("./pages/SpeedGovernor"));
const FleetScheduling = lazy(() => import("./pages/FleetScheduling"));
const Dispatch = lazy(() => import("./pages/Dispatch"));
const DriverApp = lazy(() => import("./pages/DriverApp"));
const WorkflowBuilder = lazy(() => import("./pages/WorkflowBuilder"));
const Organizations = lazy(() => import("./pages/Organizations"));
const NotFound = lazy(() => import("./pages/NotFound"));

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
