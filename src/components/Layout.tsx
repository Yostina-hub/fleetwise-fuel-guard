import { ReactNode, useEffect, useRef, useState } from "react";
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
  CalendarClock,
  PanelLeftClose,
  PanelLeft,
  Workflow,
  Battery,
  CircleDot,
  Thermometer,
  ClipboardList,
  Camera,
  BookOpen,
  Phone,
  Leaf,
  GitBranch,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useTheme } from "@/contexts/ThemeContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AIAssistant } from "@/components/AIAssistant";
import { SuperAdminOrgSwitcher } from "@/components/dashboard/SuperAdminOrgSwitcher";
import { SuperAdminImpersonation } from "@/components/dashboard/SuperAdminImpersonation";
import { SidebarNav } from "@/components/sidebar/SidebarNav";
import { MobileNav } from "@/components/sidebar/MobileNav";
import { BottomNav } from "@/components/mobile/BottomNav";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import LanguageSelector from "@/components/settings/LanguageSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationCenter } from "@/components/scheduling/NotificationCenter";
import { cn } from "@/lib/utils";
import ethioTelecomLogo from "@/assets/ethio-telecom-logo.png";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
      { label: "Device Management", path: "/devices" },
      { label: "Hardware Sensors", path: "/hardware-sensors" },
    ]
  },
  { 
    icon: Users, 
    label: "Driver Management", 
    subItems: [
      { label: "Driver Hub", path: "/driver-management" },
      { label: "Drivers", path: "/drivers" },
      { label: "Driver Scoring", path: "/driver-scoring" },
      { label: "License Tracker", path: "/driver-management?tab=licenses" },
      { label: "Availability", path: "/driver-management?tab=availability" },
      { label: "Groups", path: "/driver-management?tab=hierarchy" },
    ]
  },
  { icon: Fuel, label: "Fuel Monitoring", subItems: [
    { label: "Consumption", path: "/fuel" },
    { label: "Fuel Requests", path: "/fuel-requests" },
  ]},
  { icon: Battery, label: "EV Management", path: "/ev-management" },
  { icon: Thermometer, label: "Cold Chain", path: "/cold-chain" },
  { icon: Camera, label: "Dash Cam", path: "/dash-cam" },
  { 
    icon: ShieldCheck, 
    label: "Safety & Compliance", 
    subItems: [
      { label: "Speed Governor", path: "/speed-governor" },
      { label: "Incidents", path: "/incidents" },
      { label: "Roadside Assistance", path: "/roadside-assistance" },
      { label: "Driver Logbook", path: "/driver-logbook" },
      { label: "Alcohol & Fatigue", path: "/alcohol-fatigue" },
      { label: "Vehicle Inspections", path: "/vehicle-inspections" },
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
      { label: "Tire Management", path: "/tire-management" },
    ]
  },
  { 
    icon: Truck, 
    label: "Rental Vehicles", 
    path: "/rental-vehicles"
  },
  { 
    icon: CalendarClock, 
    label: "Trip Management", 
    highlight: true,
    subItems: [
      { label: "Trip Hub", path: "/trip-management" },
      { label: "Request Dashboard", path: "/fleet-scheduling" },
      { label: "Dispatch Jobs", path: "/dispatch" },
      { label: "Pending Approvals", path: "/trip-management?tab=approvals" },
      { label: "Assignments", path: "/trip-management?tab=active" },
    ]
  },
  { icon: BarChart3, label: "Reports", path: "/reports" },
  { icon: Leaf, label: "Carbon Emissions", path: "/carbon-emissions" },
  { icon: GitBranch, label: "Delegation Matrix", path: "/delegation-matrix" },
  { icon: Workflow, label: "Workflow Builder", path: "/workflow-builder", highlight: true },
  { icon: Settings, label: "Settings", path: "/settings" },
];

// Admin navigation items
const adminItems = [
  { label: "Organizations", path: "/organizations", icon: Building2 },
  { label: "Users", path: "/users", icon: Users },
  { label: "Security", path: "/security", icon: Shield },
  { label: "Security Dashboard", path: "/security-dashboard", icon: ShieldCheck },
  { label: "Integrations", path: "/integrations", icon: Plug },
  { label: "Administration", path: "/administration", icon: Settings },
  { label: "System Config", path: "/config", icon: Settings2 },
];

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const { signOut, user, hasRole: authHasRole } = useAuth();
  const { isSuperAdmin: permIsSuperAdmin, hasRole: permHasRole } = usePermissions();
  // Use either usePermissions or direct auth role check as fallback for resilience against 503 retries
  const isSuperAdmin = permIsSuperAdmin || authHasRole("super_admin");
  const isOrgAdmin = permHasRole("org_admin") || authHasRole("org_admin");
  const { theme } = useTheme();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  
  const isDark = theme === "dark" || theme === "cyber";

  const handleSignOut = async () => {
    setMobileNavOpen(false);
    try {
      await signOut();
    } catch (error: any) {
      console.error("Sign out error:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to sign out",
        variant: "destructive",
      });
      return;
    }
    {
      toast({
        title: "Success",
        description: "Signed out successfully",
      });
    }
  };

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, location.search]);

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {/* Animated Background */}
      <div className="parallax-bg"></div>
      
      {/* Desktop Sidebar - Hidden on mobile */}
      <aside 
        className={cn(
          "hidden md:flex bg-[#1a2332] border-r border-[#2a3a4d] flex-col shrink-0 relative z-10 transition-all duration-300",
          isCollapsed ? "w-16" : "w-60"
        )}
      >
        {/* Header with Logo */}
        <div className={cn(
          "py-4 bg-[#001a33] flex items-center",
          isCollapsed ? "px-2 justify-center" : "px-3"
        )}>
          <img 
            src={ethioTelecomLogo} 
            alt="ethio telecom" 
            className={cn(
              "object-contain transition-all duration-300",
              isCollapsed ? "h-8 w-8" : "h-14 w-auto"
            )}
          />
        </div>
        
        <SidebarNav 
          navItems={navItems} 
          adminItems={adminItems} 
          isSuperAdmin={isSuperAdmin} 
          isOrgAdmin={isOrgAdmin}
          isDark={true} 
          isCollapsed={isCollapsed}
        />

        {/* Toggle Button & Keyboard shortcut hint */}
        <div className={cn("py-2 mt-auto border-t border-[#2a3a4d]/50", isCollapsed ? "px-2" : "px-3")}>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className={cn(
                  "w-full text-white/60 hover:text-white hover:bg-[#2a3a4d]",
                  isCollapsed ? "justify-center px-2" : "justify-start"
                )}
              >
                {isCollapsed ? (
                  <PanelLeft className="w-4 h-4" />
                ) : (
                  <>
                    <PanelLeftClose className="w-4 h-4 mr-2" />
                    <span className="text-xs">Collapse</span>
                  </>
                )}
              </Button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right">
                Expand sidebar
              </TooltipContent>
            )}
          </Tooltip>
          
          {!isCollapsed && (
            <div className="flex items-center justify-center gap-2 text-[11px] text-white/50 mt-2">
              <span>Press</span>
              <kbd className="px-1.5 py-0.5 bg-[#2a3a4d]/50 rounded text-[10px] font-mono border border-[#2a3a4d]">
                ⌘K
              </kbd>
              <span>for commands</span>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Slide-out Navigation Drawer */}
      <MobileNav
        navItems={navItems}
        adminItems={adminItems}
        isSuperAdmin={isSuperAdmin}
        isOrgAdmin={isOrgAdmin}
        isOpen={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        onSignOut={handleSignOut}
        userEmail={user?.email}
      />

      {/* Main Content */}
      <main className="flex-1 bg-background relative z-10 overflow-hidden flex flex-col">
        {/* Mobile Header - Native app style */}
        <MobileHeader />

        {/* Desktop Content Header */}
        <div className="hidden md:flex items-center justify-between gap-2 md:gap-3 px-3 md:px-6 py-2 border-b shrink-0 bg-[#1a2332] border-[#2a3a4d]">
          {/* Left side - Sidebar toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8 text-white/60 hover:text-white hover:bg-[#2a3a4d]"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </Button>
          {/* Right side - Actions */}
          <div className="flex items-center gap-2 md:gap-3 ml-auto">
            {isSuperAdmin && (
              <>
                <SuperAdminOrgSwitcher />
                <SuperAdminImpersonation />
                <div className="hidden sm:block h-5 w-px bg-[#2a3a4d]" />
              </>
            )}
            <div className="hidden sm:block">
              <LanguageSelector variant="compact" className="text-sm text-white/70" />
            </div>
            
            <div className="hidden sm:block h-5 w-px bg-[#2a3a4d]" />
            
            <NotificationCenter />
            <ThemeToggle />
            
            {/* Desktop user section */}
            <div className="flex items-center gap-2">
              <div className="h-5 w-px bg-[#2a3a4d]" />
              <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-[#0d1520]">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-primary">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <span className="text-xs font-medium max-w-[120px] truncate text-white">
                  {user?.email}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-white/60 hover:text-white hover:bg-destructive/10"
                onClick={handleSignOut}
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content with mobile-aware padding */}
        <div 
          ref={scrollRef} 
          className={cn(
            "flex-1 overflow-x-auto overflow-y-auto custom-scrollbar scroll-smooth-native",
            // Add bottom padding on mobile for bottom nav
            "pb-0 md:pb-0",
            isMobile && "pb-20"
          )}
        >
          <div className="min-h-full min-w-full page-enter">
            {children}
          </div>
        </div>
      </main>
      
      {/* Mobile Bottom Navigation - Native app style */}
      <BottomNav onMenuClick={() => setMobileNavOpen(true)} />
      
      {/* AI Assistant - Hide on mobile */}
      <div className="hidden md:block">
        <AIAssistant />
      </div>
    </div>
  );
};

export default Layout;
