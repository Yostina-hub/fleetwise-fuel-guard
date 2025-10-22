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
  ClipboardList,
  AlertTriangle,
  Settings2,
  Building2
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Map, label: "Live Map", path: "/map" },
  { icon: Truck, label: "Fleet", path: "/fleet" },
  { icon: Fuel, label: "Fuel", path: "/fuel" },
  { icon: Bell, label: "Alerts", path: "/alerts" },
  { icon: Wrench, label: "Maintenance", path: "/maintenance" },
  { icon: Route, label: "Routes", path: "/routes" },
  { icon: ClipboardList, label: "Work Orders", path: "/workorders" },
  { icon: AlertTriangle, label: "Incidents", path: "/incidents" },
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
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-xl font-bold text-sidebar-foreground">FleetTrack FMS</h1>
          <p className="text-sm text-sidebar-foreground/60 mt-1">Fleet Management</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
          
          {isSuperAdmin && (
            <>
              <Link
                to="/users"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  location.pathname === "/users"
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <Users className="w-5 h-5" />
                <span className="font-medium">Users</span>
              </Link>
              <Link
                to="/security"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  location.pathname === "/security"
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <Shield className="w-5 h-5" />
                <span className="font-medium">Security</span>
              </Link>
              <Link
                to="/integrations"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  location.pathname === "/integrations"
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <Plug className="w-5 h-5" />
                <span className="font-medium">Integrations</span>
              </Link>
              <Link
                to="/administration"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  location.pathname === "/administration"
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <Building2 className="w-5 h-5" />
                <span className="font-medium">Administration</span>
              </Link>
              <Link
                to="/config"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  location.pathname === "/config"
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <Settings2 className="w-5 h-5" />
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
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};

export default Layout;
