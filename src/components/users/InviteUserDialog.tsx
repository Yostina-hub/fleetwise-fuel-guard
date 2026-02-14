import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useOrganization } from "@/hooks/useOrganization";

const allRoles = [
  { value: "super_admin", label: "Super Admin", adminOnly: true },
  { value: "org_admin", label: "Org Admin", adminOnly: true },
  { value: "operator", label: "Operator" },
  { value: "fleet_manager", label: "Fleet Manager" },
  { value: "driver", label: "Driver" },
  { value: "technician", label: "Technician" },
];

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: () => void;
  organizationId?: string;
}

const InviteUserDialog = ({ open, onOpenChange, onUserCreated, organizationId: propOrgId }: InviteUserDialogProps) => {
  const { toast } = useToast();
  const { isSuperAdmin } = usePermissions();
  const { organizationId: contextOrgId } = useOrganization();
  const effectiveOrgId = propOrgId || contextOrgId;
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [loading, setLoading] = useState(false);

  // Filter roles: org_admin can only assign non-admin roles
  const availableRoles = allRoles.filter((r) => isSuperAdmin || !r.adminOnly);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !selectedRole) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("No active session");
      }

      // Call edge function to create user (doesn't affect current session)
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          email,
          password,
          fullName,
          role: selectedRole,
          organizationId: effectiveOrgId,
        },
      });

      if (error) throw error;
      
      if (data.error) {
        throw new Error(data.error);
      }

      if (data.warning) {
        toast({
          title: "Partial Success",
          description: data.warning + ". Please assign role manually.",
          variant: "default",
        });
      } else {
        toast({
          title: "Success",
          description: `User ${email} has been created successfully`,
        });
      }

      // Reset form
      setEmail("");
      setFullName("");
      setPassword("");
      setSelectedRole("");
      onOpenChange(false);
      onUserCreated();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Create a new user account and assign a role
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create User"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InviteUserDialog;
