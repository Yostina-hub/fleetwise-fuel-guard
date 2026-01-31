import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Route, MapPin, User, Clock, Package } from "lucide-react";
import { toast } from "sonner";
import { useDrivers } from "@/hooks/useDrivers";

interface AssignRouteDialogProps {
  vehicleId: string;
  vehiclePlate?: string;
  trigger?: React.ReactNode;
}

const AssignRouteDialog = ({ vehicleId, vehiclePlate, trigger }: AssignRouteDialogProps) => {
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const { drivers } = useDrivers();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    job_type: "delivery" as string,
    priority: "medium" as string,
    driver_id: "" as string,
    customer_name: "",
    customer_phone: "",
    pickup_location_name: "",
    dropoff_location_name: "",
    cargo_description: "",
    special_instructions: "",
    scheduled_pickup_at: "",
  });

  // Fetch geofences for location selection
  const { data: geofences } = useQuery({
    queryKey: ["geofences", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("geofences")
        .select("id, name")
        .eq("organization_id", organizationId!)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const jobNumber = `JOB-${Date.now().toString().slice(-8)}`;
      
      const { error } = await supabase
        .from("dispatch_jobs")
        .insert({
          job_number: jobNumber,
          job_type: data.job_type,
          priority: data.priority,
          vehicle_id: vehicleId,
          driver_id: data.driver_id || null,
          customer_name: data.customer_name || null,
          customer_phone: data.customer_phone || null,
          pickup_location_name: data.pickup_location_name || null,
          dropoff_location_name: data.dropoff_location_name || null,
          cargo_description: data.cargo_description || null,
          special_instructions: data.special_instructions || null,
          scheduled_pickup_at: data.scheduled_pickup_at || null,
          organization_id: organizationId,
          status: "pending",
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatch-jobs"] });
      toast.success("Route assigned successfully");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Failed to assign route", { description: error.message });
    },
  });

  const resetForm = () => {
    setFormData({
      job_type: "delivery",
      priority: "medium",
      driver_id: "",
      customer_name: "",
      customer_phone: "",
      pickup_location_name: "",
      dropoff_location_name: "",
      cargo_description: "",
      special_instructions: "",
      scheduled_pickup_at: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.pickup_location_name && !formData.dropoff_location_name) {
      toast.error("Please enter at least one location");
      return;
    }
    createMutation.mutate(formData);
  };

  const availableDrivers = drivers.filter(d => d.status === "active");

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2" onClick={resetForm}>
            <Route className="h-4 w-4" />
            Assign Route
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Route className="h-5 w-5 text-primary" />
            Assign Route
          </DialogTitle>
          <DialogDescription>
            Create a dispatch job for {vehiclePlate || "this vehicle"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Job Type & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="job_type">Job Type</Label>
                <Select
                  value={formData.job_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, job_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="delivery">Delivery</SelectItem>
                    <SelectItem value="pickup">Pickup</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) =>
                    setFormData({ ...formData, priority: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Driver Selection */}
            <div>
              <Label htmlFor="driver_id" className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                Assign Driver
              </Label>
              <Select
                value={formData.driver_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, driver_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select driver (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {availableDrivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.first_name} {driver.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pickup Location */}
            <div>
              <Label htmlFor="pickup_location_name" className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-success" />
                Pickup Location
              </Label>
              <Input
                id="pickup_location_name"
                value={formData.pickup_location_name}
                onChange={(e) =>
                  setFormData({ ...formData, pickup_location_name: e.target.value })
                }
                placeholder="Enter pickup address"
              />
            </div>

            {/* Dropoff Location */}
            <div>
              <Label htmlFor="dropoff_location_name" className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-destructive" />
                Dropoff Location
              </Label>
              <Input
                id="dropoff_location_name"
                value={formData.dropoff_location_name}
                onChange={(e) =>
                  setFormData({ ...formData, dropoff_location_name: e.target.value })
                }
                placeholder="Enter dropoff address"
              />
            </div>

            {/* Scheduled Time */}
            <div>
              <Label htmlFor="scheduled_pickup_at" className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Scheduled Pickup Time
              </Label>
              <Input
                id="scheduled_pickup_at"
                type="datetime-local"
                value={formData.scheduled_pickup_at}
                onChange={(e) =>
                  setFormData({ ...formData, scheduled_pickup_at: e.target.value })
                }
              />
            </div>

            {/* Customer Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer_name">Customer Name</Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) =>
                    setFormData({ ...formData, customer_name: e.target.value })
                  }
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label htmlFor="customer_phone">Customer Phone</Label>
                <Input
                  id="customer_phone"
                  value={formData.customer_phone}
                  onChange={(e) =>
                    setFormData({ ...formData, customer_phone: e.target.value })
                  }
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Cargo Description */}
            <div>
              <Label htmlFor="cargo_description" className="flex items-center gap-1">
                <Package className="h-3.5 w-3.5" />
                Cargo Description
              </Label>
              <Input
                id="cargo_description"
                value={formData.cargo_description}
                onChange={(e) =>
                  setFormData({ ...formData, cargo_description: e.target.value })
                }
                placeholder="What's being transported?"
              />
            </div>

            {/* Special Instructions */}
            <div>
              <Label htmlFor="special_instructions">Special Instructions</Label>
              <Textarea
                id="special_instructions"
                value={formData.special_instructions}
                onChange={(e) =>
                  setFormData({ ...formData, special_instructions: e.target.value })
                }
                placeholder="Any special handling or delivery instructions..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Job"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AssignRouteDialog;
