import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { NotificationCenter } from "@/components/scheduling/NotificationCenter";
import { ThemeToggle } from "@/components/ThemeToggle";
import ethioTelecomLogo from "@/assets/ethio-telecom-logo.png";

// Map routes to page titles
const routeTitles: Record<string, string> = {
  "/": "Dashboard",
  "/map": "Live Tracking",
  "/vehicles": "Vehicles",
  "/fleet": "Fleet Management",
  "/drivers": "Drivers",
  "/driver-scoring": "Driver Scoring",
  "/devices": "Device Management",
  "/fuel": "Fuel Monitoring",
  "/speed-governor": "Speed Governor",
  "/incidents": "Incidents",
  "/routes": "Customer Sites",
  "/route-history": "Journey History",
  "/geofencing": "Geofences",
  "/alerts": "Alerts",
  "/maintenance": "Service History",
  "/work-orders": "Work Orders",
  "/fleet-scheduling": "Trip Management",
  "/dispatch": "Dispatch Jobs",
  "/reports": "Reports",
  "/settings": "Settings",
  "/users": "Users",
  "/security": "Security",
  "/security-dashboard": "Security Dashboard",
  "/integrations": "Integrations",
  "/administration": "Administration",
  "/config": "System Config",
};

export function MobileHeader() {
  const location = useLocation();
  
  // Get the title for current route
  const getTitle = () => {
    const basePath = "/" + location.pathname.split("/")[1];
    return routeTitles[basePath] || routeTitles[location.pathname] || "FleetTrack";
  };

  return (
    <header className="sticky top-0 z-40 md:hidden">
      {/* Status bar safe area */}
      <div className="h-safe-top bg-[#0d1520]" />
      
      {/* Header content */}
      <div className="bg-[#0d1520]/95 backdrop-blur-xl border-b border-[#2a3a4d]/50">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Logo and title */}
          <div className="flex items-center gap-3">
            <img 
              src={ethioTelecomLogo} 
              alt="ethio telecom" 
              className="h-7 w-auto object-contain"
            />
            <div className="h-4 w-px bg-[#2a3a4d]" />
            <h1 className="text-sm font-semibold text-white truncate max-w-[140px]">
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
