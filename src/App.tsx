import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import MapView from "./pages/MapView";
import Fleet from "./pages/Fleet";
import FuelMonitoring from "./pages/FuelMonitoring";
import Alerts from "./pages/Alerts";
import Maintenance from "./pages/Maintenance";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import UserManagement from "./pages/UserManagement";
import Security from "./pages/Security";
import Integrations from "./pages/Integrations";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/auth/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/map" element={<ProtectedRoute><MapView /></ProtectedRoute>} />
          <Route path="/fleet" element={<ProtectedRoute><Fleet /></ProtectedRoute>} />
          <Route path="/fuel" element={<ProtectedRoute><FuelMonitoring /></ProtectedRoute>} />
          <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
          <Route path="/maintenance" element={<ProtectedRoute><Maintenance /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute requiredRole="super_admin"><UserManagement /></ProtectedRoute>} />
          <Route path="/security" element={<ProtectedRoute requiredRole="super_admin"><Security /></ProtectedRoute>} />
          <Route path="/integrations" element={<ProtectedRoute requiredRole="super_admin"><Integrations /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
