import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  Satellite,
  Map,
  Route,
  Radar,
  Layers,
  Thermometer,
  Navigation,
  Target,
  Compass,
  Ruler,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  MapPin,
} from 'lucide-react';

interface MapToolbarProps {
  mapStyle: 'streets' | 'satellite';
  onStyleChange: (style: 'streets' | 'satellite') => void;
  showTrails: boolean;
  onTrailsToggle: () => void;
  showNearby: boolean;
  onNearbyToggle: () => void;
  showHeatmap: boolean;
  onHeatmapToggle: () => void;
  showGeofences: boolean;
  onGeofencesToggle: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetBearing?: () => void;
  onCenterOnFleet?: () => void;
  className?: string;
}

export const MapToolbar = ({
  mapStyle,
  onStyleChange,
  showTrails,
  onTrailsToggle,
  showNearby,
  onNearbyToggle,
  showHeatmap,
  onHeatmapToggle,
  showGeofences,
  onGeofencesToggle,
  onZoomIn,
  onZoomOut,
  onResetBearing,
  onCenterOnFleet,
  className,
}: MapToolbarProps) => {
  const tools = [
    {
      id: 'style',
      items: [
        { 
          id: 'satellite', 
          icon: Satellite, 
          label: 'Satellite View', 
          active: mapStyle === 'satellite',
          onClick: () => onStyleChange('satellite'),
        },
        { 
          id: 'streets', 
          icon: Map, 
          label: 'Streets View', 
          active: mapStyle === 'streets',
          onClick: () => onStyleChange('streets'),
        },
      ],
    },
  ];

  const toggleTools = [
    { 
      id: 'trails', 
      icon: Route, 
      label: 'Vehicle Trails', 
      active: showTrails,
      onClick: onTrailsToggle,
      color: 'text-primary',
    },
    { 
      id: 'nearby', 
      icon: Radar, 
      label: 'Nearby Search', 
      active: showNearby,
      onClick: onNearbyToggle,
      color: 'text-blue-500',
    },
    { 
      id: 'heatmap', 
      icon: Thermometer, 
      label: 'Activity Heatmap', 
      active: showHeatmap,
      onClick: onHeatmapToggle,
      color: 'text-orange-500',
    },
    { 
      id: 'geofences', 
      icon: Target, 
      label: 'Geofences', 
      active: showGeofences,
      onClick: onGeofencesToggle,
      color: 'text-purple-500',
    },
  ];

  const zoomTools = [
    { id: 'zoomIn', icon: ZoomIn, label: 'Zoom In', onClick: onZoomIn },
    { id: 'zoomOut', icon: ZoomOut, label: 'Zoom Out', onClick: onZoomOut },
    { id: 'resetBearing', icon: Compass, label: 'Reset North', onClick: onResetBearing },
    { id: 'centerFleet', icon: MapPin, label: 'Center on Fleet', onClick: onCenterOnFleet },
  ];

  return (
    <TooltipProvider>
      <div className={cn("absolute left-4 top-20 z-20 flex flex-col gap-2", className)}>
        {/* Map Style Toggle */}
        <div className="bg-background/90 backdrop-blur-xl rounded-xl border border-border/50 shadow-xl p-1 flex">
          {tools[0].items.map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <Button
                  variant={item.active ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    "h-9 gap-2 rounded-lg",
                    item.active && "shadow-md"
                  )}
                  onClick={item.onClick}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs">{item.id === 'satellite' ? 'Satellite' : 'Streets'}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Toggle Tools */}
        <div className="bg-background/90 backdrop-blur-xl rounded-xl border border-border/50 shadow-xl p-1.5 flex flex-col gap-1">
          {toggleTools.map((tool) => (
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <Button
                  variant={tool.active ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    "h-9 w-9 rounded-lg p-0 transition-all",
                    tool.active && "bg-primary/10 ring-1 ring-primary/30"
                  )}
                  onClick={tool.onClick}
                >
                  <tool.icon className={cn(
                    "w-4 h-4 transition-colors",
                    tool.active ? tool.color : "text-muted-foreground"
                  )} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{tool.label}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Zoom Controls */}
        <div className="bg-background/90 backdrop-blur-xl rounded-xl border border-border/50 shadow-xl p-1.5 flex flex-col gap-1">
          {zoomTools.map((tool) => (
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 rounded-lg p-0"
                  onClick={tool.onClick}
                >
                  <tool.icon className="w-4 h-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{tool.label}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Status Legend */}
        <div className="bg-background/90 backdrop-blur-xl rounded-xl border border-border/50 shadow-xl p-3">
          <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">
            Status
          </div>
          <div className="space-y-1.5">
            {[
              { label: 'Moving', color: 'bg-emerald-500', pulse: true },
              { label: 'Idle', color: 'bg-amber-500' },
              { label: 'Stopped', color: 'bg-slate-400' },
              { label: 'Offline', color: 'bg-rose-500' },
            ].map((status) => (
              <div key={status.label} className="flex items-center gap-2">
                <div className={cn(
                  "w-2.5 h-2.5 rounded-full",
                  status.color,
                  status.pulse && "animate-pulse"
                )} />
                <span className="text-xs text-muted-foreground">{status.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};
