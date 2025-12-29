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
  CalendarClock,
  Award
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
  { icon: Award, label: "Driver Scoring", path: "/driver-scoring", highlight: true },
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
      console.error("Sign out error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Navigation will happen automatically via auth state change
      toast({
        title: "Success",
        description: "Signed out successfully",
      });
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {/* Animated Background */}
      <div className="parallax-bg"></div>
      
      {/* Sidebar */}
      <aside className="w-60 bg-sidebar border-r border-sidebar-border flex flex-col shrink-0 relative z-10">
        {/* Compact Header */}
        <div className="px-4 py-3 bg-primary flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
              <Truck className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-primary-foreground tracking-tight">FleetTrack</h1>
              <p className="text-[10px] text-primary-foreground/80">FMS</p>
            </div>
          </div>
          <NotificationCenter />
        </div>
        
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md transition-all duration-200 group relative text-sm",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="font-medium truncate">{item.label}</span>
                {item.highlight && (
                  <span className="ml-auto px-1.5 py-0.5 text-[9px] font-bold bg-primary text-primary-foreground rounded">
                    NEW
                  </span>
                )}
              </Link>
            );
          })}
          
          {isSuperAdmin && (
            <>
              <div className="pt-3 pb-1.5">
                <div className="px-3 text-[10px] font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                  Admin
                </div>
              </div>
              <Link
                to="/users"
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md transition-all duration-200 group text-sm",
                  location.pathname === "/users"
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span className="font-medium">Users</span>
              </Link>
              <Link
                to="/security"
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md transition-all duration-200 group text-sm",
                  location.pathname === "/security"
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <Shield className="w-4 h-4 shrink-0" />
                <span className="font-medium">Security</span>
              </Link>
              <Link
                to="/integrations"
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md transition-all duration-200 group text-sm",
                  location.pathname === "/integrations"
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <Plug className="w-4 h-4 shrink-0" />
                <span className="font-medium">Integrations</span>
              </Link>
              <Link
                to="/administration"
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md transition-all duration-200 group text-sm",
                  location.pathname === "/administration"
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <Building2 className="w-4 h-4 shrink-0" />
                <span className="font-medium">Administration</span>
              </Link>
              <Link
                to="/config"
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md transition-all duration-200 group text-sm",
                  location.pathname === "/config"
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <Settings2 className="w-4 h-4 shrink-0" />
                <span className="font-medium">System Config</span>
              </Link>
            </>
          )}
        </nav>

        {/* Compact Footer */}
        <div className="px-2 py-2 border-t border-sidebar-border bg-sidebar">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/50">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-primary">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{user?.email}</p>
              <p className="text-[10px] text-muted-foreground">v1.0.0</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground hover:bg-destructive/10"
              onClick={handleSignOut}
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-background custom-scrollbar relative z-10">
        <div className="h-full">
          {children}
        </div>
      </main>
      
      {/* AI Assistant */}
      <AIAssistant />
    </div>
  );
};

export default Layout;
