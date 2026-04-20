import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Zap, ArrowRight, Sparkles } from "lucide-react";
import TEMPLATES from "@/components/workflow/workflowTemplates";

const FLEET_CATEGORIES = ["operations", "safety", "sensors", "cold_chain"] as const;

/**
 * Compact dropdown that surfaces all Fleet Automations from a single button.
 * Replaces the standalone Fleet Automations card and lives next to Import/Export.
 */
export const FleetAutomationsMenu = () => {
  const navigate = useNavigate();
  const items = TEMPLATES.filter((t) => (FLEET_CATEGORIES as readonly string[]).includes(t.category));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Zap className="w-4 h-4 text-primary" aria-hidden="true" />
          <span className="hidden sm:inline">Automations</span>
          <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-medium">
            {items.length}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span className="text-xs font-semibold">Fleet Automations</span>
          <button
            type="button"
            onClick={() => navigate("/workflow-builder")}
            className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
          >
            <Sparkles className="h-3 w-3" /> All
          </button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-2 py-6 text-center text-xs text-muted-foreground">
              No automations available
            </div>
          ) : (
            items.map((tpl) => (
              <DropdownMenuItem
                key={tpl.id}
                className="gap-2 py-2 cursor-pointer"
                onSelect={() => navigate(`/workflow-builder?template=${tpl.id}`)}
              >
                <span className="text-base leading-none">{tpl.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{tpl.name}</div>
                  <div className="text-[10px] text-muted-foreground capitalize">
                    {tpl.category.replace("_", " ")}
                  </div>
                </div>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default FleetAutomationsMenu;
