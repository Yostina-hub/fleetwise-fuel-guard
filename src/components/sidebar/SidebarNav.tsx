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
  isOrgAdmin?: boolean;
  isDark: boolean;
  isCollapsed?: boolean;
}

// Pinned paths - these items ALWAYS appear in the non-scrollable quick section
// Using an array for order preservation and explicit matching
const PINNED_PATHS = ["/", "/map", "/vehicles"] as const;

// Normalize path by removing query strings and trailing slashes
const normalizePath = (path: string): string => {
  // Remove query string
  const base = path.split("?")[0] || path;
  // Remove trailing slash (except for root "/")
  if (base.length > 1 && base.endsWith("/")) {
    return base.slice(0, -1);
  }
  return base;
};

// Check if a nav item should be pinned (non-scrollable)
const isPinnedItem = (item: NavItem): boolean => {
  // Items with subItems are never pinned (they go to scrollable section)
  if (item.subItems && item.subItems.length > 0) {
    return false;
  }
  // Items without a path are never pinned
  if (!item.path) {
    return false;
  }
  // Check if the normalized path matches any pinned path
  const normalized = normalizePath(item.path);
  return PINNED_PATHS.includes(normalized as typeof PINNED_PATHS[number]);
};

export function SidebarNav({ navItems, adminItems, isSuperAdmin, isOrgAdmin = false, isDark, isCollapsed = false }: SidebarNavProps) {
  const location = useLocation();

  // Separate pinned (quick) items from scrollable items
  // Use stable filtering to prevent React reconciliation issues
  const pinnedItems = navItems.filter(isPinnedItem);
  const scrollableItems = navItems.filter((item) => !isPinnedItem(item));

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Pinned Quick Access Section - Never scrolls, always visible */}
      {pinnedItems.length > 0 && (
        <div className={cn("py-3 space-y-0.5 shrink-0 flex-none", isCollapsed ? "px-1.5" : "px-2")}>
          {pinnedItems.map((item, index) => (
            <SidebarMenuItem
              key={`pinned-${item.path || index}`}
              icon={item.icon}
              label={item.label}
              path={item.path}
              subItems={item.subItems}
              highlight={item.highlight}
              isDark={isDark}
              isCollapsed={isCollapsed}
            />
          ))}
        </div>
      )}

      {pinnedItems.length > 0 && (
        <div className={cn("border-t shrink-0", isDark ? "border-[#2a3a4d]/50" : "border-border")} />
      )}

      {/* Main Scrollable Navigation Section */}
      <nav className={cn("flex-1 py-3 space-y-0.5 overflow-y-auto custom-scrollbar min-h-0", isCollapsed ? "px-1.5" : "px-2")}>
        {scrollableItems.map((item, index) => (
          <SidebarMenuItem
            key={`scroll-${item.path || `menu-${index}`}`}
            icon={item.icon}
            label={item.label}
            path={item.path}
            subItems={item.subItems}
            highlight={item.highlight}
            isDark={isDark}
            isCollapsed={isCollapsed}
          />
        ))}

        {(isSuperAdmin || isOrgAdmin) && (
          <>
            {!isCollapsed && (
              <div className="pt-3 pb-1.5">
                <div className={cn(
                  "px-3 text-[10px] font-semibold uppercase tracking-wider",
                  isDark ? "text-white/50" : "text-muted-foreground"
                )}>
                  Admin
                </div>
              </div>
            )}
            {isCollapsed && <div className="border-t border-[#2a3a4d]/50 my-2" />}
            {adminItems
              .filter((item) => {
                // org_admin only sees Users
                if (!isSuperAdmin && isOrgAdmin) {
                  return item.path === "/users";
                }
                return true;
              })
              .map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md transition-all duration-200 group text-sm",
                  isCollapsed && "justify-center px-2",
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
                {!isCollapsed && <span className="font-medium">{item.label}</span>}
              </Link>
            ))}
          </>
        )}
      </nav>
    </div>
  );
}
