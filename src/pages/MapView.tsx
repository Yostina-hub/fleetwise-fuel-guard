import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/StatusBadge";
import LiveTrackingMap from "@/components/map/LiveTrackingMap";
import { MapPin, Navigation, Fuel, Zap, RefreshCw, Loader2 } from "lucide-react";
import { useVehicles } from "@/hooks/useVehicles";

const MapView = () => {
  const location = useLocation();
  const { vehicles: dbVehicles, loading, refetch } = useVehicles();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | undefined>(
    location.state?.selectedVehicleId
  );
  const [autoRefresh, setAutoRefresh] = useState("30");
  const [lastUpdate, setLastUpdate] = useState(new Date());
  
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite'>('satellite');
  const [mapToken, setMapToken] = useState<string>(() => localStorage.getItem('mapbox_token') || '');
  const envToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
  const [mapInstance, setMapInstance] = useState<any>(null);
  
  // Transform vehicles for map display with random positions around Addis Ababa
  const vehicles = useMemo(() => {
    return dbVehicles.map((v, idx) => ({
      id: v.id,
      plate: v.plate_number || 'Unknown',
      status: (v.status === 'active' ? 'moving' : v.status === 'maintenance' ? 'idle' : 'stopped') as 'moving' | 'idle' | 'stopped' | 'offline',
      fuel: v.current_fuel || 50,
      speed: v.current_speed || 0,
      lat: 9.03 + (Math.random() - 0.5) * 0.1,
      lng: 38.74 + (Math.random() - 0.5) * 0.1,
      engine_on: v.status === 'active',
      heading: Math.random() * 360
    }));
  }, [dbVehicles]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh === "off") return;
    
    const interval = setInterval(() => {
      setLastUpdate(new Date());
      refetch();
    }, parseInt(autoRefresh) * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refetch]);

  if (loading && vehicles.length === 0) {
    return (
      <Layout>
        <div className="p-8 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading map data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex h-full">
        {/* Map Area */}
        <div className="flex-1 relative">
          <LiveTrackingMap 
            vehicles={vehicles}
            selectedVehicleId={selectedVehicleId}
            onVehicleClick={(vehicle) => setSelectedVehicleId(vehicle.id)}
            token={mapToken || envToken}
            mapStyle={mapStyle}
            onMapReady={setMapInstance}
          />

          {/* Map Legend */}
          <div className="absolute top-4 left-4 space-y-2 z-10">
            <Card className="p-3 bg-card/95 backdrop-blur">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-success" />
                <span className="text-sm font-medium">Moving</span>
              </div>
            </Card>
            <Card className="p-3 bg-card/95 backdrop-blur">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-warning" />
                <span className="text-sm font-medium">Idle</span>
              </div>
            </Card>
            <Card className="p-3 bg-card/95 backdrop-blur">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                <span className="text-sm font-medium">Stopped</span>
              </div>
            </Card>
            <Card className="p-3 bg-card/95 backdrop-blur">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive" />
                <span className="text-sm font-medium">Offline</span>
              </div>
            </Card>
            <Card className="p-3 bg-card/95 backdrop-blur">
              <div className="text-sm font-medium mb-2">Map Style</div>
              <Select value={mapStyle} onValueChange={(v) => setMapStyle(v as 'streets' | 'satellite')}>
                <SelectTrigger className="h-8 w-[140px]">
                  <SelectValue placeholder="Style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="satellite">Satellite</SelectItem>
                  <SelectItem value="streets">Streets</SelectItem>
                </SelectContent>
              </Select>
            </Card>
          </div>
          {/* Token Prompt */}
          {(!envToken && !mapToken) && (
            <div className="absolute top-4 right-4 z-10">
              <Card className="p-4 bg-card/95 backdrop-blur space-y-2 w-80">
                <div className="text-sm font-semibold">Add Mapbox public token</div>
                <Input
                  placeholder="pk.eyJ..."
                  value={mapToken}
                  onChange={(e) => setMapToken(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => { localStorage.setItem('mapbox_token', mapToken); window.location.reload(); }}>Save</Button>
                </div>
                <p className="text-xs text-muted-foreground">Get your token at mapbox.com → Tokens.</p>
              </Card>
            </div>
          )}
        </div>

        {/* Side Panel */}
        <div className="w-96 border-l border-border bg-card overflow-auto">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">Live Vehicles</h2>
                <p className="text-sm text-muted-foreground mt-1">{vehicles.length} vehicles online</p>
              </div>
              <Badge variant="outline" className="gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Live
              </Badge>
            </div>

            {/* Auto-Refresh Control */}
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
              <Select value={autoRefresh} onValueChange={setAutoRefresh}>
                <SelectTrigger className="w-[120px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 Sec</SelectItem>
                  <SelectItem value="30">30 Sec</SelectItem>
                  <SelectItem value="60">1 Min</SelectItem>
                  <SelectItem value="300">5 Min</SelectItem>
                  <SelectItem value="off">Off</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">
                {lastUpdate.toLocaleTimeString()}
              </span>
            </div>
          </div>

          <div className="p-4 space-y-3">
            {vehicles.map((vehicle) => (
              <Card 
                key={vehicle.id} 
                className={`p-4 hover:shadow-md transition-all cursor-pointer ${
                  selectedVehicleId === vehicle.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => { 
                  setSelectedVehicleId(vehicle.id);
                  try { mapInstance?.flyTo({ center: [vehicle.lng, vehicle.lat], zoom: 15, duration: 1200, essential: true }); } catch {}
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold">{vehicle.plate}</div>
                    <div className="text-xs text-muted-foreground">{vehicle.id}</div>
                  </div>
                  <StatusBadge status={vehicle.status} />
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-primary" />
                    <div>
                      <div className="text-xs text-muted-foreground">Speed</div>
                      <div className="font-medium">{vehicle.speed} km/h</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Fuel className="w-4 h-4 text-primary" />
                    <div>
                      <div className="text-xs text-muted-foreground">Fuel</div>
                      <div className="font-medium">{vehicle.fuel}%</div>
                    </div>
                  </div>
                </div>

                {vehicle.engine_on && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-success">
                    <Zap className="w-3 h-3" />
                    <span>Engine On</span>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span>{vehicle.lat.toFixed(4)}, {vehicle.lng.toFixed(4)}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MapView;
