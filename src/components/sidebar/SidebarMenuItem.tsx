import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ChevronDown, LucideIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface SubItem {
  label: string;
  path: string;
}

interface SidebarMenuItemProps {
  icon: LucideIcon;
  label: string;
  path?: string;
  subItems?: SubItem[];
  highlight?: boolean;
  isDark?: boolean;
}

// Helper to check if path matches (handles query params)
const isPathActive = (currentPath: string, currentSearch: string, itemPath: string) => {
  const [basePath, queryString] = itemPath.split('?');
  
  // Check base path first
  if (currentPath !== basePath) return false;
  
  // If item has query params, check they match
  if (queryString) {
    const itemParams = new URLSearchParams(queryString);
    const currentParams = new URLSearchParams(currentSearch);
    for (const [key, value] of itemParams.entries()) {
      if (currentParams.get(key) !== value) return false;
    }
    return true;
  }
  
  // Base path matches and no query params required
  return true;
};

export const SidebarMenuItem = ({
  icon: Icon,
  label,
  path,
  subItems,
  highlight,
  isDark = true,
}: SidebarMenuItemProps) => {
  const location = useLocation();
  const isActive = path ? isPathActive(location.pathname, location.search, path) : false;
  const isChildActive = subItems?.some((item) => 
    isPathActive(location.pathname, location.search, item.path)
  );
  const [isOpen, setIsOpen] = useState(isChildActive);

  // If no sub-items, render a simple link
  if (!subItems || subItems.length === 0) {
    return (
      <Link
        to={path || "/"}
        className={cn(
          "flex items-center gap-2.5 px-3 py-2 rounded-md transition-all duration-200 group relative text-sm",
          isActive
            ? isDark 
              ? "bg-primary/20 text-white shadow-sm"
              : "bg-primary/10 text-foreground shadow-sm"
            : isDark
              ? "text-white/70 hover:bg-[#2a3a4d] hover:text-white"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="font-medium truncate">{label}</span>
        {highlight && (
          <span className="ml-auto px-1.5 py-0.5 text-[9px] font-bold bg-primary text-primary-foreground rounded">
            NEW
          </span>
        )}
      </Link>
    );
  }

  // Render collapsible menu with sub-items
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-md transition-all duration-200 group text-sm",
            isChildActive
              ? isDark
                ? "bg-primary/20 text-white shadow-sm"
                : "bg-primary/10 text-foreground shadow-sm"
              : isDark
                ? "text-white/70 hover:bg-[#2a3a4d] hover:text-white"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <Icon className="w-4 h-4 shrink-0" />
          <span className="font-medium truncate">{label}</span>
          <ChevronDown
            className={cn(
              "ml-auto w-4 h-4 shrink-0 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-4 mt-0.5 space-y-0.5">
        {subItems.map((item) => {
          const isSubActive = isPathActive(location.pathname, location.search, item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-200 text-sm border-l-2 ml-2",
                isSubActive
                  ? isDark
                    ? "border-primary bg-primary/10 text-white font-medium"
                    : "border-primary bg-primary/10 text-foreground font-medium"
                  : isDark
                    ? "border-[#2a3a4d] text-white/60 hover:bg-[#2a3a4d]/50 hover:text-white hover:border-primary/50"
                    : "border-border text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground hover:border-primary/50"
              )}
            >
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
};
