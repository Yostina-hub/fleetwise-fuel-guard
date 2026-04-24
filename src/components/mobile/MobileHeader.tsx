import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { NotificationCenter } from "@/components/scheduling/NotificationCenter";
import { ThemeToggle } from "@/components/ThemeToggle";
import ethioTelecomLogo from "@/assets/ethio-telecom-logo.png";

// Map routes to translation keys
const routeTitleKeys: Record<string, string> = {
  "/": "nav.dashboard",
  "/map": "nav.liveTracking",
  "/vehicles": "nav.vehicles",
  "/fleet": "nav.fleetManagement",
  "/drivers": "nav.drivers",
  "/driver-scoring": "nav.driverScoring",
  "/devices": "nav.devices",
  "/fuel": "nav.fuelMonitoring",
  "/speed-governor": "nav.speedGovernor",
  "/incidents": "nav.incidents",
  "/routes": "nav.routes",
  "/route-history": "nav.routeHistory",
  "/geofencing": "nav.geofences",
  "/alerts": "nav.alerts",
  "/maintenance": "nav.maintenance",
  "/work-orders": "nav.workOrders",
  "/fleet-scheduling": "nav.fleetScheduling",
  "/dispatch": "nav.dispatch",
  "/reports": "nav.reports",
  "/settings": "nav.settings",
  "/users": "nav.users",
  "/security": "nav.security",
  "/security-dashboard": "nav.securityDashboard",
  "/integrations": "nav.integrations",
  "/administration": "nav.administration",
  "/config": "nav.systemConfig",
};

export function MobileHeader() {
  const location = useLocation();
  const { t } = useTranslation();
  
  // Get the title for current route
  const getTitle = () => {
    const basePath = "/" + location.pathname.split("/")[1];
    const key = routeTitleKeys[basePath] || routeTitleKeys[location.pathname];
    return key ? t(key) : "FleetTrack";
  };

  return (
    <header className="sticky top-0 z-40 md:hidden">
      {/* Status bar safe area */}
      <div className="h-safe-top bg-surface-card" />
      
      {/* Header content */}
      <div className="bg-surface-card/95 backdrop-blur-xl border-b border-surface-border/50">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Logo and title */}
          <div className="flex items-center gap-3">
            <img 
              src={ethioTelecomLogo} 
              alt="ethio telecom" 
              className="h-7 w-auto object-contain dark:[filter:invert(1)_hue-rotate(180deg)]"
            />
            <div className="h-4 w-px bg-surface-overlay" />
            <h1 className="text-sm font-semibold text-surface-foreground truncate max-w-[140px]">
              {getTitle()}
            </h1>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-1">
            <NotificationCenter />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
