import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Map, 
  Truck, 
  Fuel, 
  Bell, 
  Wrench,
  BarChart3,
  Settings,
  Users,
  Shield,
  Plug,
  LogOut,
  Route,
  History,
  Fence,
  GaugeCircle,
  ClipboardList,
  AlertTriangle,
  Settings2,
  Building2,
  Smartphone,
  CalendarClock
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { NotificationCenter } from "@/components/scheduling/NotificationCenter";
import { AIAssistant } from "@/components/AIAssistant";

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Map, label: "Live Map", path: "/map" },
  { icon: Truck, label: "Fleet", path: "/fleet" },
  { icon: Smartphone, label: "Devices", path: "/devices", highlight: true },
  { icon: Fuel, label: "Fuel", path: "/fuel" },
  { icon: Bell, label: "Alerts", path: "/alerts" },
  { icon: Wrench, label: "Maintenance", path: "/maintenance" },
  { icon: Route, label: "Routes", path: "/routes" },
  { icon: History, label: "Route History", path: "/route-history", highlight: true },
  { icon: Fence, label: "Geofencing", path: "/geofencing", highlight: true },
  { icon: GaugeCircle, label: "Speed Governor", path: "/speed-governor", highlight: true },
  { icon: ClipboardList, label: "Work Orders", path: "/workorders" },
  { icon: AlertTriangle, label: "Incidents", path: "/incidents" },
  { icon: CalendarClock, label: "Fleet Scheduling", path: "/fleet-scheduling", highlight: true },
  { icon: BarChart3, label: "Reports", path: "/reports" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { isSuperAdmin } = usePermissions();
  const { toast } = useToast();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate("/auth");
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col shrink-0">
        <div className="p-6 border-b border-sidebar-border flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-sidebar-foreground tracking-tight">FleetTrack FMS</h1>
            <p className="text-sm text-sidebar-foreground/60 mt-1">Fleet Management System</p>
          </div>
          <NotificationCenter />
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground hover:translate-x-1"
                )}
              >
                <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                <span className="font-medium">{item.label}</span>
                {item.highlight && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full animate-pulse">
                    NEW
                  </span>
                )}
              </Link>
            );
          })}
          
          {isSuperAdmin && (
            <>
              <div className="pt-4 pb-2">
                <div className="px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                  Admin
                </div>
              </div>
              <Link
                to="/users"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                  location.pathname === "/users"
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground hover:translate-x-1"
                )}
              >
                <Users className="w-5 h-5 transition-transform group-hover:scale-110" />
                <span className="font-medium">Users</span>
              </Link>
              <Link
                to="/security"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                  location.pathname === "/security"
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground hover:translate-x-1"
                )}
              >
                <Shield className="w-5 h-5 transition-transform group-hover:scale-110" />
                <span className="font-medium">Security</span>
              </Link>
              <Link
                to="/integrations"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                  location.pathname === "/integrations"
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground hover:translate-x-1"
                )}
              >
                <Plug className="w-5 h-5 transition-transform group-hover:scale-110" />
                <span className="font-medium">Integrations</span>
              </Link>
              <Link
                to="/administration"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                  location.pathname === "/administration"
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground hover:translate-x-1"
                )}
              >
                <Building2 className="w-5 h-5 transition-transform group-hover:scale-110" />
                <span className="font-medium">Administration</span>
              </Link>
              <Link
                to="/config"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                  location.pathname === "/config"
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground hover:translate-x-1"
                )}
              >
                <Settings2 className="w-5 h-5 transition-transform group-hover:scale-110" />
                <span className="font-medium">System Config</span>
              </Link>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-3">
          {user && (
            <div className="px-3 py-2 text-sm text-sidebar-foreground/70">
              {user.email}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
          <div className="px-3 py-2 text-xs text-sidebar-foreground/50">
            v1.0.0 • © 2025 FleetTrack
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-background custom-scrollbar">
        {children}
      </main>
      
      {/* AI Assistant */}
      <AIAssistant />
    </div>
  );
};

export default Layout;
