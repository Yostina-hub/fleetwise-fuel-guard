import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import Dashboard from "./pages/Dashboard";
import MapView from "./pages/MapView";
import Fleet from "./pages/Fleet";
import Vehicles from "./pages/Vehicles";
import DriverScoring from "./pages/DriverScoring";
import Drivers from "./pages/Drivers";
import FuelMonitoring from "./pages/FuelMonitoring";
import Alerts from "./pages/Alerts";
import Maintenance from "./pages/Maintenance";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import UserManagement from "./pages/UserManagement";
import Security from "./pages/Security";
import SecurityDashboard from "./pages/SecurityDashboard";
import Integrations from "./pages/Integrations";
import Administration from "./pages/Administration";
import RoutesPage from "./pages/Routes";
import WorkOrders from "./pages/WorkOrders";
import Incidents from "./pages/Incidents";
import SystemConfig from "./pages/SystemConfig";
import DeviceIntegration from "./pages/DeviceIntegration";
import RouteHistory from "./pages/RouteHistory";
import Geofencing from "./pages/Geofencing";
import SpeedGovernor from "./pages/SpeedGovernor";
import FleetScheduling from "./pages/FleetScheduling";
import Dispatch from "./pages/Dispatch";
import DriverApp from "./pages/DriverApp";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { CommandPalette } from "./components/CommandPalette";

const App = () => {
  const [queryClient] = useState(() => new QueryClient());
  
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <SidebarProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <CommandPalette />
                <ErrorBoundary>
                  <Routes>
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/map" element={<ProtectedRoute><MapView /></ProtectedRoute>} />
                    <Route path="/vehicles" element={<ProtectedRoute><Vehicles /></ProtectedRoute>} />
                    <Route path="/fleet" element={<ProtectedRoute><Fleet /></ProtectedRoute>} />
                    <Route path="/driver-scoring" element={<ProtectedRoute><DriverScoring /></ProtectedRoute>} />
                    <Route path="/drivers" element={<ProtectedRoute><Drivers /></ProtectedRoute>} />
                    <Route path="/fuel" element={<ProtectedRoute><FuelMonitoring /></ProtectedRoute>} />
                    <Route path="/fuel-monitoring" element={<ProtectedRoute><FuelMonitoring /></ProtectedRoute>} />
                    <Route path="/incidents" element={<ProtectedRoute><Incidents /></ProtectedRoute>} />
                    <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
                    <Route path="/maintenance" element={<ProtectedRoute><Maintenance /></ProtectedRoute>} />
                    <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                    <Route path="/users" element={<ProtectedRoute requiredRole="super_admin"><UserManagement /></ProtectedRoute>} />
                    <Route path="/security" element={<ProtectedRoute requiredRole="super_admin"><Security /></ProtectedRoute>} />
                    <Route path="/security-dashboard" element={<ProtectedRoute requiredRole="super_admin"><SecurityDashboard /></ProtectedRoute>} />
                    <Route path="/integrations" element={<ProtectedRoute requiredRole="super_admin"><Integrations /></ProtectedRoute>} />
                    <Route path="/administration" element={<ProtectedRoute requiredRole="super_admin"><Administration /></ProtectedRoute>} />
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
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </ErrorBoundary>
              </BrowserRouter>
            </TooltipProvider>
          </SidebarProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
