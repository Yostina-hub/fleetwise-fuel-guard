import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";

interface FuelDepot {
  id: string;
  name: string;
  current_stock_liters: number;
  capacity_liters: number;
}

interface ReceiveFuelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  depot: FuelDepot | null;
  onSubmit: (depotId: string, litersReceived: number, notes?: string) => Promise<void>;
}

const ReceiveFuelDialog = ({ open, onOpenChange, depot, onSubmit }: ReceiveFuelDialogProps) => {
  const { formatFuel, settings } = useOrganizationSettings();
  const [loading, setLoading] = useState(false);
  const [liters, setLiters] = useState(0);
  const [notes, setNotes] = useState("");

  if (!depot) return null;

  const maxReceivable = depot.capacity_liters - depot.current_stock_liters;
  const newStock = depot.current_stock_liters + liters;
  const isOverCapacity = newStock > depot.capacity_liters;
  const fuelUnitLabel = settings.fuel_unit === 'gallons' ? 'gal' : 'L';

  const handleSubmit = async () => {
    if (liters <= 0 || isOverCapacity) return;
    
    setLoading(true);
    try {
      await onSubmit(depot.id, liters, notes || undefined);
      setLiters(0);
      setNotes("");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Receive Fuel - {depot.name}</DialogTitle>
          <DialogDescription>Record fuel delivery to this depot.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Stock:</span>
              <span className="font-medium">{formatFuel(depot.current_stock_liters)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Capacity:</span>
              <span className="font-medium">{formatFuel(depot.capacity_liters)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Available Space:</span>
              <span className="font-medium">{formatFuel(maxReceivable)}</span>
            </div>
          </div>

          <div>
            <Label htmlFor="liters-input">{settings.fuel_unit === 'gallons' ? 'Gallons' : 'Liters'} to Receive *</Label>
            <Input 
              id="liters-input"
              type="number"
              value={liters || ""}
              onChange={e => setLiters(Number(e.target.value))}
              placeholder="0"
              max={maxReceivable}
              aria-label={`Amount in ${fuelUnitLabel} to receive`}
            />
            {isOverCapacity && (
              <p className="text-xs text-destructive mt-1">
                Cannot exceed tank capacity. Max: {formatFuel(maxReceivable)}
              </p>
            )}
          </div>

          {liters > 0 && !isOverCapacity && (
            <div className="bg-success/10 p-3 rounded-lg text-sm">
              <span className="text-muted-foreground">New Stock Level: </span>
              <span className="font-medium text-success">{formatFuel(newStock)}</span>
              <span className="text-muted-foreground"> ({Math.round((newStock / depot.capacity_liters) * 100)}%)</span>
            </div>
          )}

          <div>
            <Label htmlFor="notes-input">Notes (optional)</Label>
            <Textarea 
              id="notes-input"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Delivery reference, supplier info..."
              rows={2}
              aria-label="Delivery notes"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || liters <= 0 || isOverCapacity}
          >
            {loading ? "Recording..." : "Record Delivery"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiveFuelDialog;
