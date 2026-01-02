import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { 
  Plus, 
  Fuel, 
  AlertTriangle, 
  Loader2,
  Droplet,
  TrendingDown,
  MapPin,
  Download,
  Edit
} from "lucide-react";
import { useFuelDepots } from "@/hooks/useFuelDepots";
import { useFuelPageContext } from "@/contexts/FuelPageContext";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { format } from "date-fns";
import ReceiveFuelDialog from "./ReceiveFuelDialog";
import EditDepotDialog from "./EditDepotDialog";
import { toast } from "sonner";
import { TablePagination, usePagination } from "@/components/reports/TablePagination";

const ITEMS_PER_PAGE = 10;

const FuelDepotsTab = () => {
  const { depots, dispensingLogs, loading, createDepot, recordDispensing, receiveFuel, updateDepot, deleteDepot } = useFuelDepots();
  const { currentPage, setCurrentPage, startIndex, endIndex } = usePagination(dispensingLogs.length, ITEMS_PER_PAGE);
  const paginatedLogs = dispensingLogs.slice(startIndex, endIndex);
  const { vehicles, drivers, getVehiclePlate: getVehiclePlateFromContext, getDriverName: getDriverNameFromContext } = useFuelPageContext();
  const { formatFuel, formatDistance, formatCurrency, settings } = useOrganizationSettings();
  
  const [showAddDepot, setShowAddDepot] = useState(false);
  const [showDispense, setShowDispense] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showStockWarning, setShowStockWarning] = useState(false);
  const [selectedDepot, setSelectedDepot] = useState<string | null>(null);
  const selectedDepotData = depots.find(d => d.id === selectedDepot);
  
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
    if (!selectedDepot || !selectedDepotData) return;
    
    // Validate stock
    if (dispenseData.liters_dispensed > selectedDepotData.current_stock_liters) {
      setShowStockWarning(true);
      return;
    }
    
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

  const exportDispensingCSV = () => {
    const headers = ["Date/Time", "Depot", "Vehicle", "Driver", "Liters", "Odometer", "Pump", "Stock Before", "Stock After"];
    const rows = dispensingLogs.map(log => [
      format(new Date(log.dispensed_at), "yyyy-MM-dd HH:mm"),
      depots.find(d => d.id === log.depot_id)?.name || "Unknown",
      getVehiclePlate(log.vehicle_id || undefined),
      getDriverName(log.driver_id || undefined),
      log.liters_dispensed,
      log.odometer_km || "",
      log.pump_number || "",
      log.stock_before_liters || "",
      log.stock_after_liters || ""
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dispensing-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Dispensing logs exported");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]" role="status" aria-live="polite">
        <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Loading fuel depots...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-end">
        <Button className="gap-2" onClick={() => setShowAddDepot(true)} aria-label="Add new fuel depot">
          <Plus className="w-4 h-4" aria-hidden="true" />
          Add Fuel Depot
        </Button>
      </div>

      {/* Depots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {depots.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-muted-foreground" role="status" aria-label="No fuel depots configured">
              <Fuel className="w-12 h-12 mx-auto mb-4 opacity-50" aria-hidden="true" />
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
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                    <CardTitle className="flex items-center gap-2">
                        <Fuel className="w-5 h-5 shrink-0" aria-hidden="true" />
                        <span className="truncate" title={depot.name}>{depot.name}</span>
                      </CardTitle>
                      {depot.location_name && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                          <span className="truncate" title={depot.location_name}>{depot.location_name}</span>
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="capitalize shrink-0">{depot.fuel_type}</Badge>
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
                      <span>{formatFuel(depot.current_stock_liters)}</span>
                      <span>{formatFuel(depot.capacity_liters)} capacity</span>
                    </div>
                  </div>

                  {/* Stock Warning */}
                  {stockStatus === 'critical' && (
                    <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-2 rounded-lg">
                      <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>Below minimum threshold ({formatFuel(depot.min_stock_threshold || 0)})</span>
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
                      aria-label={`Dispense fuel from ${depot.name}`}
                    >
                      <TrendingDown className="w-4 h-4" aria-hidden="true" />
                      Dispense
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 gap-1"
                      onClick={() => {
                        setSelectedDepot(depot.id);
                        setShowReceive(true);
                      }}
                      aria-label={`Receive fuel at ${depot.name}`}
                    >
                      <Droplet className="w-4 h-4" aria-hidden="true" />
                      Receive
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedDepot(depot.id);
                        setShowEdit(true);
                      }}
                      aria-label={`Edit ${depot.name}`}
                    >
                      <Edit className="w-4 h-4" aria-hidden="true" />
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Dispensing</CardTitle>
          <Button size="sm" variant="outline" className="gap-2" onClick={exportDispensingCSV} aria-label="Export dispensing logs to CSV">
            <Download className="w-4 h-4" aria-hidden="true" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px]">Date/Time</TableHead>
                <TableHead className="min-w-[100px]">Depot</TableHead>
                <TableHead className="min-w-[100px]">Vehicle</TableHead>
                <TableHead className="min-w-[120px]">Driver</TableHead>
                <TableHead className="min-w-[80px]">Liters</TableHead>
                <TableHead className="min-w-[100px]">Odometer</TableHead>
                <TableHead className="min-w-[80px]">Pump</TableHead>
                <TableHead className="min-w-[100px]">Stock Before</TableHead>
                <TableHead className="min-w-[100px]">Stock After</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No dispensing records yet
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLogs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell>{format(new Date(log.dispensed_at), "MMM dd, HH:mm")}</TableCell>
                    <TableCell>
                      <span className="truncate block max-w-[100px]" title={depots.find(d => d.id === log.depot_id)?.name}>
                        {depots.find(d => d.id === log.depot_id)?.name || 'Unknown'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="truncate block max-w-[100px]" title={getVehiclePlate(log.vehicle_id || undefined)}>
                        {getVehiclePlate(log.vehicle_id || undefined)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="truncate block max-w-[120px]" title={getDriverName(log.driver_id || undefined)}>
                        {getDriverName(log.driver_id || undefined)}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{formatFuel(log.liters_dispensed)}</TableCell>
                    <TableCell>{log.odometer_km ? formatDistance(log.odometer_km) : '-'}</TableCell>
                    <TableCell>{log.pump_number || '-'}</TableCell>
                    <TableCell>{log.stock_before_liters ? formatFuel(log.stock_before_liters) : '-'}</TableCell>
                    <TableCell>{log.stock_after_liters ? formatFuel(log.stock_after_liters) : '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            currentPage={currentPage}
            totalItems={dispensingLogs.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>

      {/* Add Depot Dialog */}
      <Dialog open={showAddDepot} onOpenChange={setShowAddDepot}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Fuel Depot</DialogTitle>
            <DialogDescription>Create a new fuel depot to track inventory and dispensing.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-depot-name">Depot Name</Label>
              <Input 
                id="new-depot-name"
                aria-label="Depot name"
                value={newDepot.name}
                onChange={e => setNewDepot({...newDepot, name: e.target.value})}
                placeholder="Main Depot"
              />
            </div>
            <div>
              <Label htmlFor="new-depot-location">Location</Label>
              <Input 
                id="new-depot-location"
                aria-label="Depot location"
                value={newDepot.location_name}
                onChange={e => setNewDepot({...newDepot, location_name: e.target.value})}
                placeholder="Warehouse A"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-depot-fuel-type">Fuel Type</Label>
                <Select 
                  value={newDepot.fuel_type}
                  onValueChange={v => setNewDepot({...newDepot, fuel_type: v})}
                >
                  <SelectTrigger id="new-depot-fuel-type" aria-label="Select fuel type">
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
                <Label htmlFor="new-depot-capacity">Capacity ({settings.fuel_unit === 'gallons' ? 'gal' : 'L'})</Label>
                <Input 
                  id="new-depot-capacity"
                  aria-label={`Capacity in ${settings.fuel_unit === 'gallons' ? 'gallons' : 'liters'}`}
                  type="number"
                  value={newDepot.capacity_liters}
                  onChange={e => setNewDepot({...newDepot, capacity_liters: Number(e.target.value)})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-depot-stock">Current Stock ({settings.fuel_unit === 'gallons' ? 'gal' : 'L'})</Label>
                <Input 
                  id="new-depot-stock"
                  aria-label={`Current stock in ${settings.fuel_unit === 'gallons' ? 'gallons' : 'liters'}`}
                  type="number"
                  value={newDepot.current_stock_liters}
                  onChange={e => setNewDepot({...newDepot, current_stock_liters: Number(e.target.value)})}
                />
              </div>
              <div>
                <Label htmlFor="new-depot-threshold">Min Threshold ({settings.fuel_unit === 'gallons' ? 'gal' : 'L'})</Label>
                <Input 
                  id="new-depot-threshold"
                  aria-label={`Minimum threshold in ${settings.fuel_unit === 'gallons' ? 'gallons' : 'liters'}`}
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
            <DialogDescription>
              {selectedDepotData && (
                <span>Available stock: {formatFuel(selectedDepotData.current_stock_liters)}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="dispense-vehicle">Vehicle</Label>
              <Select 
                value={dispenseData.vehicle_id}
                onValueChange={v => setDispenseData({...dispenseData, vehicle_id: v})}
              >
                <SelectTrigger id="dispense-vehicle" aria-label="Select vehicle">
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
              <Label htmlFor="dispense-driver">Driver</Label>
              <Select 
                value={dispenseData.driver_id}
                onValueChange={v => setDispenseData({...dispenseData, driver_id: v})}
              >
                <SelectTrigger id="dispense-driver" aria-label="Select driver">
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
                <Label htmlFor="dispense-liters">{settings.fuel_unit === 'gallons' ? 'Gallons' : 'Liters'}</Label>
                <Input 
                  id="dispense-liters"
                  aria-label={`Amount in ${settings.fuel_unit === 'gallons' ? 'gallons' : 'liters'}`}
                  type="number"
                  value={dispenseData.liters_dispensed}
                  onChange={e => setDispenseData({...dispenseData, liters_dispensed: Number(e.target.value)})}
                />
                {selectedDepotData && dispenseData.liters_dispensed > selectedDepotData.current_stock_liters && (
                  <p className="text-xs text-destructive mt-1">Exceeds available stock</p>
                )}
              </div>
              <div>
                <Label htmlFor="dispense-odometer">Odometer ({settings.distance_unit})</Label>
                <Input 
                  id="dispense-odometer"
                  aria-label={`Odometer reading in ${settings.distance_unit}`}
                  type="number"
                  value={dispenseData.odometer_km}
                  onChange={e => setDispenseData({...dispenseData, odometer_km: Number(e.target.value)})}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="dispense-pump">Pump Number</Label>
              <Input 
                id="dispense-pump"
                aria-label="Pump number"
                value={dispenseData.pump_number}
                onChange={e => setDispenseData({...dispenseData, pump_number: e.target.value})}
                placeholder="Pump 1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDispense(false)}>Cancel</Button>
            <Button 
              onClick={handleDispense} 
              disabled={!dispenseData.liters_dispensed || (selectedDepotData && dispenseData.liters_dispensed > selectedDepotData.current_stock_liters)}
            >
              Record Dispensing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Warning Dialog */}
      <AlertDialog open={showStockWarning} onOpenChange={setShowStockWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Insufficient Stock</AlertDialogTitle>
            <AlertDialogDescription>
              The requested amount exceeds the available stock. Please reduce the dispense amount or receive more fuel first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowStockWarning(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Receive Fuel Dialog */}
      <ReceiveFuelDialog
        open={showReceive}
        onOpenChange={setShowReceive}
        depot={selectedDepotData || null}
        onSubmit={receiveFuel}
      />

      {/* Edit Depot Dialog */}
      <EditDepotDialog
        open={showEdit}
        onOpenChange={setShowEdit}
        depot={selectedDepotData || null}
        onSubmit={updateDepot}
        onDelete={deleteDepot}
      />
    </div>
  );
};

export default FuelDepotsTab;
