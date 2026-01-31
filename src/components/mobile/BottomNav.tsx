import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Map, Car, Bell, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface BottomNavProps {
  onMenuClick: () => void;
}

const navItems = [
  { icon: LayoutDashboard, label: "Home", path: "/" },
  { icon: Map, label: "Track", path: "/map" },
  { icon: Car, label: "Fleet", path: "/vehicles" },
  { icon: Bell, label: "Alerts", path: "/alerts" },
];

export function BottomNav({ onMenuClick }: BottomNavProps) {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Blur backdrop */}
      <div className="absolute inset-0 bg-[#0d1520]/90 backdrop-blur-xl border-t border-[#2a3a4d]/50" />
      
      {/* Safe area padding for home indicator */}
      <div className="relative flex items-center justify-around px-2 pt-2 pb-safe">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 py-2 px-4 rounded-xl transition-all duration-200",
                "active:scale-95 touch-manipulation",
                active ? "text-primary" : "text-white/50"
              )}
            >
              {active && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute inset-0 bg-primary/15 rounded-xl"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <item.icon className={cn(
                "relative z-10 transition-transform duration-200",
                active ? "w-6 h-6" : "w-5 h-5"
              )} />
              <span className={cn(
                "relative z-10 text-[10px] font-medium transition-all duration-200",
                active ? "opacity-100" : "opacity-70"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
        
        {/* Menu button */}
        <button
          onClick={onMenuClick}
          className={cn(
            "relative flex flex-col items-center justify-center gap-0.5 py-2 px-4 rounded-xl transition-all duration-200",
            "active:scale-95 touch-manipulation text-white/50"
          )}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-medium opacity-70">More</span>
        </button>
      </div>
    </nav>
  );
}
