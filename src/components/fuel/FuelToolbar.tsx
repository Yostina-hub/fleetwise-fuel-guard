import { Search, Filter, Settings, LayoutList, LayoutGrid } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FuelToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalCount: number;
  filteredCount: number;
  viewMode: "list" | "grid";
  onViewModeChange: (mode: "list" | "grid") => void;
  onFilterClick?: () => void;
  onSettingsClick?: () => void;
}

const FuelToolbar = ({
  searchQuery,
  onSearchChange,
  totalCount,
  filteredCount,
  viewMode,
  onViewModeChange,
  onFilterClick,
  onSettingsClick,
}: FuelToolbarProps) => {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Smart search..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 bg-background/50 border-border/50"
        />
      </div>

      {/* Count Badge */}
      <Badge 
        variant="default" 
        className="px-3 py-1.5 text-sm font-semibold bg-primary text-primary-foreground"
      >
        {filteredCount} / {totalCount} events
      </Badge>

      {/* Filter Button */}
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={onFilterClick}
      >
        <Filter className="w-4 h-4" />
        FILTER
      </Button>

      {/* Settings Button */}
      <Button
        variant="outline"
        size="sm"
        className="gap-2 bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
        onClick={onSettingsClick}
      >
        <Settings className="w-4 h-4" />
        SETTING
      </Button>

      {/* View Toggle */}
      <div className="flex items-center border rounded-md overflow-hidden">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "rounded-none h-9 px-3",
            viewMode === "list" && "bg-muted"
          )}
          onClick={() => onViewModeChange("list")}
          aria-label="List view"
        >
          <LayoutList className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "rounded-none h-9 px-3",
            viewMode === "grid" && "bg-muted"
          )}
          onClick={() => onViewModeChange("grid")}
          aria-label="Grid view"
        >
          <LayoutGrid className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default FuelToolbar;
