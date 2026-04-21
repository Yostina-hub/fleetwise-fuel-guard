import { useNavigate, useLocation } from "react-router-dom";
import { Car, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Top-level tab switcher used by both /vehicles (Owned Fleet) and
 * /rental-vehicles (Rental & Outsource). Lives at the top of each page
 * so users can flip between them without an extra sidebar entry.
 */
export function VehiclesTabSwitcher({
  active,
}: {
  active: "owned" | "rental";
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { id: "owned" as const, label: "Owned Fleet", icon: Car, path: "/vehicles" },
    { id: "rental" as const, label: "Rental Vehicles", icon: Truck, path: "/rental-vehicles" },
  ];

  return (
    <div
      className={cn(
        "flex items-center gap-1 p-1 rounded-lg bg-muted/40 border border-border/60 w-fit",
        "shadow-sm"
      )}
      role="tablist"
      aria-label="Vehicles view"
    >
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => {
              if (location.pathname !== tab.path) navigate(tab.path);
            }}
            className={cn(
              "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-sm font-medium",
              "transition-all duration-200",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            <Icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
