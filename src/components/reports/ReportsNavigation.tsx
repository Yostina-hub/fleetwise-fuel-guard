import { cn } from "@/lib/utils";
import { LucideIcon, List, Calendar } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Tab {
  id: string;
  label: string;
  icon?: LucideIcon;
}

interface ReportsNavigationProps {
  mainTabs: Tab[];
  subTabs: Tab[];
  activeMainTab: string;
  activeSubTab: string;
  onMainTabChange: (id: string) => void;
  onSubTabChange: (id: string) => void;
  viewMode?: "catalog" | "report";
  onViewModeChange?: (mode: "catalog" | "report") => void;
}

export const ReportsNavigation = ({
  mainTabs,
  subTabs,
  activeMainTab,
  activeSubTab,
  onMainTabChange,
  onSubTabChange,
  viewMode = "report",
  onViewModeChange,
}: ReportsNavigationProps) => {
  return (
    <div className="space-y-4">
      {/* View Mode Toggle */}
      {onViewModeChange && (
        <div className="flex items-center justify-between">
          <Tabs value={viewMode} onValueChange={(v) => onViewModeChange(v as "catalog" | "report")}>
            <TabsList className="bg-muted/50">
              <TabsTrigger value="catalog" className="gap-2 data-[state=active]:bg-background">
                <List className="w-4 h-4" />
                My Reports
              </TabsTrigger>
              <TabsTrigger value="report" className="gap-2 data-[state=active]:bg-background">
                <Calendar className="w-4 h-4" />
                Scheduled & Custom
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Main Tabs - Card Style */}
      <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-1.5">
        <ScrollArea className="w-full">
          <nav className="flex gap-1" role="tablist" aria-label="Report categories">
            {mainTabs.map((tab) => {
              const isActive = activeMainTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onMainTabChange(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {Icon && <Icon className="w-4 h-4" aria-hidden="true" />}
                  {tab.label}
                </button>
              );
            })}
          </nav>
          <ScrollBar orientation="horizontal" className="invisible" />
        </ScrollArea>
      </div>

      {/* Sub Tabs - Pill Style */}
      {subTabs.length > 0 && (
        <ScrollArea className="w-full">
          <div className="flex items-center gap-2 pb-1" role="tablist" aria-label="Report sub-categories">
            {subTabs.map((tab) => {
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onSubTabChange(tab.id)}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 whitespace-nowrap border",
                    isActive
                      ? "bg-secondary text-secondary-foreground border-secondary shadow-sm"
                      : "bg-background text-muted-foreground border-border/50 hover:border-border hover:text-foreground hover:bg-muted/30"
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" className="invisible" />
        </ScrollArea>
      )}
    </div>
  );
};
