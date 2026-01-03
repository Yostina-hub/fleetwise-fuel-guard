import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Fuel, Loader2 } from "lucide-react";
import { useFuelDepots } from "@/hooks/useFuelDepots";
import { useFuelPageContext } from "@/contexts/FuelPageContext";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import ReceiveFuelDialog from "./ReceiveFuelDialog";
import EditDepotDialog from "./EditDepotDialog";
import DepotCard from "./DepotCard";
import DepotDispensingTable from "./DepotDispensingTable";
import DepotReceivingHistoryCard from "./DepotReceivingHistoryCard";
import AddDepotDialog from "./AddDepotDialog";
import DispenseFuelDialog from "./DispenseFuelDialog";

const FuelDepotsTab = () => {
  const { depots, dispensingLogs, loading, createDepot, recordDispensing, receiveFuel, updateDepot, deleteDepot } = useFuelDepots();
  const { vehicles, drivers, getVehiclePlate: getVehiclePlateFromContext, getDriverName: getDriverNameFromContext } = useFuelPageContext();
  const { formatFuel, formatDistance, settings } = useOrganizationSettings();
  
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

  const handleDispenseClick = (depotId: string) => {
    setSelectedDepot(depotId);
    setShowDispense(true);
  };

  const handleReceiveClick = (depotId: string) => {
    setSelectedDepot(depotId);
    setShowReceive(true);
  };

  const handleEditClick = (depotId: string) => {
    setSelectedDepot(depotId);
    setShowEdit(true);
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
          depots.map(depot => (
            <DepotCard
              key={depot.id}
              depot={depot}
              formatFuel={formatFuel}
              onDispense={handleDispenseClick}
              onReceive={handleReceiveClick}
              onEdit={handleEditClick}
            />
          ))
        )}
      </div>

      {/* Dispensing Table */}
      <DepotDispensingTable
        dispensingLogs={dispensingLogs}
        depots={depots}
        getVehiclePlate={getVehiclePlate}
        getDriverName={getDriverName}
        formatFuel={formatFuel}
        formatDistance={formatDistance}
      />

      {/* Receiving History */}
      <DepotReceivingHistoryCard depots={depots} />

      {/* Add Depot Dialog */}
      <AddDepotDialog
        open={showAddDepot}
        onOpenChange={setShowAddDepot}
        newDepot={newDepot}
        setNewDepot={setNewDepot}
        onSubmit={handleCreateDepot}
        fuelUnit={settings.fuel_unit}
      />

      {/* Dispense Dialog */}
      <DispenseFuelDialog
        open={showDispense}
        onOpenChange={setShowDispense}
        depot={selectedDepotData || null}
        dispenseData={dispenseData}
        setDispenseData={setDispenseData}
        onSubmit={handleDispense}
        vehicles={vehicles}
        drivers={drivers}
        formatFuel={formatFuel}
        fuelUnit={settings.fuel_unit}
        distanceUnit={settings.distance_unit}
      />

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
