import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import type { UnifiedPerson } from "@/hooks/useUnifiedPeople";
import { getDefaultRoleForEmployeeType, ROLE_LABELS } from "@/lib/roleMapping";

const ASSIGNABLE_ROLES = [
  "driver",
  "mechanic",
  "technician",
  "dispatcher",
  "operator",
  "fleet_manager",
  "operations_manager",
  "fuel_controller",
  "maintenance_lead",
  "auditor",
  "viewer",
];
const ADMIN_ONLY_ROLES = ["super_admin", "org_admin"];

interface ProvisionAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person: UnifiedPerson | null;
  onProvisioned: () => void;
}

const ProvisionAccountDialog = ({ open, onOpenChange, person, onProvisioned }: ProvisionAccountDialogProps) => {
  const { toast } = useToast();
  const { isSuperAdmin } = usePermissions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && person) {
      setEmail(person.email ?? "");
      setPassword("");
      setRole(getDefaultRoleForEmployeeType(person.employeeType));
    }
  }, [open, person]);

  if (!person) return null;

  const availableRoles = isSuperAdmin
    ? [...ADMIN_ONLY_ROLES, ...ASSIGNABLE_ROLES]
    : ASSIGNABLE_ROLES;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password || !role) {
      toast({ title: "Missing fields", description: "Email, password and role are required.", variant: "destructive" });
      return;
    }
    if (password.length < 8) {
      toast({ title: "Weak password", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          email: normalizedEmail,
          password,
          fullName: person.fullName,
          role,
          organizationId: person.organizationId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const newUserId: string | undefined = data?.user?.id;
      if (newUserId) {
        // Link the auth account back to the driver and/or employee record
        if (person.driverId) {
          const { error: dErr } = await supabase
            .from("drivers")
            .update({ user_id: newUserId })
            .eq("id", person.driverId);
          if (dErr) console.error("Failed to link driver:", dErr);
        }
        if (person.employeeId) {
          const { error: eErr } = await supabase
            .from("employees")
            .update({ user_id: newUserId })
            .eq("id", person.employeeId);
          if (eErr) console.error("Failed to link employee:", eErr);
        }
      }

      toast({
        title: "Login Provisioned",
        description: `${person.fullName} can now sign in as ${normalizedEmail}.`,
      });
      onOpenChange(false);
      onProvisioned();
    } catch (err: any) {
      console.error("Provisioning error:", err);
      toast({ title: "Failed to provision", description: err.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const sourceLabel = person.source === "driver" ? "Driver" : person.source === "employee" ? "Employee" : "Person";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" /> Provision Login Account
          </DialogTitle>
          <DialogDescription>
            Create a system login for <span className="font-medium text-foreground">{person.fullName}</span> ({sourceLabel}).
            The account will be linked to their existing record.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="prov-email">Email *</Label>
            <Input
              id="prov-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prov-pass">Temporary Password *</Label>
            <Input
              id="prov-pass"
              type="text"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            <p className="text-[11px] text-muted-foreground">Share this securely. The user can change it after login.</p>
          </div>
          <div className="space-y-2">
            <Label>Role *</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
              <SelectContent>
                {availableRoles.map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r] ?? r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Default suggested from employee type ({person.employeeType ?? "n/a"}). Change if needed — additional roles can be added after.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Provisioning...</>) : "Create Login"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProvisionAccountDialog;
