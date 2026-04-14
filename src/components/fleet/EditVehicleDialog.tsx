import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useDrivers } from "@/hooks/useDrivers";
import { useSubmitThrottle } from "@/hooks/useSubmitThrottle";
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
import { toast } from "sonner";
import { z } from "zod";
import { Loader2, Truck, User, Gauge, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const vehicleSchema = z.object({
  plate_number: z.string().trim().min(1, "Plate number is required").max(20, "Plate number max 20 characters"),
  make: z.string().trim().min(1, "Make is required").max(50, "Make max 50 characters"),
  model: z.string().trim().min(1, "Model is required").max(50, "Model max 50 characters"),
  year: z.number({ invalid_type_error: "Year must be a number" }).min(1900, "Year must be 1900 or later").max(new Date().getFullYear() + 2, "Year cannot be that far in the future"),
  vehicle_type: z.string().trim().max(50).nullish(),
  assigned_driver_id: z.string().uuid("Invalid driver selection").nullish(),
  vin: z.string().trim().max(17, "VIN max 17 characters").nullish(),
  color: z.string().trim().max(30, "Color max 30 characters").nullish(),
  fuel_type: z.enum(["diesel", "petrol", "electric", "hybrid"], { errorMap: () => ({ message: "Select a valid fuel type" }) }),
  tank_capacity_liters: z.number().min(0, "Tank capacity cannot be negative").max(100000, "Tank capacity too large").nullish(),
  odometer_km: z.number().min(0, "Odometer cannot be negative").max(10000000, "Odometer value too large").nullish(),
  ownership_type: z.enum(["owned", "leased", "rented"]).nullish(),
  status: z.enum(["active", "maintenance", "inactive"], { errorMap: () => ({ message: "Select a valid status" }) }),
  notes: z.string().trim().max(500, "Notes max 500 characters").nullish(),
});

type FieldErrors = Partial<Record<keyof z.infer<typeof vehicleSchema>, string>>;

interface EditVehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: {
    vehicleId: string;
    plate: string;
    make: string;
    model: string;
    year: number;
    status: string;
    vehicleType?: string;
    fuelType?: string;
  } | null;
}

const VEHICLE_TYPES = [
  { value: "automobile", label: "Automobile / Car" },
  { value: "truck", label: "Truck" },
  { value: "bus", label: "Bus" },
  { value: "van", label: "Van" },
  { value: "pickup", label: "Pickup" },
  { value: "trailer", label: "Trailer" },
  { value: "motorcycle", label: "Motorcycle" },
  { value: "heavy_equipment", label: "Heavy Equipment" },
];

// Sanitize free-text input: strip control chars, trim
const sanitize = (val: string) => val.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "").trim();

export default function EditVehicleDialog({ open, onOpenChange, vehicle }: EditVehicleDialogProps) {
  const { organizationId } = useOrganization();
  const { drivers } = useDrivers();
  const canSubmit = useSubmitThrottle();
  const queryClient = useQueryClient();
  const activeDrivers = drivers.filter(d => d.status === 'active');

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [fetchingData, setFetchingData] = useState(false);
  const [formData, setFormData] = useState({
    plate_number: "",
    make: "",
    model: "",
    year: new Date().getFullYear(),
    vehicle_type: "",
    assigned_driver_id: "",
    vin: "",
    color: "",
    fuel_type: "diesel" as const,
    tank_capacity_liters: "",
    odometer_km: "",
    ownership_type: "owned" as const,
    status: "active" as const,
    notes: "",
  });

  // Fetch full vehicle data when dialog opens
  useEffect(() => {
    if (open && vehicle?.vehicleId) {
      fetchVehicleData();
    }
    if (!open) {
      setFieldErrors({});
    }
  }, [open, vehicle?.vehicleId]);

  const fetchVehicleData = async () => {
    if (!vehicle?.vehicleId) return;
    setFetchingData(true);

    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("id", vehicle.vehicleId)
      .single();

    setFetchingData(false);

    if (error) {
      toast.error("Failed to load vehicle data", { description: error.message });
      return;
    }

    if (data) {
      setFormData({
        plate_number: data.plate_number || "",
        make: data.make || "",
        model: data.model || "",
        year: data.year || new Date().getFullYear(),
        vehicle_type: data.vehicle_type || "",
        assigned_driver_id: data.assigned_driver_id || "",
        vin: data.vin || "",
        color: data.color || "",
        fuel_type: (data.fuel_type as any) || "diesel",
        tank_capacity_liters: data.tank_capacity_liters?.toString() || "",
        odometer_km: data.odometer_km?.toString() || "",
        ownership_type: (data.ownership_type as any) || "owned",
        status: (data.status as any) || "active",
        notes: data.notes || "",
      });
    }
  };

  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof vehicleSchema>) => {
      if (!canSubmit()) throw new Error("Please wait before submitting again");
      if (!organizationId) throw new Error("Organization not found");
      if (!vehicle?.vehicleId) throw new Error("Vehicle not found");

      // Server-side duplicate plate number check
      const { data: existingPlate } = await supabase
        .from("vehicles")
        .select("id, plate_number")
        .eq("organization_id", organizationId)
        .eq("plate_number", data.plate_number)
        .neq("id", vehicle.vehicleId)
        .maybeSingle();

      if (existingPlate) {
        throw new Error(`A vehicle with plate number "${data.plate_number}" already exists`);
      }

      const { error } = await supabase
        .from("vehicles")
        .update(data)
        .eq("id", vehicle.vehicleId)
        .eq("organization_id", organizationId); // RLS safety
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vehicle updated successfully");
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error("Failed to update vehicle", {
        description: error.message || "An unexpected error occurred",
      });
    },
  });

  const handleSubmit = () => {
    setFieldErrors({});

    // Sanitize text inputs
    const cleanData = {
      plate_number: sanitize(formData.plate_number),
      make: sanitize(formData.make),
      model: sanitize(formData.model),
      year: formData.year,
      vehicle_type: formData.vehicle_type ? sanitize(formData.vehicle_type) : null,
      assigned_driver_id: formData.assigned_driver_id || null,
      vin: formData.vin ? sanitize(formData.vin) : null,
      color: formData.color ? sanitize(formData.color) : null,
      fuel_type: formData.fuel_type || "diesel",
      tank_capacity_liters: formData.tank_capacity_liters ? parseFloat(formData.tank_capacity_liters) : null,
      odometer_km: formData.odometer_km ? parseFloat(formData.odometer_km) : null,
      ownership_type: formData.ownership_type || null,
      status: formData.status,
      notes: formData.notes ? sanitize(formData.notes) : null,
    };

    // Check for NaN from parseFloat
    if (formData.tank_capacity_liters && isNaN(cleanData.tank_capacity_liters as number)) {
      setFieldErrors(prev => ({ ...prev, tank_capacity_liters: "Must be a valid number" }));
      return;
    }
    if (formData.odometer_km && isNaN(cleanData.odometer_km as number)) {
      setFieldErrors(prev => ({ ...prev, odometer_km: "Must be a valid number" }));
      return;
    }

    const result = vehicleSchema.safeParse(cleanData);
    if (!result.success) {
      const errors: FieldErrors = {};
      result.error.errors.forEach((e) => {
        const field = e.path[0] as keyof FieldErrors;
        if (!errors[field]) errors[field] = e.message;
      });
      setFieldErrors(errors);
      toast.error("Please fix the validation errors before saving");
      return;
    }

    updateMutation.mutate(result.data);
  };

  const FieldError = ({ field }: { field: keyof FieldErrors }) => {
    const error = fieldErrors[field];
    if (!error) return null;
    return <p className="text-xs text-destructive mt-1">{error}</p>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[95vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary" />
            Edit Vehicle
          </DialogTitle>
          <DialogDescription>
            Update the vehicle details below
          </DialogDescription>
        </DialogHeader>

        {fetchingData ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="max-h-[calc(95vh-180px)]">
            <div className="p-6 space-y-6">
              {/* Basic Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                  <Truck className="w-5 h-5 text-primary" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="edit-plate_number">Plate Number *</Label>
                    <Input
                      id="edit-plate_number"
                      value={formData.plate_number}
                      onChange={(e) => {
                        setFormData({ ...formData, plate_number: e.target.value });
                        setFieldErrors(prev => ({ ...prev, plate_number: undefined }));
                      }}
                      placeholder="AA-12345"
                      maxLength={20}
                      className={fieldErrors.plate_number ? "border-destructive" : ""}
                    />
                    <FieldError field="plate_number" />
                  </div>

                  <div>
                    <Label htmlFor="edit-make">Make *</Label>
                    <Input
                      id="edit-make"
                      value={formData.make}
                      onChange={(e) => {
                        setFormData({ ...formData, make: e.target.value });
                        setFieldErrors(prev => ({ ...prev, make: undefined }));
                      }}
                      placeholder="Toyota, Isuzu, etc."
                      maxLength={50}
                      className={fieldErrors.make ? "border-destructive" : ""}
                    />
                    <FieldError field="make" />
                  </div>

                  <div>
                    <Label htmlFor="edit-model">Model *</Label>
                    <Input
                      id="edit-model"
                      value={formData.model}
                      onChange={(e) => {
                        setFormData({ ...formData, model: e.target.value });
                        setFieldErrors(prev => ({ ...prev, model: undefined }));
                      }}
                      placeholder="Hilux, D-Max, etc."
                      maxLength={50}
                      className={fieldErrors.model ? "border-destructive" : ""}
                    />
                    <FieldError field="model" />
                  </div>

                  <div>
                    <Label htmlFor="edit-year">Year *</Label>
                    <Input
                      id="edit-year"
                      type="number"
                      value={formData.year}
                      onChange={(e) => {
                        setFormData({ ...formData, year: parseInt(e.target.value) || 0 });
                        setFieldErrors(prev => ({ ...prev, year: undefined }));
                      }}
                      min={1900}
                      max={new Date().getFullYear() + 2}
                      className={fieldErrors.year ? "border-destructive" : ""}
                    />
                    <FieldError field="year" />
                  </div>

                  <div>
                    <Label htmlFor="edit-vehicle_type">Vehicle Type</Label>
                    <Select
                      value={formData.vehicle_type || "none"}
                      onValueChange={(value) => setFormData({ ...formData, vehicle_type: value === "none" ? "" : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {VEHICLE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="edit-status">Status *</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: "active" | "maintenance" | "inactive") => {
                        setFormData({ ...formData, status: value });
                        setFieldErrors(prev => ({ ...prev, status: undefined }));
                      }}
                    >
                      <SelectTrigger className={fieldErrors.status ? "border-destructive" : ""}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldError field="status" />
                  </div>
                </div>
              </div>

              {/* Driver Assignment Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                  <User className="w-5 h-5 text-primary" />
                  Driver Assignment
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-assigned_driver">Assigned Driver</Label>
                    <Select
                      value={formData.assigned_driver_id || "none"}
                      onValueChange={(value) => setFormData({ ...formData, assigned_driver_id: value === "none" ? "" : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select driver..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No driver assigned</SelectItem>
                        {activeDrivers.map((driver) => (
                          <SelectItem key={driver.id} value={driver.id}>
                            {driver.first_name} {driver.last_name} - {driver.license_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Technical Details Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                  <Gauge className="w-5 h-5 text-primary" />
                  Technical Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="edit-vin">VIN</Label>
                    <Input
                      id="edit-vin"
                      value={formData.vin}
                      onChange={(e) => {
                        setFormData({ ...formData, vin: e.target.value });
                        setFieldErrors(prev => ({ ...prev, vin: undefined }));
                      }}
                      placeholder="17-character VIN"
                      maxLength={17}
                      className={fieldErrors.vin ? "border-destructive" : ""}
                    />
                    <FieldError field="vin" />
                  </div>

                  <div>
                    <Label htmlFor="edit-color">Color</Label>
                    <Input
                      id="edit-color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      placeholder="White, Blue, etc."
                      maxLength={30}
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-fuel_type">Fuel Type *</Label>
                    <Select
                      value={formData.fuel_type}
                      onValueChange={(value: "diesel" | "petrol" | "electric" | "hybrid") => {
                        setFormData({ ...formData, fuel_type: value });
                        setFieldErrors(prev => ({ ...prev, fuel_type: undefined }));
                      }}
                    >
                      <SelectTrigger className={fieldErrors.fuel_type ? "border-destructive" : ""}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diesel">Diesel</SelectItem>
                        <SelectItem value="petrol">Petrol</SelectItem>
                        <SelectItem value="electric">Electric</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldError field="fuel_type" />
                  </div>

                  <div>
                    <Label htmlFor="edit-tank_capacity">Tank Capacity (L)</Label>
                    <Input
                      id="edit-tank_capacity"
                      type="number"
                      value={formData.tank_capacity_liters}
                      onChange={(e) => {
                        setFormData({ ...formData, tank_capacity_liters: e.target.value });
                        setFieldErrors(prev => ({ ...prev, tank_capacity_liters: undefined }));
                      }}
                      placeholder="80"
                      min={0}
                      max={100000}
                      className={fieldErrors.tank_capacity_liters ? "border-destructive" : ""}
                    />
                    <FieldError field="tank_capacity_liters" />
                  </div>

                  <div>
                    <Label htmlFor="edit-odometer">Odometer (km)</Label>
                    <Input
                      id="edit-odometer"
                      type="number"
                      value={formData.odometer_km}
                      onChange={(e) => {
                        setFormData({ ...formData, odometer_km: e.target.value });
                        setFieldErrors(prev => ({ ...prev, odometer_km: undefined }));
                      }}
                      placeholder="50000"
                      min={0}
                      className={fieldErrors.odometer_km ? "border-destructive" : ""}
                    />
                    <FieldError field="odometer_km" />
                  </div>

                  <div>
                    <Label htmlFor="edit-ownership_type">Ownership Type</Label>
                    <Select
                      value={formData.ownership_type || "none"}
                      onValueChange={(value) => setFormData({ ...formData, ownership_type: value === "none" ? "" as any : value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not specified</SelectItem>
                        <SelectItem value="owned">Owned</SelectItem>
                        <SelectItem value="leased">Leased</SelectItem>
                        <SelectItem value="rented">Rented</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                  <FileText className="w-5 h-5 text-primary" />
                  Additional Information
                </h3>
                <div>
                  <Label htmlFor="edit-notes">Notes</Label>
                  <Textarea
                    id="edit-notes"
                    value={formData.notes}
                    onChange={(e) => {
                      setFormData({ ...formData, notes: e.target.value });
                      setFieldErrors(prev => ({ ...prev, notes: undefined }));
                    }}
                    placeholder="Additional information about the vehicle..."
                    rows={4}
                    maxLength={500}
                    className={fieldErrors.notes ? "border-destructive" : ""}
                  />
                  <div className="flex justify-between mt-1">
                    <FieldError field="notes" />
                    <span className="text-xs text-muted-foreground">{formData.notes.length}/500</span>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="p-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={updateMutation.isPending || fetchingData}
            className="min-w-[120px]"
          >
            {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}