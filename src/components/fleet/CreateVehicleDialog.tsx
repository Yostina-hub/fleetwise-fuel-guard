import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Loader2 } from "lucide-react";

const vehicleSchema = z.object({
  plate_number: z.string().trim().min(1, "Plate number is required").max(20),
  make: z.string().trim().min(1, "Make is required").max(50),
  model: z.string().trim().min(1, "Model is required").max(50),
  year: z.number().min(1900).max(new Date().getFullYear() + 1),
  vin: z.string().trim().max(17).nullish(),
  color: z.string().trim().max(30).nullish(),
  fuel_type: z.enum(["diesel", "petrol", "electric", "hybrid"]).nullish(),
  tank_capacity_liters: z.number().min(0).nullish(),
  odometer_km: z.number().min(0).nullish(),
  ownership_type: z.enum(["owned", "leased", "rented"]).nullish(),
  status: z.enum(["active", "maintenance", "inactive"]),
  notes: z.string().trim().max(500).nullish(),
});

interface CreateVehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateVehicleDialog({ open, onOpenChange }: CreateVehicleDialogProps) {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    plate_number: "",
    make: "",
    model: "",
    year: new Date().getFullYear(),
    vin: "",
    color: "",
    fuel_type: "diesel" as const,
    tank_capacity_liters: "",
    odometer_km: "",
    ownership_type: "owned" as const,
    status: "active" as const,
    notes: "",
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("vehicles").insert({
        ...data,
        organization_id: organizationId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Vehicle added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add vehicle",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      plate_number: "",
      make: "",
      model: "",
      year: new Date().getFullYear(),
      vin: "",
      color: "",
      fuel_type: "diesel",
      tank_capacity_liters: "",
      odometer_km: "",
      ownership_type: "owned",
      status: "active",
      notes: "",
    });
  };

  const handleSubmit = () => {
    try {
      const cleanData = {
        plate_number: formData.plate_number,
        make: formData.make,
        model: formData.model,
        year: formData.year,
        vin: formData.vin || null,
        color: formData.color || null,
        fuel_type: formData.fuel_type || null,
        tank_capacity_liters: formData.tank_capacity_liters ? parseFloat(formData.tank_capacity_liters) : null,
        odometer_km: formData.odometer_km ? parseFloat(formData.odometer_km) : null,
        ownership_type: formData.ownership_type || null,
        status: formData.status,
        notes: formData.notes || null,
      };

      vehicleSchema.parse(cleanData);
      createMutation.mutate(cleanData);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Vehicle</DialogTitle>
          <DialogDescription>
            Enter the vehicle details to add it to your fleet
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          {/* Required Fields */}
          <div className="col-span-2">
            <Label htmlFor="plate_number">Plate Number *</Label>
            <Input
              id="plate_number"
              value={formData.plate_number}
              onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
              placeholder="AA-12345"
            />
          </div>

          <div>
            <Label htmlFor="make">Make *</Label>
            <Input
              id="make"
              value={formData.make}
              onChange={(e) => setFormData({ ...formData, make: e.target.value })}
              placeholder="Toyota, Isuzu, etc."
            />
          </div>

          <div>
            <Label htmlFor="model">Model *</Label>
            <Input
              id="model"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              placeholder="Hilux, D-Max, etc."
            />
          </div>

          <div>
            <Label htmlFor="year">Year *</Label>
            <Input
              id="year"
              type="number"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || new Date().getFullYear() })}
            />
          </div>

          <div>
            <Label htmlFor="status">Status *</Label>
            <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Optional Fields */}
          <div>
            <Label htmlFor="vin">VIN</Label>
            <Input
              id="vin"
              value={formData.vin}
              onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
              placeholder="17-character VIN"
              maxLength={17}
            />
          </div>

          <div>
            <Label htmlFor="color">Color</Label>
            <Input
              id="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              placeholder="White, Blue, etc."
            />
          </div>

          <div>
            <Label htmlFor="fuel_type">Fuel Type</Label>
            <Select value={formData.fuel_type} onValueChange={(value: any) => setFormData({ ...formData, fuel_type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="diesel">Diesel</SelectItem>
                <SelectItem value="petrol">Petrol</SelectItem>
                <SelectItem value="electric">Electric</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="tank_capacity">Tank Capacity (L)</Label>
            <Input
              id="tank_capacity"
              type="number"
              value={formData.tank_capacity_liters}
              onChange={(e) => setFormData({ ...formData, tank_capacity_liters: e.target.value })}
              placeholder="80"
            />
          </div>

          <div>
            <Label htmlFor="odometer">Odometer (km)</Label>
            <Input
              id="odometer"
              type="number"
              value={formData.odometer_km}
              onChange={(e) => setFormData({ ...formData, odometer_km: e.target.value })}
              placeholder="50000"
            />
          </div>

          <div>
            <Label htmlFor="ownership_type">Ownership Type</Label>
            <Select value={formData.ownership_type} onValueChange={(value: any) => setFormData({ ...formData, ownership_type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owned">Owned</SelectItem>
                <SelectItem value="leased">Leased</SelectItem>
                <SelectItem value="rented">Rented</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional information..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Add Vehicle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
