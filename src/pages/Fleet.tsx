import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatusBadge from "@/components/StatusBadge";
import { Truck, Search, Plus, Fuel, MapPin, Calendar } from "lucide-react";

const Fleet = () => {
  const vehicles = [
    { 
      id: "V-001", 
      plate: "AA 1234", 
      make: "Mercedes", 
      model: "Actros", 
      year: 2022,
      status: "moving" as const, 
      fuel: 75,
      odometer: 45230,
      nextService: "2025-02-15"
    },
    { 
      id: "V-002", 
      plate: "AB 5678", 
      make: "Volvo", 
      model: "FH16", 
      year: 2021,
      status: "idle" as const, 
      fuel: 45,
      odometer: 67890,
      nextService: "2025-01-25"
    },
    { 
      id: "V-003", 
      plate: "AC 9012", 
      make: "Scania", 
      model: "R450", 
      year: 2023,
      status: "stopped" as const, 
      fuel: 90,
      odometer: 23450,
      nextService: "2025-03-10"
    },
    { 
      id: "V-004", 
      plate: "AD 3456", 
      make: "MAN", 
      model: "TGX", 
      year: 2022,
      status: "moving" as const, 
      fuel: 35,
      odometer: 51200,
      nextService: "2025-02-01"
    },
    { 
      id: "V-005", 
      plate: "AE 7890", 
      make: "DAF", 
      model: "XF", 
      year: 2020,
      status: "offline" as const, 
      fuel: 60,
      odometer: 89340,
      nextService: "2025-01-20"
    },
  ];

  return (
    <Layout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Fleet Management</h1>
            <p className="text-muted-foreground mt-1">Manage all vehicles and their status</p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Vehicle
          </Button>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by plate, ID, or make..." 
                  className="pl-10"
                />
              </div>
              <Button variant="outline">Filter</Button>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((vehicle) => (
            <Card key={vehicle.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{vehicle.plate}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {vehicle.make} {vehicle.model} • {vehicle.year}
                    </p>
                  </div>
                  <StatusBadge status={vehicle.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Fuel Level */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Fuel className="w-4 h-4 text-primary" />
                      <span className="font-medium">Fuel Level</span>
                    </div>
                    <span className="text-sm font-semibold">{vehicle.fuel}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        vehicle.fuel > 60 ? 'bg-success' : 
                        vehicle.fuel > 30 ? 'bg-warning' : 
                        'bg-destructive'
                      }`}
                      style={{ width: `${vehicle.fuel}%` }}
                    />
                  </div>
                </div>

                {/* Odometer */}
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Odometer:</span>
                  <span className="font-medium">{vehicle.odometer.toLocaleString()} km</span>
                </div>

                {/* Next Service */}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Next Service:</span>
                  <span className="font-medium">{vehicle.nextService}</span>
                </div>

                {/* Actions */}
                <div className="pt-4 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    Details
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    Track
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Fleet;
