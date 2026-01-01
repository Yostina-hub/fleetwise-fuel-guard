import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Plus, 
  Fuel, 
  Gauge, 
  AlertTriangle, 
  Loader2,
  Droplet,
  TrendingDown,
  MapPin
} from "lucide-react";
import { useFuelDepots } from "@/hooks/useFuelDepots";
import { useFuelPageContext } from "@/pages/FuelMonitoring";
import { format } from "date-fns";

const FuelDepotsTab = () => {
  const { depots, dispensingLogs, loading, createDepot, recordDispensing, updateDepotStock } = useFuelDepots();
  const { vehicles, drivers, getVehiclePlate: getVehiclePlateFromContext, getDriverName: getDriverNameFromContext } = useFuelPageContext();
  
  const [showAddDepot, setShowAddDepot] = useState(false);
  const [showDispense, setShowDispense] = useState(false);
  const [selectedDepot, setSelectedDepot] = useState<string | null>(null);
  
  const [newDepot, setNewDepot] = useState({
    name: "",
    location_name: "",
    fuel_type: "diesel",
    capacity_liters: 10000,
    current_stock_liters: 0,
    min_stock_threshold: 1000,
  });

  const [dispenseData, setDispenseData] = useState({
    vehicle_id: "",
    driver_id: "",
    liters_dispensed: 0,
    odometer_km: 0,
    pump_number: "",
  });

  const getVehiclePlate = (vehicleId?: string) => {
    if (!vehicleId) return "N/A";
    return getVehiclePlateFromContext(vehicleId);
  };

  const getDriverName = (driverId?: string) => {
    if (!driverId) return "N/A";
    return getDriverNameFromContext(driverId);
  };

  const getStockPercentage = (current: number, capacity: number) => {
    return Math.round((current / capacity) * 100);
  };

  const getStockStatus = (current: number, capacity: number, threshold?: number) => {
    const percentage = getStockPercentage(current, capacity);
    if (threshold && current <= threshold) return 'critical';
    if (percentage <= 20) return 'low';
    if (percentage <= 50) return 'medium';
    return 'good';
  };

  const handleCreateDepot = async () => {
    await createDepot(newDepot);
    setShowAddDepot(false);
    setNewDepot({
      name: "",
      location_name: "",
      fuel_type: "diesel",
      capacity_liters: 10000,
      current_stock_liters: 0,
      min_stock_threshold: 1000,
    });
  };

  const handleDispense = async () => {
    if (!selectedDepot) return;
    await recordDispensing({
      depot_id: selectedDepot,
      vehicle_id: dispenseData.vehicle_id || undefined,
      driver_id: dispenseData.driver_id || undefined,
      liters_dispensed: dispenseData.liters_dispensed,
      odometer_km: dispenseData.odometer_km || undefined,
      pump_number: dispenseData.pump_number || undefined,
      dispensed_at: new Date().toISOString(),
    });
    setShowDispense(false);
    setDispenseData({
      vehicle_id: "",
      driver_id: "",
      liters_dispensed: 0,
      odometer_km: 0,
      pump_number: "",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-end">
        <Button className="gap-2" onClick={() => setShowAddDepot(true)}>
          <Plus className="w-4 h-4" />
          Add Fuel Depot
        </Button>
      </div>

      {/* Depots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {depots.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Fuel className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No fuel depots configured</p>
              <Button className="mt-4" onClick={() => setShowAddDepot(true)}>
                Add Your First Depot
              </Button>
            </CardContent>
          </Card>
        ) : (
          depots.map(depot => {
            const stockStatus = getStockStatus(
              depot.current_stock_liters, 
              depot.capacity_liters, 
              depot.min_stock_threshold || undefined
            );
            const stockPercentage = getStockPercentage(depot.current_stock_liters, depot.capacity_liters);
            
            return (
              <Card key={depot.id} className={stockStatus === 'critical' ? 'border-destructive/50' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Fuel className="w-5 h-5" />
                        {depot.name}
                      </CardTitle>
                      {depot.location_name && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {depot.location_name}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="capitalize">{depot.fuel_type}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stock Level */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Stock Level</span>
                      <span className={`text-sm font-medium ${
                        stockStatus === 'critical' ? 'text-destructive' :
                        stockStatus === 'low' ? 'text-warning' : ''
                      }`}>
                        {stockPercentage}%
                      </span>
                    </div>
                    <Progress 
                      value={stockPercentage} 
                      className={`h-3 ${
                        stockStatus === 'critical' ? '[&>div]:bg-destructive' :
                        stockStatus === 'low' ? '[&>div]:bg-warning' :
                        '[&>div]:bg-success'
                      }`}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{depot.current_stock_liters.toLocaleString()}L</span>
                      <span>{depot.capacity_liters.toLocaleString()}L capacity</span>
                    </div>
                  </div>

                  {/* Stock Warning */}
                  {stockStatus === 'critical' && (
                    <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-2 rounded-lg">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Below minimum threshold ({depot.min_stock_threshold}L)</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      className="flex-1 gap-1"
                      onClick={() => {
                        setSelectedDepot(depot.id);
                        setShowDispense(true);
                      }}
                    >
                      <TrendingDown className="w-4 h-4" />
                      Dispense
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 gap-1">
                      <Droplet className="w-4 h-4" />
                      Receive
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Recent Dispensing Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Dispensing</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date/Time</TableHead>
                <TableHead>Depot</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Liters</TableHead>
                <TableHead>Pump</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dispensingLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No dispensing records yet
                  </TableCell>
                </TableRow>
              ) : (
                dispensingLogs.slice(0, 10).map(log => (
                  <TableRow key={log.id}>
                    <TableCell>{format(new Date(log.dispensed_at), "MMM dd, HH:mm")}</TableCell>
                    <TableCell>{depots.find(d => d.id === log.depot_id)?.name || 'Unknown'}</TableCell>
                    <TableCell>{getVehiclePlate(log.vehicle_id || undefined)}</TableCell>
                    <TableCell>{getDriverName(log.driver_id || undefined)}</TableCell>
                    <TableCell className="font-medium">{log.liters_dispensed}L</TableCell>
                    <TableCell>{log.pump_number || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Depot Dialog */}
      <Dialog open={showAddDepot} onOpenChange={setShowAddDepot}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Fuel Depot</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Depot Name</Label>
              <Input 
                value={newDepot.name}
                onChange={e => setNewDepot({...newDepot, name: e.target.value})}
                placeholder="Main Depot"
              />
            </div>
            <div>
              <Label>Location</Label>
              <Input 
                value={newDepot.location_name}
                onChange={e => setNewDepot({...newDepot, location_name: e.target.value})}
                placeholder="Warehouse A"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fuel Type</Label>
                <Select 
                  value={newDepot.fuel_type}
                  onValueChange={v => setNewDepot({...newDepot, fuel_type: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="petrol">Petrol</SelectItem>
                    <SelectItem value="lpg">LPG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Capacity (L)</Label>
                <Input 
                  type="number"
                  value={newDepot.capacity_liters}
                  onChange={e => setNewDepot({...newDepot, capacity_liters: Number(e.target.value)})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Current Stock (L)</Label>
                <Input 
                  type="number"
                  value={newDepot.current_stock_liters}
                  onChange={e => setNewDepot({...newDepot, current_stock_liters: Number(e.target.value)})}
                />
              </div>
              <div>
                <Label>Min Threshold (L)</Label>
                <Input 
                  type="number"
                  value={newDepot.min_stock_threshold}
                  onChange={e => setNewDepot({...newDepot, min_stock_threshold: Number(e.target.value)})}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDepot(false)}>Cancel</Button>
            <Button onClick={handleCreateDepot} disabled={!newDepot.name}>Create Depot</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispense Dialog */}
      <Dialog open={showDispense} onOpenChange={setShowDispense}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispense Fuel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Vehicle</Label>
              <Select 
                value={dispenseData.vehicle_id}
                onValueChange={v => setDispenseData({...dispenseData, vehicle_id: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Driver</Label>
              <Select 
                value={dispenseData.driver_id}
                onValueChange={v => setDispenseData({...dispenseData, driver_id: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Liters</Label>
                <Input 
                  type="number"
                  value={dispenseData.liters_dispensed}
                  onChange={e => setDispenseData({...dispenseData, liters_dispensed: Number(e.target.value)})}
                />
              </div>
              <div>
                <Label>Odometer (km)</Label>
                <Input 
                  type="number"
                  value={dispenseData.odometer_km}
                  onChange={e => setDispenseData({...dispenseData, odometer_km: Number(e.target.value)})}
                />
              </div>
            </div>
            <div>
              <Label>Pump Number</Label>
              <Input 
                value={dispenseData.pump_number}
                onChange={e => setDispenseData({...dispenseData, pump_number: e.target.value})}
                placeholder="Pump 1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDispense(false)}>Cancel</Button>
            <Button onClick={handleDispense} disabled={!dispenseData.liters_dispensed}>
              Record Dispensing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FuelDepotsTab;
