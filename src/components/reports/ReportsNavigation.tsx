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

      {/* Main Tabs - Tech Style */}
      <div className="rounded-xl border border-cyan-500/20 p-1.5" style={{ background: 'linear-gradient(135deg, #001a33 0%, #002244 50%, #001a33 100%)' }}>
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
                      ? "bg-gradient-to-r from-[#8DC63F] to-[#6ba32d] text-white shadow-md shadow-[#8DC63F]/25"
                      : "text-white/60 hover:text-white hover:bg-white/10"
                  )}
                >
                  {Icon && <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-cyan-400")} aria-hidden="true" />}
                  {tab.label}
                </button>
              );
            })}
          </nav>
          <ScrollBar orientation="horizontal" className="invisible" />
        </ScrollArea>
      </div>

      {/* Sub Tabs - Tech Pill Style */}
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
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-500/20"
                      : "bg-[#001a33] text-white/60 border-white/10 hover:border-cyan-500/30 hover:text-white hover:bg-white/5"
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
