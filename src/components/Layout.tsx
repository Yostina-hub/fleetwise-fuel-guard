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
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { NotificationCenter } from "@/components/scheduling/NotificationCenter";
import { AIAssistant } from "@/components/AIAssistant";
import { SidebarNav } from "@/components/sidebar/SidebarNav";
import LanguageSelector from "@/components/settings/LanguageSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
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
  const { theme } = useTheme();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  
  const isDark = theme === "dark";

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
      <aside className={cn(
        "w-60 border-r flex flex-col shrink-0 relative z-10",
        isDark 
          ? "bg-[#1a2332] border-[#2a3a4d]" 
          : "bg-card border-border"
      )}>
        {/* Header with Logo */}
        <div className={cn(
          "px-3 py-4 flex items-center",
          isDark ? "bg-[#001a33]" : "bg-muted"
        )}>
          <img 
            src={ethioTelecomLogo} 
            alt="ethio telecom" 
            className="h-14 w-auto object-contain"
          />
        </div>
        
        <SidebarNav navItems={navItems} adminItems={adminItems} isSuperAdmin={isSuperAdmin} isDark={isDark} />

        {/* Keyboard shortcut hint */}
        <div className="px-3 py-2 mt-auto">
          <div className={cn(
            "flex items-center justify-center gap-2 text-[11px]",
            isDark ? "text-white/50" : "text-muted-foreground"
          )}>
            <span>Press</span>
            <kbd className={cn(
              "px-1.5 py-0.5 rounded text-[10px] font-mono border",
              isDark ? "bg-[#2a3a4d]/50 border-[#2a3a4d]" : "bg-muted border-border"
            )}>
              ⌘K
            </kbd>
            <span>for commands</span>
          </div>
        </div>
      </aside>

      {/* Main Content - Scrollable container for all pages */}
      <main className="flex-1 bg-background relative z-10 overflow-hidden flex flex-col">
        {/* Content Header with Theme Toggle */}
        <div className={cn(
          "flex items-center justify-end gap-3 px-6 py-2 border-b shrink-0",
          isDark ? "bg-[#1a2332]/50 border-[#2a3a4d]" : "bg-card/80 border-border"
        )}>
          <LanguageSelector variant="compact" className="text-sm" />
          
          <div className="h-5 w-px bg-border" />
          
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-2 px-2 py-1 rounded-md",
              isDark ? "bg-[#0d1520]" : "bg-muted"
            )}>
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-primary">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <span className={cn("text-xs font-medium max-w-[120px] truncate", isDark ? "text-white" : "text-foreground")}>
                {user?.email}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 shrink-0 hover:bg-destructive/10",
                isDark ? "text-white/60 hover:text-white" : "text-muted-foreground hover:text-destructive"
              )}
              onClick={handleSignOut}
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="h-5 w-px bg-border" />
          
          <NotificationCenter />
          <ThemeToggle />
        </div>
        <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
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
