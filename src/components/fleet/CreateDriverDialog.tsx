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
import { Loader2, User, CreditCard, Phone, FileText, Heart, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const driverSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(50),
  last_name: z.string().trim().min(1, "Last name is required").max(50),
  national_id: z.string().trim().max(50).nullish(),
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
  emergency_contact_name: z.string().trim().max(100).nullish(),
  emergency_contact_phone: z.string().trim().max(20).nullish(),
  emergency_contact_relationship: z.string().trim().max(50).nullish(),
  medical_certificate_expiry: z.string().nullish(),
});

interface CreateDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LICENSE_CLASSES = [
  { value: "A", label: "Class A - Motorcycle" },
  { value: "B", label: "Class B - Light Vehicle" },
  { value: "C", label: "Class C - Heavy Vehicle" },
  { value: "D", label: "Class D - Public Transport" },
  { value: "E", label: "Class E - Special Vehicle" },
];

export default function CreateDriverDialog({ open, onOpenChange }: CreateDriverDialogProps) {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    national_id: "",
    license_number: "",
    license_class: "",
    license_expiry: "",
    email: "",
    phone: "",
    employee_id: "",
    hire_date: "",
    status: "active" as const,
    rfid_tag: "",
    ibutton_id: "",
    bluetooth_id: "",
    notes: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relationship: "",
    medical_certificate_expiry: "",
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("drivers").insert({
        ...data,
        organization_id: organizationId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Driver registered successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to register driver",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      national_id: "",
      license_number: "",
      license_class: "",
      license_expiry: "",
      email: "",
      phone: "",
      employee_id: "",
      hire_date: "",
      status: "active",
      rfid_tag: "",
      ibutton_id: "",
      bluetooth_id: "",
      notes: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      emergency_contact_relationship: "",
      medical_certificate_expiry: "",
    });
  };

  const handleSubmit = () => {
    try {
      const cleanData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        national_id: formData.national_id || null,
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
        emergency_contact_name: formData.emergency_contact_name || null,
        emergency_contact_phone: formData.emergency_contact_phone || null,
        emergency_contact_relationship: formData.emergency_contact_relationship || null,
        medical_certificate_expiry: formData.medical_certificate_expiry || null,
        verification_status: 'pending',
      };

      driverSchema.parse(cleanData);
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
      <DialogContent className="max-w-4xl w-[95vw] max-h-[95vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <User className="w-6 h-6 text-primary" />
            Register New Driver
          </DialogTitle>
          <DialogDescription>
            Enter the driver details to add them to your fleet
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
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="John"
                  />
                </div>

                <div>
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="Doe"
                  />
                </div>

                <div>
                  <Label htmlFor="employee_id">Employee ID</Label>
                  <Input
                    id="employee_id"
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    placeholder="EMP-001"
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
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="hire_date">Hire Date</Label>
                  <Input
                    id="hire_date"
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
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john.doe@example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+251 911 123 456"
                  />
                </div>
              </div>
            </div>

            {/* License & ID Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                <CreditCard className="w-5 h-5 text-primary" />
                License & Identification
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="national_id">National ID Number</Label>
                  <Input
                    id="national_id"
                    value={formData.national_id}
                    onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
                    placeholder="e.g., 12345678"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Used for driver verification
                  </p>
                </div>

                <div>
                  <Label htmlFor="license_number">License Number *</Label>
                  <Input
                    id="license_number"
                    value={formData.license_number}
                    onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                    placeholder="DL-12345678"
                  />
                </div>

                <div>
                  <Label htmlFor="license_class">License Class</Label>
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
                  <Label htmlFor="license_expiry">License Expiry</Label>
                  <Input
                    id="license_expiry"
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
                Identification Tags (Optional)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="rfid_tag">RFID Tag</Label>
                  <Input
                    id="rfid_tag"
                    value={formData.rfid_tag}
                    onChange={(e) => setFormData({ ...formData, rfid_tag: e.target.value })}
                    placeholder="RFID tag number"
                  />
                </div>

                <div>
                  <Label htmlFor="ibutton_id">iButton ID</Label>
                  <Input
                    id="ibutton_id"
                    value={formData.ibutton_id}
                    onChange={(e) => setFormData({ ...formData, ibutton_id: e.target.value })}
                    placeholder="iButton ID"
                  />
                </div>

                <div>
                  <Label htmlFor="bluetooth_id">Bluetooth ID</Label>
                  <Input
                    id="bluetooth_id"
                    value={formData.bluetooth_id}
                    onChange={(e) => setFormData({ ...formData, bluetooth_id: e.target.value })}
                    placeholder="Bluetooth device ID"
                  />
                </div>
              </div>
            </div>

            {/* Emergency Contact Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                <AlertCircle className="w-5 h-5 text-primary" />
                Emergency Contact
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="emergency_contact_name">Contact Name</Label>
                  <Input
                    id="emergency_contact_name"
                    value={formData.emergency_contact_name}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <Label htmlFor="emergency_contact_phone">Contact Phone</Label>
                  <Input
                    id="emergency_contact_phone"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                    placeholder="+251 911 123 456"
                  />
                </div>
                <div>
                  <Label htmlFor="emergency_contact_relationship">Relationship</Label>
                  <Input
                    id="emergency_contact_relationship"
                    value={formData.emergency_contact_relationship}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_relationship: e.target.value })}
                    placeholder="e.g., Spouse, Parent"
                  />
                </div>
              </div>
            </div>

            {/* Medical Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                <Heart className="w-5 h-5 text-primary" />
                Medical Information
              </h3>
              <div>
                <Label htmlFor="medical_certificate_expiry">Medical Certificate Expiry</Label>
                <Input
                  id="medical_certificate_expiry"
                  type="date"
                  value={formData.medical_certificate_expiry}
                  onChange={(e) => setFormData({ ...formData, medical_certificate_expiry: e.target.value })}
                />
              </div>
            </div>

            {/* Notes Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                <FileText className="w-5 h-5 text-primary" />
                Additional Information
              </h3>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional information about the driver..."
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
          <Button onClick={handleSubmit} disabled={createMutation.isPending} className="min-w-[120px]">
            {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Register Driver
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
