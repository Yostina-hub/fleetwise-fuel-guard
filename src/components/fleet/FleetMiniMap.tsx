import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Settings2, Layers, Map, Satellite, Play, Navigation, Grid3X3, Hash, Ruler, Fence } from "lucide-react";
import { useMapboxToken } from "@/hooks/useMapboxToken";

interface VehicleMarker {
  id: string;
  plate: string;
  lat: number;
  lng: number;
  status: 'moving' | 'idle' | 'offline';
}

interface FleetMiniMapProps {
  vehicles: VehicleMarker[];
  onVehicleClick?: (vehicleId: string) => void;
  className?: string;
}

const FleetMiniMap = ({ vehicles, onVehicleClick, className }: FleetMiniMapProps) => {
  const { token, loading: tokenLoading } = useMapboxToken();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Record<string, mapboxgl.Marker>>({});
  
  const [mapReady, setMapReady] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    mapView: true,
    satellite: false,
    play: false,
    traffic: false,
    clustering: true,
    vehicleNo: true,
    scale: true,
    geofence: false,
  });

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !token || map.current) return;

    mapboxgl.accessToken = token;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: settings.satellite 
        ? 'mapbox://styles/mapbox/satellite-streets-v12'
        : 'mapbox://styles/mapbox/streets-v12',
      center: [38.7578, 8.9806], // Ethiopia center
      zoom: 6,
    });

    map.current.on('load', () => {
      setMapReady(true);
    });

    return () => {
      Object.values(markersRef.current).forEach(m => m.remove());
      markersRef.current = {};
      map.current?.remove();
      map.current = null;
    };
  }, [token]);

  // Update markers when vehicles change
  useEffect(() => {
    if (!map.current || !mapReady) return;

    const validVehicles = vehicles.filter(v => 
      v.lat && v.lng && 
      isFinite(v.lat) && isFinite(v.lng) &&
      v.lat !== 0 && v.lng !== 0
    );

    // Remove old markers
    const currentIds = new Set(validVehicles.map(v => v.id));
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      if (!currentIds.has(id)) {
        marker.remove();
        delete markersRef.current[id];
      }
    });

    // Add/update markers
    validVehicles.forEach(vehicle => {
      const existingMarker = markersRef.current[vehicle.id];
      
      if (existingMarker) {
        existingMarker.setLngLat([vehicle.lng, vehicle.lat]);
      } else {
        // Create marker element
        const el = document.createElement('div');
        el.className = 'fleet-mini-marker';
        el.style.cssText = `
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        `;
        
        // Status color
        const color = vehicle.status === 'moving' ? '#22c55e' : 
                     vehicle.status === 'idle' ? '#eab308' : '#ef4444';
        
        el.innerHTML = `
          <div style="
            background: ${color};
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          ">${vehicle.plate}</div>
        `;

        el.onclick = () => onVehicleClick?.(vehicle.id);

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([vehicle.lng, vehicle.lat])
          .addTo(map.current!);

        markersRef.current[vehicle.id] = marker;
      }
    });

    // Fit bounds if we have vehicles
    if (validVehicles.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      validVehicles.forEach(v => bounds.extend([v.lng, v.lat]));
      
      if (validVehicles.length === 1) {
        map.current.flyTo({ center: [validVehicles[0].lng, validVehicles[0].lat], zoom: 14 });
      } else {
        map.current.fitBounds(bounds, { padding: 50, maxZoom: 12 });
      }
    }
  }, [vehicles, mapReady, onVehicleClick, settings.vehicleNo]);

  // Toggle satellite view
  useEffect(() => {
    if (!map.current || !mapReady) return;
    
    const style = settings.satellite 
      ? 'mapbox://styles/mapbox/satellite-streets-v12'
      : 'mapbox://styles/mapbox/streets-v12';
    
    map.current.setStyle(style);
  }, [settings.satellite, mapReady]);

  if (tokenLoading) {
    return (
      <div className={`bg-muted animate-pulse rounded-lg ${className}`}>
        <div className="h-full flex items-center justify-center text-muted-foreground">
          Loading map...
        </div>
      </div>
    );
  }

  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`}>
      <div ref={mapContainer} className="w-full h-full min-h-[400px]" />
      
      {/* Map Settings Panel */}
      <div className="absolute top-2 right-2 z-10">
        <Button 
          variant="secondary" 
          size="icon" 
          className="bg-white shadow-md"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings2 className="w-4 h-4" />
        </Button>
        
        {showSettings && (
          <Card className="absolute top-10 right-0 w-48 p-3 bg-white shadow-lg space-y-2">
            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <span>Osm</span>
              <span className="text-primary font-medium ml-auto">Google</span>
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1.5">
                <Map className="w-3 h-3" /> Map view
              </Label>
              <Switch 
                checked={settings.mapView} 
                onCheckedChange={(v) => setSettings(s => ({ ...s, mapView: v, satellite: !v }))}
                className="scale-75"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1.5">
                <Play className="w-3 h-3" /> Play
              </Label>
              <Switch 
                checked={settings.play} 
                onCheckedChange={(v) => setSettings(s => ({ ...s, play: v }))}
                className="scale-75"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1.5">
                <Navigation className="w-3 h-3" /> Traffic
              </Label>
              <Switch 
                checked={settings.traffic} 
                onCheckedChange={(v) => setSettings(s => ({ ...s, traffic: v }))}
                className="scale-75"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1.5">
                <Satellite className="w-3 h-3" /> Satellite view
              </Label>
              <Switch 
                checked={settings.satellite} 
                onCheckedChange={(v) => setSettings(s => ({ ...s, satellite: v, mapView: !v }))}
                className="scale-75"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1.5">
                <Grid3X3 className="w-3 h-3" /> Clustering
              </Label>
              <Switch 
                checked={settings.clustering} 
                onCheckedChange={(v) => setSettings(s => ({ ...s, clustering: v }))}
                className="scale-75"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1.5">
                <Hash className="w-3 h-3" /> Vehicle no.
              </Label>
              <Switch 
                checked={settings.vehicleNo} 
                onCheckedChange={(v) => setSettings(s => ({ ...s, vehicleNo: v }))}
                className="scale-75"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1.5">
                <Ruler className="w-3 h-3" /> Scale
              </Label>
              <Switch 
                checked={settings.scale} 
                onCheckedChange={(v) => setSettings(s => ({ ...s, scale: v }))}
                className="scale-75"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1.5">
                <Fence className="w-3 h-3" /> GeoFence
              </Label>
              <Switch 
                checked={settings.geofence} 
                onCheckedChange={(v) => setSettings(s => ({ ...s, geofence: v }))}
                className="scale-75"
              />
            </div>
          </Card>
        )}
      </div>
      
      {/* Expand/Collapse buttons */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex gap-1">
        <Button 
          variant="secondary" 
          size="icon" 
          className="bg-white/90 shadow-md h-8 w-8"
        >
          <span className="text-lg font-bold">»</span>
        </Button>
        <Button 
          variant="secondary" 
          size="icon" 
          className="bg-white/90 shadow-md h-8 w-8"
        >
          <span className="text-lg font-bold">«</span>
        </Button>
      </div>
      
      {/* Grid button */}
      <div className="absolute bottom-2 right-2 z-10">
        <Button variant="secondary" size="icon" className="bg-white shadow-md">
          <Grid3X3 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default FleetMiniMap;
