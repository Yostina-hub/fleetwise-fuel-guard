import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this depot? This action cannot be undone.")) return;
    
    setDeleting(true);
    try {
      await onDelete(depot.id);
      onOpenChange(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Fuel Depot</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Depot Name *</Label>
            <Input 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="Main Depot"
            />
          </div>
          <div>
            <Label>Location</Label>
            <Input 
              value={formData.location_name}
              onChange={e => setFormData({...formData, location_name: e.target.value})}
              placeholder="Warehouse A"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Fuel Type</Label>
              <Select 
                value={formData.fuel_type}
                onValueChange={v => setFormData({...formData, fuel_type: v})}
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
                value={formData.capacity_liters}
                onChange={e => setFormData({...formData, capacity_liters: Number(e.target.value)})}
              />
            </div>
          </div>
          <div>
            <Label>Min Threshold (L)</Label>
            <Input 
              type="number"
              value={formData.min_stock_threshold}
              onChange={e => setFormData({...formData, min_stock_threshold: Number(e.target.value)})}
              placeholder="Alert when stock falls below this"
            />
          </div>

          <div className="bg-muted/50 p-3 rounded-lg text-sm">
            <span className="text-muted-foreground">Current Stock: </span>
            <span className="font-medium">{depot.current_stock_liters.toLocaleString()}L</span>
            <span className="text-muted-foreground"> (use Receive/Dispense to adjust)</span>
          </div>
        </div>
        <DialogFooter className="flex justify-between">
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete Depot"}
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
  );
};

export default EditDepotDialog;
