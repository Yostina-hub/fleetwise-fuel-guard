import { ReactNode, useContext, useEffect, useRef, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { LayoutNestedContext } from "@/contexts/LayoutNestedContext";
import { useTranslation } from "react-i18next";
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
  Inbox,
  Battery,
  CircleDot,
  Thermometer,
  ClipboardList,
  Camera,
  BookOpen,
  Phone,
  Leaf,
  GitBranch,
  
  Package,
  Gavel,
  FileSignature,
  FileText,
  Calendar,
  Upload,
  Gauge,
  Cpu,
  FlaskConical,
  LayoutGrid,
  Activity,
  Terminal,
  Layers,
  Scale,
  AlertTriangle,
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
import { ImpersonationBanner } from "@/components/dashboard/ImpersonationBanner";
import { SidebarNav } from "@/components/sidebar/SidebarNav";
import { MobileNav } from "@/components/sidebar/MobileNav";
import { BottomNav } from "@/components/mobile/BottomNav";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import LanguageSelector from "@/components/settings/LanguageSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationCenter } from "@/components/scheduling/NotificationCenter";
import { HeaderAlertBell } from "@/components/alerts/HeaderAlertBell";
import DriverNotificationBell from "@/components/driver-portal/DriverNotificationBell";
import { useCurrentDriverId } from "@/hooks/useCurrentDriverId";
import { cn } from "@/lib/utils";
import { isPathAccessible } from "@/config/sidebarAccess";
import { getRoleSpecificNav } from "@/config/roleNavTemplates";
import ethioTelecomLogo from "@/assets/ethio-telecom-logo.png";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LayoutProps {
  children: ReactNode;
}

// Navigation structure with collapsible groups - using translation keys
const getNavItems = (t: (key: string) => string) => [
  // ── Quick Access (pinned) ──
  { icon: LayoutDashboard, label: t("nav.dashboard"), path: "/" },
  { icon: Map, label: t("nav.liveTracking"), path: "/map" },
  { icon: Car, label: t("nav.vehicles"), path: "/vehicles" },

  // ── Fleet Assets ──
  { 
    icon: Truck, 
    label: t("nav.fleetManagement"), 
    subItems: [
      { label: t("nav.vehicleList"), path: "/fleet" },
      { label: "Vehicle Profile", path: "/vehicle-profile" },
      { label: "Asset Management", path: "/asset-management" },
      { label: t("nav.devices"), path: "/devices" },
      { label: t("nav.hardwareSensorsShort"), path: "/iot-sensors" },
      { label: t("nav.rfidPairing"), path: "/rfid-pairing" },
    ]
  },

  // ── Drivers ──
  { 
    icon: Users, 
    label: t("nav.driverManagement"), 
    subItems: [
      { label: "Driver Portal", path: "/driver-portal" },
      { label: t("nav.driverHub"), path: "/driver-management" },
      { label: t("nav.driversDirectory"), path: "/drivers" },
      { label: t("nav.scoringBehavior"), path: "/driver-scoring" },
      { label: t("nav.compliance"), path: "/driver-compliance" },
      { label: t("nav.safetyRisk"), path: "/driver-safety" },
      { label: t("nav.performance"), path: "/driver-performance" },
      { label: t("nav.hrFinance"), path: "/driver-hr" },
    ]
  },

  // ── Operations ──
  { 
    icon: CalendarClock, 
    label: t("nav.tripManagement"), 
    highlight: true,
    subItems: [
      { label: "My Requests", path: "/my-requests" },
      { label: t("nav.tripHub"), path: "/trip-management" },
      { label: t("nav.vehicleRequests"), path: "/vehicle-requests" },
      { label: "Assignments", path: "/vehicle-requests?view=assignments" },
      { label: "Trip Reviews", path: "/trip-reviews" },
      { label: t("nav.requestDashboard"), path: "/fleet-scheduling" },
      { label: t("nav.dispatchJobs"), path: "/dispatch" },
      { label: t("nav.pendingApprovals"), path: "/trip-management?tab=approvals" },
      { label: t("nav.assignments"), path: "/trip-management?tab=active" },
    ]
  },
  { 
    icon: MapPinned, 
    label: t("nav.routesLocations"), 
    subItems: [
      { label: t("nav.routes"), path: "/routes" },
      { label: t("nav.routeHistory"), path: "/route-history" },
      { label: "Route Planning", path: "/route-planning" },
      { label: t("nav.geofences"), path: "/geofencing" },
    ]
  },
  { icon: Users, label: t("nav.passengerTracking"), path: "/passenger-tracking" },

  // ── Fuel & Energy ──
  { icon: Fuel, label: t("nav.fuelMonitoring"), subItems: [
    { label: t("nav.consumption"), path: "/fuel" },
    { label: t("nav.fuelRequests"), path: "/fuel-requests" },
    { label: "Generators", path: "/generators" },
    { label: t("nav.fuelCardProviders"), path: "/fuel-card-providers" },
  ]},
  { icon: Battery, label: t("nav.evManagement"), path: "/ev-management" },
  { icon: Leaf, label: t("nav.carbonEmissions"), path: "/carbon-emissions" },

  // ── Safety & Compliance ──
  { 
    icon: ShieldCheck, 
    label: t("nav.safetyCompliance"), 
    subItems: [
      { label: t("nav.speedGovernor"), path: "/speed-governor" },
      { label: t("nav.incidents"), path: "/incidents" },
      { label: "Accident Management", path: "/incidents?tab=third-party" },
      { label: t("nav.accidentInsurance"), path: "/accident-insurance" },
      { label: t("nav.roadsideAssistance"), path: "/roadside-assistance" },
      { label: t("nav.driverLogbook"), path: "/driver-logbook" },
      { label: t("nav.alcoholFatigue"), path: "/alcohol-fatigue" },
      { label: t("nav.vehicleInspections"), path: "/vehicle-inspections" },
      { label: t("nav.penaltiesFines"), path: "/penalties-fines" },
      { label: t("nav.complianceCalendar"), path: "/compliance-calendar" },
      { label: "Safety & Comfort", path: "/sop/safety-comfort" },
    ]
  },
  { icon: Camera, label: t("nav.dashCamADAS"), subItems: [
    { label: t("nav.dashCamEvents"), path: "/dash-cam" },
    { label: t("nav.adasDmsReports"), path: "/adas-reports" },
  ]},
  { icon: Thermometer, label: t("nav.coldChain"), path: "/iot-sensors" },

  // ── Maintenance ──
  { 
    icon: Wrench, 
    label: t("nav.maintenance"), 
    subItems: [
      { label: t("nav.serviceHistory"), path: "/maintenance" },
      { label: t("nav.workOrders"), path: "/work-orders" },
      { label: "Enterprise Suite", path: "/maintenance-enterprise" },
      { label: "Request Maintenance", path: "/driver-maintenance-request" },
      { label: t("nav.predictiveAI"), path: "/predictive-maintenance" },
      { label: t("nav.tireManagement"), path: "/tire-management" },
      { label: t("nav.partsInventory"), path: "/parts-inventory" },
      { label: t("nav.vendorManagement"), path: "/vendor-management" },
    ]
  },

  // ── Outsource Management ──
  { 
    icon: Building2, 
    label: "Outsource Management", 
    subItems: [
      { label: "Capacity Alerts", path: "/outsource-management?tab=capacity" },
      { label: "Price Catalog", path: "/outsource-management?tab=catalog" },
      { label: "Vehicle Attendance", path: "/outsource-management?tab=attendance" },
      { label: "Payment Requests", path: "/outsource-management?tab=payments" },
    ]
  },
  { icon: FileText, label: "Third-Party Claims", path: "/third-party-claims" },
  { icon: AlertTriangle, label: "Internal Accident Maint.", path: "/internal-accident-maintenance" },
  { icon: Bell, label: t("nav.alerts"), path: "/alerts" },
  { icon: Bell, label: t("nav.notifications"), path: "/notification-center" },

  // ── Reports & Analytics ──
  { icon: BarChart3, label: t("nav.reportsKPIs"), subItems: [
    { label: t("nav.reports"), path: "/reports" },
    { label: t("nav.kpiScorecards"), path: "/kpi-scorecards" },
    { label: t("nav.dashboardBuilder"), path: "/dashboard-builder" },
    { label: t("nav.performanceSimulation"), path: "/performance-simulation" },
  ]},

  // ── Documents & Contracts ──
  { icon: FileText, label: t("nav.documents"), subItems: [
    { label: t("nav.documents"), path: "/document-management" },
    { label: t("nav.contracts"), path: "/contract-management" },
  ]},

  // ── 3PL / Outsource ──
  { icon: Package, label: "3PL Management", path: "/3pl" },

  // ── ET FMG SOP Workflows ──
  {
    icon: ClipboardList,
    label: "SOP Workflows",
    highlight: true,
    subItems: [
      { label: "All SOPs (Hub)", path: "/sop" },
      { label: "Fleet Inspection", path: "/sop/fleet-inspection" },
      { label: "Vehicle Registration", path: "/sop/vehicle-registration" },
      { label: "Insurance Renewal", path: "/sop/vehicle-insurance-renewal" },
      { label: "Preventive Maintenance", path: "/sop/preventive-maintenance" },
      { label: "Breakdown Maintenance", path: "/sop/breakdown-maintenance" },
      { label: "Vehicle Dispatch", path: "/sop/vehicle-dispatch" },
      { label: "Driver Onboarding", path: "/sop/driver-onboarding" },
      { label: "Driver Training", path: "/sop/driver-training" },
      { label: "Driver Allowance", path: "/sop/driver-allowance" },
      { label: "Vehicle Disposal", path: "/sop/vehicle-disposal" },
      { label: "Roadside Assistance", path: "/sop/roadside-assistance" },
      { label: "License Renewal", path: "/sop/license-renewal" },
      { label: "Outsource Rental", path: "/sop/outsource-rental" },
      { label: "Safety & Comfort", path: "/sop/safety-comfort" },
      { label: "Vehicle Handover", path: "/sop/vehicle-handover" },
      { label: "Fleet Distribution & Transfer", path: "/sop/fleet-transfer" },
    ],
  },

  // ── Tools & Automation ──
  { icon: Workflow, label: t("nav.workflowBuilder"), path: "/workflow-builder", highlight: true },
  { icon: Inbox, label: "Task Inbox", path: "/inbox" },
  { icon: FileText, label: "Forms", path: "/forms" },
  { icon: Upload, label: t("nav.bulkOperations"), path: "/bulk-operations" },

  // ── ERP (HR, Finance & Governance) ──
  {
    icon: Building2,
    label: "ERP",
    subItems: [
      { label: t("nav.hrFinance"), path: "/driver-hr" },
      { label: t("nav.delegationMatrix"), path: "/delegation-matrix" },
    ],
  },

  // ── Settings ──
  { icon: Settings, label: t("nav.settings"), path: "/settings" },
];

// Admin navigation items — grouped logically
const getAdminItems = (t: (key: string) => string) => [
  { label: t("nav.organizations"), path: "/organizations", icon: Building2 },
  { label: t("nav.users"), path: "/users", icon: Users },
  { label: "Roles & Permissions", path: "/rbac", icon: ShieldCheck },
  { label: t("nav.security"), path: "/security", icon: Shield },
  { label: t("nav.securityDashboard"), path: "/security-dashboard", icon: ShieldCheck },
  { label: t("nav.integrations"), path: "/integrations", icon: Plug },
  { label: t("nav.systemConfig"), path: "/config", icon: Settings2 },
  { label: t("nav.administration"), path: "/administration", icon: Settings },
  { label: "Monitoring", path: "/infrastructure-monitoring", icon: Activity },
];

// Developer-only items — restricted to specific emails
const DEVELOPER_EMAILS = ["abel.birara@gmail.com", "henyize@outlook.com"];

const getDeveloperItems = () => [
  { label: "Architecture", path: "/system-architecture", icon: Layers },
  { label: "Operations Console", path: "/operations-console", icon: Terminal },
  { label: "Licensing", path: "/licensing-compliance", icon: Scale },
];

const LayoutInner = ({ children }: LayoutProps) => {
  const location = useLocation();
  const { signOut, user, hasRole: authHasRole } = useAuth();
  const { isSuperAdmin: permIsSuperAdmin, hasRole: permHasRole, roles: userRoles } = usePermissions();
  // Use either usePermissions or direct auth role check as fallback for resilience against 503 retries
  const isSuperAdmin = permIsSuperAdmin || authHasRole("super_admin");
  const isOrgAdmin = permHasRole("org_admin") || authHasRole("org_admin");
  const { theme } = useTheme();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const currentDriverId = useCurrentDriverId();
  
  const allNavItems = useMemo(() => getNavItems(t), [t]);
  const allAdminItems = useMemo(() => getAdminItems(t), [t]);
  const isDeveloper = DEVELOPER_EMAILS.includes(user?.email || "");
  const developerItems = useMemo(() => isDeveloper ? getDeveloperItems() : [], [isDeveloper]);

  // RBAC filter: only show nav items the user's roles allow.
  // Single-purpose roles (driver / technician / auditor) get a curated tree.
  const navItems = useMemo(() => {
    // If super_admin or roles not loaded yet, show everything
    if (isSuperAdmin || userRoles.length === 0) return allNavItems;

    // Curated layout for focused roles
    const roleSpecific = getRoleSpecificNav(userRoles, t);
    if (roleSpecific) return roleSpecific;

    return allNavItems
      .map((item) => {
        // Top-level item with path
        if (item.path && !isPathAccessible(item.path, userRoles)) return null;

        // Item with subItems — filter children
        if (item.subItems) {
          const filtered = item.subItems.filter((sub) =>
            isPathAccessible(sub.path, userRoles)
          );
          if (filtered.length === 0) return null;
          return { ...item, subItems: filtered };
        }

        return item;
      })
      .filter(Boolean) as typeof allNavItems;
  }, [allNavItems, userRoles, isSuperAdmin, t]);

  const adminItems = useMemo(() => allAdminItems, [allAdminItems]);
  
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
    <div className="flex flex-col h-screen bg-background overflow-hidden relative">
      {/* Animated Background */}
      <div className="parallax-bg"></div>
      {/* Impersonation banner sits ABOVE the sidebar/main row so it doesn't
          steal flex width and push everything off-screen. */}
      <ImpersonationBanner />

      <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Desktop Sidebar - Hidden on mobile */}
      <aside 
        className={cn(
          "hidden md:flex bg-surface-elevated border-r border-surface-border flex-col shrink-0 relative z-10 transition-all duration-300",
          isCollapsed ? "w-16" : "w-60"
        )}
      >
        {/* Header with Logo */}
        <div className={cn(
          "py-4 bg-surface-deep flex items-center",
          isCollapsed ? "px-2 justify-center" : "px-3"
        )}>
          <img 
            src={ethioTelecomLogo} 
            alt="ethio telecom" 
            className={cn(
              "object-contain transition-all duration-300 dark:[filter:invert(1)_hue-rotate(180deg)]",
              isCollapsed ? "h-8 w-8" : "h-14 w-auto"
            )}
          />
        </div>
        
        <SidebarNav 
          navItems={navItems} 
          adminItems={adminItems} 
          developerItems={developerItems}
          isSuperAdmin={isSuperAdmin} 
          isOrgAdmin={isOrgAdmin}
          isDark={true} 
          isCollapsed={isCollapsed}
        />

        {/* Toggle Button & Keyboard shortcut hint */}
        <div className={cn("py-2 mt-auto border-t border-surface-border/50", isCollapsed ? "px-2" : "px-3")}>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className={cn(
                  "w-full text-surface-muted-foreground hover:text-surface-foreground hover:bg-surface-overlay",
                  isCollapsed ? "justify-center px-2" : "justify-start"
                )}
              >
                {isCollapsed ? (
                  <PanelLeft className="w-4 h-4" />
                ) : (
                  <>
                    <PanelLeftClose className="w-4 h-4 mr-2" />
                    <span className="text-xs">{t('nav.collapse')}</span>
                  </>
                )}
              </Button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right">
                {t('nav.expandSidebar')}
              </TooltipContent>
            )}
          </Tooltip>
          
          {!isCollapsed && (
            <div className="flex items-center justify-center gap-2 text-[11px] text-surface-muted-foreground mt-2">
              <span>{t('nav.press')}</span>
              <kbd className="px-1.5 py-0.5 bg-surface-overlay/50 rounded text-[10px] font-mono border border-surface-border">
                ⌘K
              </kbd>
              <span>{t('nav.forCommands')}</span>
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
        <div className="hidden md:flex items-center justify-between gap-2 md:gap-3 px-3 md:px-6 py-2 border-b shrink-0 bg-surface-elevated border-surface-border">
          {/* Left side - Sidebar toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8 text-surface-muted-foreground hover:text-surface-foreground hover:bg-surface-overlay"
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
                <div className="hidden sm:block h-5 w-px bg-surface-overlay" />
              </>
            )}
            <div className="hidden sm:block">
              <LanguageSelector variant="compact" className="text-sm text-surface-foreground/70" />
            </div>
            
            <div className="hidden sm:block h-5 w-px bg-surface-overlay" />
            
            <HeaderAlertBell />
            <DriverNotificationBell driverId={currentDriverId} />
            <NotificationCenter />
            <ThemeToggle />
            
            {/* Desktop user section */}
            <div className="flex items-center gap-2">
              <div className="h-5 w-px bg-surface-overlay" />
              <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-surface-card">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-primary">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <span className="text-xs font-medium max-w-[120px] truncate text-surface-foreground">
                  {user?.email}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-surface-muted-foreground hover:text-surface-foreground hover:bg-destructive/10"
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
          <div className="min-h-full min-w-full page-enter page-padding">
            {children}
          </div>
        </div>
      </main>
      </div>

      {/* Mobile Bottom Navigation - Native app style */}
      <BottomNav onMenuClick={() => setMobileNavOpen(true)} />

      {/* AI Assistant - Hide on mobile */}
      <div className="hidden md:block">
        <AIAssistant />
      </div>
    </div>
  );
};

/**
 * Public Layout wrapper. If we're already inside a persistent <LayoutShell>,
 * render children directly so we don't double-wrap the chrome (sidebar +
 * header) and unmount the sidebar on every route navigation.
 */
const Layout = ({ children }: LayoutProps) => {
  const alreadyInsideShell = useContext(LayoutNestedContext);
  if (alreadyInsideShell) return <>{children}</>;
  return <LayoutInner>{children}</LayoutInner>;
};

export default Layout;
