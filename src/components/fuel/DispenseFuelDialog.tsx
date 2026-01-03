import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FuelDepot } from "@/hooks/useFuelDepots";

interface DispenseData {
  vehicle_id: string;
  driver_id: string;
  liters_dispensed: number;
  odometer_km: number;
  pump_number: string;
}

interface DispenseFuelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  depot: FuelDepot | null;
  dispenseData: DispenseData;
  setDispenseData: (data: DispenseData) => void;
  onSubmit: () => void;
  vehicles: { id: string; plate_number: string }[];
  drivers: { id: string; first_name: string; last_name: string }[];
  formatFuel: (value: number) => string;
  fuelUnit: string;
  distanceUnit: string;
}

export default function DispenseFuelDialog({
  open,
  onOpenChange,
  depot,
  dispenseData,
  setDispenseData,
  onSubmit,
  vehicles,
  drivers,
  formatFuel,
  fuelUnit,
  distanceUnit,
}: DispenseFuelDialogProps) {
  const exceeds = depot && dispenseData.liters_dispensed > depot.current_stock_liters;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dispense Fuel</DialogTitle>
          <DialogDescription>
            {depot && (
              <span>Available stock: {formatFuel(depot.current_stock_liters)}</span>
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
              <Label htmlFor="dispense-liters">{fuelUnit === 'gallons' ? 'Gallons' : 'Liters'}</Label>
              <Input 
                id="dispense-liters"
                aria-label={`Amount in ${fuelUnit === 'gallons' ? 'gallons' : 'liters'}`}
                type="number"
                value={dispenseData.liters_dispensed}
                onChange={e => setDispenseData({...dispenseData, liters_dispensed: Number(e.target.value)})}
              />
              {exceeds && (
                <p className="text-xs text-destructive mt-1">Exceeds available stock</p>
              )}
            </div>
            <div>
              <Label htmlFor="dispense-odometer">Odometer ({distanceUnit})</Label>
              <Input 
                id="dispense-odometer"
                aria-label={`Odometer reading in ${distanceUnit}`}
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={onSubmit} 
            disabled={!dispenseData.liters_dispensed || exceeds}
          >
            Record Dispensing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
