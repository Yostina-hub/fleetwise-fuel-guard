import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useFuelPageContext } from "@/contexts/FuelPageContext";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";

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
  const { settings, formatCurrency } = useOrganizationSettings();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_id: "",
    transaction_type: "pump",
    transaction_date: new Date().toISOString().slice(0, 16),
    fuel_amount_liters: 0,
    fuel_cost: 0,
    fuel_price_per_liter: settings.fuel_price_per_liter,
    odometer_km: 0,
    location_name: "",
    vendor_name: "",
    receipt_number: "",
    notes: "",
  });

  // Update price when settings change
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      fuel_price_per_liter: settings.fuel_price_per_liter,
    }));
  }, [settings.fuel_price_per_liter]);

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
      fuel_price_per_liter: settings.fuel_price_per_liter,
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

  // Get currency symbol for display
  const getCurrencyLabel = () => {
    const symbols: Record<string, string> = {
      USD: 'USD',
      EUR: 'EUR',
      GBP: 'GBP',
      KES: 'KES',
      NGN: 'NGN',
      ZAR: 'ZAR',
      ETB: 'ETB',
    };
    return symbols[settings.currency] || settings.currency;
  };

  const fuelUnitLabel = settings.fuel_unit === 'gallons' ? 'gal' : 'L';
  const distanceUnitLabel = settings.distance_unit === 'miles' ? 'mi' : 'km';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Fuel Transaction</DialogTitle>
          <DialogDescription>Record a new fuel purchase or transaction.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="tx-vehicle">Vehicle *</Label>
              <Select 
                value={formData.vehicle_id}
                onValueChange={v => setFormData({...formData, vehicle_id: v})}
              >
                <SelectTrigger id="tx-vehicle" aria-label="Select vehicle">
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
              <Label htmlFor="tx-type">Transaction Type</Label>
              <Select 
                value={formData.transaction_type}
                onValueChange={v => setFormData({...formData, transaction_type: v})}
              >
                <SelectTrigger id="tx-type" aria-label="Select transaction type">
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
              <Label htmlFor="tx-date">Date/Time</Label>
              <Input 
                id="tx-date"
                aria-label="Transaction date and time"
                type="datetime-local"
                value={formData.transaction_date}
                onChange={e => setFormData({...formData, transaction_date: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="tx-liters">{settings.fuel_unit === 'gallons' ? 'Gallons' : 'Liters'} *</Label>
              <Input 
                id="tx-liters"
                aria-label={`Fuel amount in ${settings.fuel_unit === 'gallons' ? 'gallons' : 'liters'}`}
                type="number"
                step="0.1"
                value={formData.fuel_amount_liters || ""}
                onChange={e => handleLitersChange(Number(e.target.value))}
                placeholder="0.0"
              />
            </div>
            <div>
              <Label htmlFor="tx-price">Price/{fuelUnitLabel} ({getCurrencyLabel()})</Label>
              <Input 
                id="tx-price"
                aria-label={`Price per ${fuelUnitLabel}`}
                type="number"
                step="0.01"
                value={formData.fuel_price_per_liter || ""}
                onChange={e => handlePriceChange(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="tx-cost">Total Cost ({getCurrencyLabel()})</Label>
              <Input 
                id="tx-cost"
                aria-label="Total fuel cost"
                type="number"
                step="0.01"
                value={formData.fuel_cost || ""}
                onChange={e => setFormData({...formData, fuel_cost: Number(e.target.value)})}
              />
            </div>
            <div>
              <Label htmlFor="tx-odometer">Odometer ({distanceUnitLabel})</Label>
              <Input 
                id="tx-odometer"
                aria-label={`Odometer reading in ${distanceUnitLabel}`}
                type="number"
                value={formData.odometer_km || ""}
                onChange={e => setFormData({...formData, odometer_km: Number(e.target.value)})}
                placeholder="125000"
              />
            </div>
            <div>
              <Label htmlFor="tx-location">Location</Label>
              <Input 
                id="tx-location"
                aria-label="Transaction location"
                value={formData.location_name}
                onChange={e => setFormData({...formData, location_name: e.target.value})}
                placeholder="Station name or address"
              />
            </div>
            <div>
              <Label htmlFor="tx-vendor">Vendor</Label>
              <Input 
                id="tx-vendor"
                aria-label="Fuel vendor name"
                value={formData.vendor_name}
                onChange={e => setFormData({...formData, vendor_name: e.target.value})}
                placeholder="TotalEnergies, NOC, etc."
              />
            </div>
            <div>
              <Label htmlFor="tx-receipt">Receipt #</Label>
              <Input 
                id="tx-receipt"
                aria-label="Receipt number"
                value={formData.receipt_number}
                onChange={e => setFormData({...formData, receipt_number: e.target.value})}
                placeholder="TRX-001-2025"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="tx-notes">Notes</Label>
              <Textarea 
                id="tx-notes"
                aria-label="Additional notes"
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
