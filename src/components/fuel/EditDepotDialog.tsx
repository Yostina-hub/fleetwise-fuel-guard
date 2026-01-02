import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";

interface FuelDepot {
  id: string;
  name: string;
  location_name?: string;
  fuel_type: string;
  capacity_liters: number;
  current_stock_liters: number;
  min_stock_threshold?: number;
  is_active?: boolean;
}

interface EditDepotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  depot: FuelDepot | null;
  onSubmit: (id: string, data: Partial<FuelDepot>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const EditDepotDialog = ({ open, onOpenChange, depot, onSubmit, onDelete }: EditDepotDialogProps) => {
  const { formatFuel, settings } = useOrganizationSettings();
  const fuelUnitLabel = settings.fuel_unit === 'gallons' ? 'gal' : 'L';
  
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    location_name: "",
    fuel_type: "diesel",
    capacity_liters: 0,
    min_stock_threshold: 0,
  });

  useEffect(() => {
    if (depot) {
      setFormData({
        name: depot.name,
        location_name: depot.location_name || "",
        fuel_type: depot.fuel_type,
        capacity_liters: depot.capacity_liters,
        min_stock_threshold: depot.min_stock_threshold || 0,
      });
    }
  }, [depot]);

  if (!depot) return null;

  const handleSubmit = async () => {
    if (!formData.name) return;
    
    setLoading(true);
    try {
      await onSubmit(depot.id, {
        name: formData.name,
        location_name: formData.location_name || undefined,
        fuel_type: formData.fuel_type,
        capacity_liters: formData.capacity_liters,
        min_stock_threshold: formData.min_stock_threshold || undefined,
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await onDelete(depot.id);
      setShowDeleteConfirm(false);
      onOpenChange(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Fuel Depot</DialogTitle>
            <DialogDescription>Update depot settings and configuration.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="depot-name">Depot Name *</Label>
              <Input 
                id="depot-name"
                aria-label="Depot name"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Main Depot"
              />
            </div>
            <div>
              <Label htmlFor="depot-location">Location</Label>
              <Input 
                id="depot-location"
                aria-label="Depot location"
                value={formData.location_name}
                onChange={e => setFormData({...formData, location_name: e.target.value})}
                placeholder="Warehouse A"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fuel-type">Fuel Type</Label>
                <Select 
                  value={formData.fuel_type}
                  onValueChange={v => setFormData({...formData, fuel_type: v})}
                >
                  <SelectTrigger id="fuel-type" aria-label="Select fuel type">
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
                <Label htmlFor="capacity">Capacity ({fuelUnitLabel})</Label>
                <Input 
                  id="capacity"
                  aria-label={`Capacity in ${fuelUnitLabel}`}
                  type="number"
                  value={formData.capacity_liters}
                  onChange={e => setFormData({...formData, capacity_liters: Number(e.target.value)})}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="min-threshold">Min Threshold ({fuelUnitLabel})</Label>
              <Input 
                id="min-threshold"
                aria-label={`Minimum threshold in ${fuelUnitLabel}`}
                type="number"
                value={formData.min_stock_threshold}
                onChange={e => setFormData({...formData, min_stock_threshold: Number(e.target.value)})}
                placeholder="Alert when stock falls below this"
              />
            </div>

            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <span className="text-muted-foreground">Current Stock: </span>
              <span className="font-medium">{formatFuel(depot.current_stock_liters)}</span>
              <span className="text-muted-foreground"> (use Receive/Dispense to adjust)</span>
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button 
              variant="destructive" 
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleting}
            >
              Delete Depot
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button 
                onClick={handleSubmit} 
                disabled={loading || !formData.name}
              >
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Fuel Depot?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{depot.name}" and all associated dispensing records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EditDepotDialog;
