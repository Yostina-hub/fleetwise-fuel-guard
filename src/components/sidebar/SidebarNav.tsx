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
}

// Pinned items so they never get scrolled out of view.
const QUICK_PATHS = new Set(["/", "/map", "/vehicles"]);

export function SidebarNav({ navItems, adminItems, isSuperAdmin }: SidebarNavProps) {
  const location = useLocation();

  const quickItems = navItems.filter((item) => item.path && QUICK_PATHS.has(item.path));
  const restItems = navItems.filter((item) => !(item.path && QUICK_PATHS.has(item.path)));

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
          />
        ))}
      </div>

      <div className="border-t border-sidebar-border/50" />

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
          />
        ))}

        {isSuperAdmin && (
          <>
            <div className="pt-3 pb-1.5">
              <div className="px-3 text-[10px] font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
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
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
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
