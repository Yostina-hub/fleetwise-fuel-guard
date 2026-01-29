import { ReactNode, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Map, 
  Truck, 
  Car,
  Fuel, 
  Bell, 
  Wrench,
  BarChart3,
  Settings,
  Users,
  Shield,
  Plug,
  LogOut,
  MapPinned,
  ShieldCheck,
  Settings2,
  Building2,
  CalendarClock
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { NotificationCenter } from "@/components/scheduling/NotificationCenter";
import { AIAssistant } from "@/components/AIAssistant";
import { SidebarNav } from "@/components/sidebar/SidebarNav";
import LanguageSelector from "@/components/settings/LanguageSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import ethioTelecomLogo from "@/assets/ethio-telecom-logo.png";

interface LayoutProps {
  children: ReactNode;
}

// Navigation structure with collapsible groups
const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Map, label: "Live Tracking", path: "/map" },
  { icon: Car, label: "Vehicles", path: "/vehicles" },
  { 
    icon: Truck, 
    label: "Fleet Management", 
    subItems: [
      { label: "Vehicle List", path: "/fleet" },
      { label: "Drivers", path: "/drivers" },
      { label: "Driver Scoring", path: "/driver-scoring" },
      { label: "Device Management", path: "/devices" },
    ]
  },
  { icon: Fuel, label: "Fuel Monitoring", path: "/fuel" },
  { 
    icon: ShieldCheck, 
    label: "Safety & Compliance", 
    subItems: [
      { label: "Speed Governor", path: "/speed-governor" },
      { label: "Incidents", path: "/incidents" },
    ]
  },
  { 
    icon: MapPinned, 
    label: "Routes & Locations", 
    subItems: [
      { label: "Customer Sites", path: "/routes" },
      { label: "Journey History", path: "/route-history" },
      { label: "Geofences", path: "/geofencing" },
    ]
  },
  { icon: Bell, label: "Alerts", path: "/alerts" },
  { 
    icon: Wrench, 
    label: "Maintenance", 
    subItems: [
      { label: "Service History", path: "/maintenance" },
      { label: "Work Orders", path: "/work-orders" },
    ]
  },
  { 
    icon: CalendarClock, 
    label: "Trip Management", 
    highlight: true,
    subItems: [
      { label: "Request Dashboard", path: "/fleet-scheduling" },
      { label: "Dispatch Jobs", path: "/dispatch" },
      { label: "Pending Approvals", path: "/fleet-scheduling?tab=approvals" },
      { label: "Assignments", path: "/fleet-scheduling?tab=assignments" },
    ]
  },
  { icon: BarChart3, label: "Reports", path: "/reports" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

// Admin navigation items
const adminItems = [
  { label: "Users", path: "/users", icon: Users },
  { label: "Security", path: "/security", icon: Shield },
  { label: "Security Dashboard", path: "/security-dashboard", icon: ShieldCheck },
  { label: "Integrations", path: "/integrations", icon: Plug },
  { label: "Administration", path: "/administration", icon: Building2 },
  { label: "System Config", path: "/config", icon: Settings2 },
];

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { isSuperAdmin } = usePermissions();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    // Reset scroll positions between pages so horizontal scroll doesn't "carry" to the next route.
    scrollRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, location.search]);

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {/* Animated Background */}
      <div className="parallax-bg"></div>
      
      {/* Sidebar */}
      <aside className="w-60 bg-sidebar border-r border-sidebar-border flex flex-col shrink-0 relative z-10">
        {/* Header with Logo */}
        <div className="px-3 py-4 bg-sidebar-accent flex items-center justify-between">
          <img 
            src={ethioTelecomLogo} 
            alt="ethio telecom" 
            className="h-14 w-auto object-contain"
          />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <NotificationCenter />
          </div>
        </div>
        
        <SidebarNav navItems={navItems} adminItems={adminItems} isSuperAdmin={isSuperAdmin} />

        {/* Language Selector */}
        <div className="px-3 py-2 border-t border-sidebar-border/50">
          <LanguageSelector variant="compact" className="w-full text-sidebar-foreground/70" />
        </div>


        {/* Keyboard shortcut hint */}
        <div className="px-3 py-2">
          <div className="flex items-center justify-center gap-2 text-[11px] text-sidebar-foreground/50">
            <span>Press</span>
            <kbd className="px-1.5 py-0.5 bg-sidebar-accent/50 rounded text-[10px] font-mono border border-sidebar-border">
              ⌘K
            </kbd>
            <span>for commands</span>
          </div>
        </div>

        {/* Compact Footer */}
        <div className="px-2 py-2 border-t border-sidebar-border bg-sidebar">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-sidebar-accent">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-primary">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.email}</p>
              <p className="text-[10px] text-sidebar-foreground/50">v1.0.0</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-destructive/10"
              onClick={handleSignOut}
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content - Scrollable container for all pages */}
      <main className="flex-1 bg-background relative z-10 overflow-hidden">
        <div ref={scrollRef} className="h-full overflow-x-auto overflow-y-auto custom-scrollbar">
          <div className="min-h-full min-w-full">
            {children}
          </div>
        </div>
      </main>
      
      {/* AI Assistant */}
      <AIAssistant />
    </div>
  );
};

export default Layout;
