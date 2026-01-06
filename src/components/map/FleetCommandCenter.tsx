import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  Command,
  Search,
  MessageSquare,
  Bell,
  Shield,
  Zap,
  Radio,
  Volume2,
  Phone,
  Navigation,
  LocateFixed,
  RefreshCw,
  Maximize2,
  Layers,
  X,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  Car,
} from 'lucide-react';

interface FleetCommandCenterProps {
  onSearch: (query: string) => void;
  onEmergencyBroadcast?: () => void;
  onLocateAll?: () => void;
  onRefresh?: () => void;
  onFullscreen?: () => void;
  onToggleHeatmap?: () => void;
  activeAlerts: number;
  sosActive?: boolean;
  searchQuery: string;
}

export const FleetCommandCenter = ({
  onSearch,
  onEmergencyBroadcast,
  onLocateAll,
  onRefresh,
  onFullscreen,
  onToggleHeatmap,
  activeAlerts,
  sosActive = false,
  searchQuery,
}: FleetCommandCenterProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  return (
    <TooltipProvider>
      <div className={cn(
        "absolute top-4 left-1/2 -translate-x-1/2 z-30 transition-all duration-500",
        isExpanded ? "w-[600px] max-w-[calc(100vw-32px)]" : "w-auto"
      )}>
        <div className={cn(
          "relative bg-background/80 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl overflow-hidden transition-all duration-300",
          sosActive && "ring-2 ring-destructive ring-offset-2 ring-offset-background animate-pulse"
        )}>
          {/* Gradient accent top */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-primary/50 to-primary" />
          
          {isExpanded ? (
            <div className="p-3 space-y-3">
              {/* Search Bar with Quick Actions */}
              <div className="flex items-center gap-2">
                <div className={cn(
                  "flex-1 relative transition-all duration-300",
                  isSearchFocused && "scale-[1.02]"
                )}>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search vehicles, drivers, or locations..."
                    value={searchQuery}
                    onChange={(e) => onSearch(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    className={cn(
                      "pl-10 pr-10 h-10 bg-muted/50 border-0 rounded-xl transition-all",
                      isSearchFocused && "bg-background ring-2 ring-primary/30"
                    )}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => onSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                    </button>
                  )}
                </div>
                
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary"
                        onClick={onLocateAll}
                      >
                        <LocateFixed className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Fit All Vehicles</TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary"
                        onClick={onRefresh}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Refresh Data</TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary"
                        onClick={onFullscreen}
                      >
                        <Maximize2 className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Fullscreen Mode</TooltipContent>
                  </Tooltip>
                </div>
              </div>
              
              {/* Quick Action Buttons */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 rounded-lg text-xs font-medium border-border/50 hover:bg-muted/80"
                        onClick={onToggleHeatmap}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        Heatmap
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Toggle Activity Heatmap</TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={sosActive ? "destructive" : "outline"}
                        size="sm"
                        className={cn(
                          "h-8 gap-1.5 rounded-lg text-xs font-medium",
                          sosActive 
                            ? "animate-pulse" 
                            : "border-border/50 hover:bg-muted/80"
                        )}
                        onClick={onEmergencyBroadcast}
                      >
                        <Radio className="w-3.5 h-3.5" />
                        Broadcast
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Emergency Broadcast to All Drivers</TooltipContent>
                  </Tooltip>
                </div>
                
                {/* Alerts Badge */}
                {activeAlerts > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-destructive animate-pulse" />
                    <span className="text-xs font-semibold text-destructive">
                      {activeAlerts} Active Alert{activeAlerts > 1 ? 's' : ''}
                    </span>
                  </div>
                )}
                
                {/* Collapse Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => setIsExpanded(false)}
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-2 flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
                <Command className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Fleet Command</span>
              </div>
              
              {activeAlerts > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  {activeAlerts}
                </Badge>
              )}
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => setIsExpanded(true)}
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};
