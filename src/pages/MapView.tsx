import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import StatusBadge from "@/components/StatusBadge";
import { MapPin, Navigation, Fuel, Clock } from "lucide-react";

const MapView = () => {
  const vehicles = [
    { id: "V-001", plate: "AA 1234", status: "moving" as const, fuel: 75, speed: 65, lat: 9.03, lng: 38.74 },
    { id: "V-002", plate: "AB 5678", status: "idle" as const, fuel: 45, speed: 0, lat: 8.98, lng: 38.78 },
    { id: "V-003", plate: "AC 9012", status: "stopped" as const, fuel: 90, speed: 0, lat: 9.01, lng: 38.76 },
  ];

  return (
    <Layout>
      <div className="flex h-full">
        {/* Map Area */}
        <div className="flex-1 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-muted/30 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MapPin className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Interactive Map View</p>
              <p className="text-sm mt-2">Real-time vehicle tracking visualization</p>
            </div>
          </div>

          {/* Map Controls */}
          <div className="absolute top-4 left-4 space-y-2">
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-sm font-medium">Moving</span>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-warning" />
                <span className="text-sm font-medium">Idle</span>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                <span className="text-sm font-medium">Stopped</span>
              </div>
            </Card>
          </div>
        </div>

        {/* Side Panel */}
        <div className="w-96 border-l border-border bg-card overflow-auto">
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-bold">Live Vehicles</h2>
            <p className="text-sm text-muted-foreground mt-1">{vehicles.length} vehicles online</p>
          </div>

          <div className="p-4 space-y-3">
            {vehicles.map((vehicle) => (
              <Card key={vehicle.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
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
