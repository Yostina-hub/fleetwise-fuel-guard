import { useRef, useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VehicleMiniCard } from './VehicleMiniCard';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';
import {
  Search,
  X,
  Filter,
  ChevronLeft,
  ChevronRight,
  Car,
  Navigation,
  Power,
  Clock,
  WifiOff,
  AlertTriangle,
  SortAsc,
  LayoutGrid,
  List,
} from 'lucide-react';

interface Vehicle {
  id: string;
  plate: string;
  status: 'moving' | 'idle' | 'stopped' | 'offline';
  lat: number;
  lng: number;
  speed: number;
  fuel: number;
  heading?: number;
  engine_on?: boolean;
  lastSeen?: string;
  isOffline?: boolean;
  speedLimit?: number;
  driverName?: string;
  gps_jamming_detected?: boolean;
  gps_spoofing_detected?: boolean;
}

interface FleetSidebarProps {
  vehicles: Vehicle[];
  selectedVehicleId?: string;
  onVehicleSelect: (vehicle: Vehicle) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: 'all' | 'online' | 'moving' | 'idle' | 'stopped' | 'offline';
  onStatusFilterChange: (filter: 'all' | 'online' | 'moving' | 'idle' | 'stopped' | 'offline') => void;
  isLoading?: boolean;
}

type SortOption = 'plate' | 'speed' | 'fuel' | 'status' | 'lastSeen';

export const FleetSidebar = ({
  vehicles,
  selectedVehicleId,
  onVehicleSelect,
  isCollapsed,
  onToggleCollapse,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  isLoading = false,
}: FleetSidebarProps) => {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [sortBy, setSortBy] = useState<SortOption>('plate');
  const [sortAsc, setSortAsc] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Calculate counts
  const counts = useMemo(() => ({
    all: vehicles.length,
    online: vehicles.filter(v => !v.isOffline).length,
    moving: vehicles.filter(v => v.status === 'moving').length,
    idle: vehicles.filter(v => v.status === 'idle').length,
    stopped: vehicles.filter(v => v.status === 'stopped').length,
    offline: vehicles.filter(v => v.isOffline).length,
  }), [vehicles]);

  // Filter and sort vehicles
  const filteredVehicles = useMemo(() => {
    let filtered = [...vehicles];
    
    // Apply status filter
    if (statusFilter === 'online') {
      filtered = filtered.filter(v => !v.isOffline);
    } else if (statusFilter === 'offline') {
      filtered = filtered.filter(v => v.isOffline);
    } else if (statusFilter !== 'all') {
      filtered = filtered.filter(v => v.status === statusFilter);
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(v => 
        v.plate.toLowerCase().includes(query) ||
        v.driverName?.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'plate':
          comparison = a.plate.localeCompare(b.plate);
          break;
        case 'speed':
          comparison = b.speed - a.speed;
          break;
        case 'fuel':
          comparison = a.fuel - b.fuel;
          break;
        case 'status':
          const statusOrder = { moving: 0, idle: 1, stopped: 2, offline: 3 };
          comparison = statusOrder[a.status] - statusOrder[b.status];
          break;
        case 'lastSeen':
          comparison = new Date(b.lastSeen || 0).getTime() - new Date(a.lastSeen || 0).getTime();
          break;
      }
      return sortAsc ? comparison : -comparison;
    });
    
    return filtered;
  }, [vehicles, searchQuery, statusFilter, sortBy, sortAsc]);

  // Virtual list for performance
  const rowVirtualizer = useVirtualizer({
    count: filteredVehicles.length,
    getScrollElement: () => sidebarRef.current,
    estimateSize: () => viewMode === 'grid' ? 100 : 88,
    overscan: 5,
  });

  const statusTabs = [
    { value: 'all', label: 'All', icon: Car, count: counts.all },
    { value: 'moving', label: 'Moving', icon: Navigation, count: counts.moving, color: 'text-emerald-500' },
    { value: 'idle', label: 'Idle', icon: Power, count: counts.idle, color: 'text-amber-500' },
    { value: 'stopped', label: 'Stopped', icon: Clock, count: counts.stopped, color: 'text-slate-400' },
    { value: 'offline', label: 'Offline', icon: WifiOff, count: counts.offline, color: 'text-rose-500' },
  ];

  return (
    <>
      {/* Toggle Button */}
      <Button
        variant="secondary"
        size="icon"
        className={cn(
          "fixed top-1/2 -translate-y-1/2 z-30 h-12 w-6 rounded-l-xl rounded-r-none shadow-xl transition-all duration-300 border-l-0",
          "bg-background/90 backdrop-blur-xl hover:bg-background",
          isCollapsed ? "right-0" : "right-[340px]"
        )}
        onClick={onToggleCollapse}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <ChevronLeft className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </Button>

      {/* Sidebar */}
      <div className={cn(
        "fixed top-0 right-0 h-full bg-background/95 backdrop-blur-xl border-l border-border/50",
        "shadow-2xl transition-all duration-300 z-20 flex flex-col",
        isCollapsed ? "w-0 overflow-hidden opacity-0" : "w-[340px] opacity-100"
      )}>
        {/* Header */}
        <div className="p-4 border-b border-border/50 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Fleet Vehicles</h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {counts.online} online
                </div>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">{counts.moving} moving</span>
              </div>
            </div>
            <Badge variant="outline" className="gap-1.5 text-xs font-semibold bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </Badge>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by plate or driver..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 pr-10 h-10 bg-muted/50 border-0 rounded-xl"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {statusTabs.map((tab) => (
              <Button
                key={tab.value}
                variant={statusFilter === tab.value ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-8 gap-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0",
                  statusFilter === tab.value 
                    ? "" 
                    : "hover:bg-muted/80"
                )}
                onClick={() => onStatusFilterChange(tab.value as typeof statusFilter)}
              >
                <tab.icon className={cn("w-3.5 h-3.5", statusFilter !== tab.value && tab.color)} />
                <span>{tab.count}</span>
              </Button>
            ))}
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="h-8 text-xs flex-1 bg-muted/50 border-0 rounded-lg">
                <div className="flex items-center gap-1.5">
                  <SortAsc className="w-3.5 h-3.5" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="plate">Plate Number</SelectItem>
                <SelectItem value="speed">Speed</SelectItem>
                <SelectItem value="fuel">Fuel Level</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="lastSeen">Last Seen</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8 rounded-lg", !sortAsc && "bg-muted")}
              onClick={() => setSortAsc(!sortAsc)}
            >
              <SortAsc className={cn("w-4 h-4 transition-transform", !sortAsc && "rotate-180")} />
            </Button>
            <div className="flex rounded-lg bg-muted/50 p-0.5">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7 rounded-md"
                onClick={() => setViewMode('list')}
              >
                <List className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7 rounded-md"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Vehicle List */}
        <div ref={sidebarRef} className="flex-1 overflow-auto p-3">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground">
              <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm font-medium">No vehicles found</p>
              <p className="text-xs">Try adjusting your filters</p>
            </div>
          ) : (
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const vehicle = filteredVehicles[virtualRow.index];
                return (
                  <div
                    key={vehicle.id}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className="pb-2"
                  >
                    <VehicleMiniCard
                      vehicle={vehicle}
                      isSelected={selectedVehicleId === vehicle.id}
                      onClick={() => onVehicleSelect(vehicle)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="p-3 border-t border-border/50 bg-muted/30">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Showing {filteredVehicles.length} of {vehicles.length}</span>
            <span className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Auto-updating
            </span>
          </div>
        </div>
      </div>
    </>
  );
};
