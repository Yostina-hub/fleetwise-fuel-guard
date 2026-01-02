import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useFuelPageContext } from "@/contexts/FuelPageContext";

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    vehicle_id: string;
    transaction_type: string;
    transaction_date: string;
    fuel_amount_liters: number;
    fuel_cost?: number;
    fuel_price_per_liter?: number;
    odometer_km?: number;
    location_name?: string;
    vendor_name?: string;
    receipt_number?: string;
    notes?: string;
  }) => Promise<void>;
}

const AddTransactionDialog = ({ open, onOpenChange, onSubmit }: AddTransactionDialogProps) => {
  const { vehicles } = useFuelPageContext();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_id: "",
    transaction_type: "pump",
    transaction_date: new Date().toISOString().slice(0, 16),
    fuel_amount_liters: 0,
    fuel_cost: 0,
    fuel_price_per_liter: 50,
    odometer_km: 0,
    location_name: "",
    vendor_name: "",
    receipt_number: "",
    notes: "",
  });

  const handleSubmit = async () => {
    if (!formData.vehicle_id || !formData.fuel_amount_liters) return;
    
    setLoading(true);
    try {
      await onSubmit({
        ...formData,
        fuel_cost: formData.fuel_cost || undefined,
        fuel_price_per_liter: formData.fuel_price_per_liter || undefined,
        odometer_km: formData.odometer_km || undefined,
        location_name: formData.location_name || undefined,
        vendor_name: formData.vendor_name || undefined,
        receipt_number: formData.receipt_number || undefined,
        notes: formData.notes || undefined,
      });
      resetForm();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      vehicle_id: "",
      transaction_type: "pump",
      transaction_date: new Date().toISOString().slice(0, 16),
      fuel_amount_liters: 0,
      fuel_cost: 0,
      fuel_price_per_liter: 50,
      odometer_km: 0,
      location_name: "",
      vendor_name: "",
      receipt_number: "",
      notes: "",
    });
  };

  // Auto-calculate cost when liters or price changes
  const handleLitersChange = (liters: number) => {
    setFormData(prev => ({
      ...prev,
      fuel_amount_liters: liters,
      fuel_cost: liters * prev.fuel_price_per_liter,
    }));
  };

  const handlePriceChange = (price: number) => {
    setFormData(prev => ({
      ...prev,
      fuel_price_per_liter: price,
      fuel_cost: prev.fuel_amount_liters * price,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Fuel Transaction</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Vehicle *</Label>
              <Select 
                value={formData.vehicle_id}
                onValueChange={v => setFormData({...formData, vehicle_id: v})}
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
              <Label>Transaction Type</Label>
              <Select 
                value={formData.transaction_type}
                onValueChange={v => setFormData({...formData, transaction_type: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pump">Pump</SelectItem>
                  <SelectItem value="card">Fuel Card</SelectItem>
                  <SelectItem value="depot">Depot</SelectItem>
                  <SelectItem value="manual">Manual Entry</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date/Time</Label>
              <Input 
                type="datetime-local"
                value={formData.transaction_date}
                onChange={e => setFormData({...formData, transaction_date: e.target.value})}
              />
            </div>
            <div>
              <Label>Liters *</Label>
              <Input 
                type="number"
                step="0.1"
                value={formData.fuel_amount_liters || ""}
                onChange={e => handleLitersChange(Number(e.target.value))}
                placeholder="0.0"
              />
            </div>
            <div>
              <Label>Price/Liter (ETB)</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.fuel_price_per_liter || ""}
                onChange={e => handlePriceChange(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Total Cost (ETB)</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.fuel_cost || ""}
                onChange={e => setFormData({...formData, fuel_cost: Number(e.target.value)})}
              />
            </div>
            <div>
              <Label>Odometer (km)</Label>
              <Input 
                type="number"
                value={formData.odometer_km || ""}
                onChange={e => setFormData({...formData, odometer_km: Number(e.target.value)})}
                placeholder="125000"
              />
            </div>
            <div>
              <Label>Location</Label>
              <Input 
                value={formData.location_name}
                onChange={e => setFormData({...formData, location_name: e.target.value})}
                placeholder="Station name or address"
              />
            </div>
            <div>
              <Label>Vendor</Label>
              <Input 
                value={formData.vendor_name}
                onChange={e => setFormData({...formData, vendor_name: e.target.value})}
                placeholder="TotalEnergies, NOC, etc."
              />
            </div>
            <div>
              <Label>Receipt #</Label>
              <Input 
                value={formData.receipt_number}
                onChange={e => setFormData({...formData, receipt_number: e.target.value})}
                placeholder="TRX-001-2025"
              />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea 
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !formData.vehicle_id || !formData.fuel_amount_liters}
          >
            {loading ? "Adding..." : "Add Transaction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddTransactionDialog;
