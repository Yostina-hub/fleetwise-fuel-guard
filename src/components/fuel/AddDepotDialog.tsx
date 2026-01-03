import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface NewDepotData {
  name: string;
  location_name: string;
  fuel_type: string;
  capacity_liters: number;
  current_stock_liters: number;
  min_stock_threshold: number;
}

interface AddDepotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newDepot: NewDepotData;
  setNewDepot: (data: NewDepotData) => void;
  onSubmit: () => void;
  fuelUnit: string;
}

export default function AddDepotDialog({
  open,
  onOpenChange,
  newDepot,
  setNewDepot,
  onSubmit,
  fuelUnit,
}: AddDepotDialogProps) {
  const unitLabel = fuelUnit === 'gallons' ? 'gal' : 'L';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              <Label htmlFor="new-depot-capacity">Capacity ({unitLabel})</Label>
              <Input 
                id="new-depot-capacity"
                aria-label={`Capacity in ${fuelUnit === 'gallons' ? 'gallons' : 'liters'}`}
                type="number"
                value={newDepot.capacity_liters}
                onChange={e => setNewDepot({...newDepot, capacity_liters: Number(e.target.value)})}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="new-depot-stock">Current Stock ({unitLabel})</Label>
              <Input 
                id="new-depot-stock"
                aria-label={`Current stock in ${fuelUnit === 'gallons' ? 'gallons' : 'liters'}`}
                type="number"
                value={newDepot.current_stock_liters}
                onChange={e => setNewDepot({...newDepot, current_stock_liters: Number(e.target.value)})}
              />
            </div>
            <div>
              <Label htmlFor="new-depot-threshold">Min Threshold ({unitLabel})</Label>
              <Input 
                id="new-depot-threshold"
                aria-label={`Minimum threshold in ${fuelUnit === 'gallons' ? 'gallons' : 'liters'}`}
                type="number"
                value={newDepot.min_stock_threshold}
                onChange={e => setNewDepot({...newDepot, min_stock_threshold: Number(e.target.value)})}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={!newDepot.name}>Create Depot</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
