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
}

export const SidebarMenuItem = ({
  icon: Icon,
  label,
  path,
  subItems,
  highlight,
}: SidebarMenuItemProps) => {
  const location = useLocation();
  const isActive = path ? location.pathname === path : false;
  const isChildActive = subItems?.some((item) => location.pathname === item.path);
  const [isOpen, setIsOpen] = useState(isChildActive);

  // If no sub-items, render a simple link
  if (!subItems || subItems.length === 0) {
    return (
      <Link
        to={path || "/"}
        className={cn(
          "flex items-center gap-2.5 px-3 py-2 rounded-md transition-all duration-200 group relative text-sm",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
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
              ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
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
          const isSubActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-200 text-sm border-l-2 ml-2",
                isSubActive
                  ? "border-primary bg-sidebar-accent/50 text-sidebar-accent-foreground font-medium"
                  : "border-sidebar-border text-sidebar-foreground/60 hover:bg-sidebar-accent/30 hover:text-sidebar-accent-foreground hover:border-primary/50"
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
