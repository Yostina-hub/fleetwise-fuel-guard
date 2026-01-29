import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { SidebarMenuItem } from "@/components/sidebar/SidebarMenuItem";
import type { LucideIcon } from "lucide-react";

type SubItem = {
  label: string;
  path: string;
};

export type NavItem = {
  icon: LucideIcon;
  label: string;
  path?: string;
  subItems?: SubItem[];
  highlight?: boolean;
};

export type AdminItem = {
  label: string;
  path: string;
  icon: LucideIcon;
};

interface SidebarNavProps {
  navItems: NavItem[];
  adminItems: AdminItem[];
  isSuperAdmin: boolean;
  isDark: boolean;
}

// Pinned items so they never get scrolled out of view.
// IMPORTANT: normalize paths (strip query + trailing slash) so aliases like "/vehicles/" don't break pinning.
const QUICK_PATHS = new Set(["/", "/map", "/vehicles"]);

const normalizePath = (path: string) => {
  const base = path.split("?")[0] ?? path;
  if (base.length > 1 && base.endsWith("/")) return base.slice(0, -1);
  return base;
};

const isQuickPath = (path?: string) => {
  if (!path) return false;
  return QUICK_PATHS.has(normalizePath(path));
};

export function SidebarNav({ navItems, adminItems, isSuperAdmin, isDark }: SidebarNavProps) {
  const location = useLocation();

  const quickItems = navItems.filter((item) => isQuickPath(item.path));
  const restItems = navItems.filter((item) => !isQuickPath(item.path));

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Quick (non-scroll) */}
      <div className="px-2 py-3 space-y-0.5 shrink-0">
        {quickItems.map((item) => (
          <SidebarMenuItem
            key={item.path}
            icon={item.icon}
            label={item.label}
            path={item.path}
            subItems={item.subItems}
            highlight={item.highlight}
            isDark={isDark}
          />
        ))}
      </div>

      <div className={cn("border-t", isDark ? "border-[#2a3a4d]/50" : "border-border")} />

      {/* Main (scroll) */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto custom-scrollbar min-h-0">
        {restItems.map((item, index) => (
          <SidebarMenuItem
            key={item.path || `menu-${index}`}
            icon={item.icon}
            label={item.label}
            path={item.path}
            subItems={item.subItems}
            highlight={item.highlight}
            isDark={isDark}
          />
        ))}

        {isSuperAdmin && (
          <>
            <div className="pt-3 pb-1.5">
              <div className={cn(
                "px-3 text-[10px] font-semibold uppercase tracking-wider",
                isDark ? "text-white/50" : "text-muted-foreground"
              )}>
                Admin
              </div>
            </div>
            {adminItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md transition-all duration-200 group text-sm",
                  location.pathname === item.path
                    ? isDark
                      ? "bg-primary/20 text-white shadow-sm"
                      : "bg-primary/10 text-foreground shadow-sm"
                    : isDark
                      ? "text-white/70 hover:bg-[#2a3a4d] hover:text-white"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </>
        )}
      </nav>
    </div>
  );
}
