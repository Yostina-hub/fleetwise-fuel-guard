import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Loader2, User, CreditCard, Phone, FileText, Edit } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Driver } from "@/hooks/useDrivers";

const driverSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(50),
  last_name: z.string().trim().min(1, "Last name is required").max(50),
  license_number: z.string().trim().min(1, "License number is required").max(50),
  license_class: z.string().trim().max(20).nullish(),
  license_expiry: z.string().nullish(),
  email: z.string().email("Invalid email address").nullish().or(z.literal("")),
  phone: z.string().trim().max(20).nullish(),
  employee_id: z.string().trim().max(50).nullish(),
  hire_date: z.string().nullish(),
  status: z.enum(["active", "inactive", "suspended"]),
  rfid_tag: z.string().trim().max(50).nullish(),
  ibutton_id: z.string().trim().max(50).nullish(),
  bluetooth_id: z.string().trim().max(50).nullish(),
  notes: z.string().trim().max(500).nullish(),
});

interface EditDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: Driver | null;
}

const LICENSE_CLASSES = [
  { value: "A", label: "Class A - Motorcycle" },
  { value: "B", label: "Class B - Light Vehicle" },
  { value: "C", label: "Class C - Heavy Vehicle" },
  { value: "D", label: "Class D - Public Transport" },
  { value: "E", label: "Class E - Special Vehicle" },
];

export default function EditDriverDialog({ open, onOpenChange, driver }: EditDriverDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    license_number: "",
    license_class: "",
    license_expiry: "",
    email: "",
    phone: "",
    employee_id: "",
    hire_date: "",
    status: "active" as "active" | "inactive" | "suspended",
    rfid_tag: "",
    ibutton_id: "",
    bluetooth_id: "",
    notes: "",
  });

  useEffect(() => {
    if (driver) {
      setFormData({
        first_name: driver.first_name || "",
        last_name: driver.last_name || "",
        license_number: driver.license_number || "",
        license_class: driver.license_class || "",
        license_expiry: driver.license_expiry || "",
        email: driver.email || "",
        phone: driver.phone || "",
        employee_id: driver.employee_id || "",
        hire_date: driver.hire_date || "",
        status: driver.status || "active",
        rfid_tag: driver.rfid_tag || "",
        ibutton_id: driver.ibutton_id || "",
        bluetooth_id: driver.bluetooth_id || "",
        notes: driver.notes || "",
      });
    }
  }, [driver]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!driver) throw new Error("No driver selected");
      const { error } = await supabase
        .from("drivers")
        .update(data)
        .eq("id", driver.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Driver updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update driver",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    try {
      const cleanData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        license_number: formData.license_number,
        license_class: formData.license_class || null,
        license_expiry: formData.license_expiry || null,
        email: formData.email || null,
        phone: formData.phone || null,
        employee_id: formData.employee_id || null,
        hire_date: formData.hire_date || null,
        status: formData.status,
        rfid_tag: formData.rfid_tag || null,
        ibutton_id: formData.ibutton_id || null,
        bluetooth_id: formData.bluetooth_id || null,
        notes: formData.notes || null,
      };

      driverSchema.parse(cleanData);
      updateMutation.mutate(cleanData);
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

  if (!driver) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[95vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Edit className="w-6 h-6 text-primary" />
            Edit Driver
          </DialogTitle>
          <DialogDescription>
            Update driver information for {driver.first_name} {driver.last_name}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(95vh-180px)]">
          <div className="p-6 space-y-6">
            {/* Personal Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                <User className="w-5 h-5 text-primary" />
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="edit_first_name">First Name *</Label>
                  <Input
                    id="edit_first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="edit_last_name">Last Name *</Label>
                  <Input
                    id="edit_last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="edit_employee_id">Employee ID</Label>
                  <Input
                    id="edit_employee_id"
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="edit_status">Status *</Label>
                  <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="edit_hire_date">Hire Date</Label>
                  <Input
                    id="edit_hire_date"
                    type="date"
                    value={formData.hire_date}
                    onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Contact Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                <Phone className="w-5 h-5 text-primary" />
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_email">Email</Label>
                  <Input
                    id="edit_email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="edit_phone">Phone Number</Label>
                  <Input
                    id="edit_phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* License Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                <CreditCard className="w-5 h-5 text-primary" />
                License Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="edit_license_number">License Number *</Label>
                  <Input
                    id="edit_license_number"
                    value={formData.license_number}
                    onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="edit_license_class">License Class</Label>
                  <Select 
                    value={formData.license_class} 
                    onValueChange={(value) => setFormData({ ...formData, license_class: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class..." />
                    </SelectTrigger>
                    <SelectContent>
                      {LICENSE_CLASSES.map((cls) => (
                        <SelectItem key={cls.value} value={cls.value}>
                          {cls.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="edit_license_expiry">License Expiry</Label>
                  <Input
                    id="edit_license_expiry"
                    type="date"
                    value={formData.license_expiry}
                    onChange={(e) => setFormData({ ...formData, license_expiry: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Identification Tags Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                <CreditCard className="w-5 h-5 text-primary" />
                Identification Tags
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="edit_rfid_tag">RFID Tag</Label>
                  <Input
                    id="edit_rfid_tag"
                    value={formData.rfid_tag}
                    onChange={(e) => setFormData({ ...formData, rfid_tag: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="edit_ibutton_id">iButton ID</Label>
                  <Input
                    id="edit_ibutton_id"
                    value={formData.ibutton_id}
                    onChange={(e) => setFormData({ ...formData, ibutton_id: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="edit_bluetooth_id">Bluetooth ID</Label>
                  <Input
                    id="edit_bluetooth_id"
                    value={formData.bluetooth_id}
                    onChange={(e) => setFormData({ ...formData, bluetooth_id: e.target.value })}
                  />
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
                <Label htmlFor="edit_notes">Notes</Label>
                <Textarea
                  id="edit_notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={updateMutation.isPending} className="min-w-[120px]">
            {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
