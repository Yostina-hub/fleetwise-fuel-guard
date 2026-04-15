import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Shield, Trash2, Plus, Save, Loader2, Mail, Phone, Calendar, Building } from "lucide-react";
import { format } from "date-fns";
import type { UserProfile } from "./UserTable";

const ROLES = [
  { value: "super_admin", label: "Super Admin" },
  { value: "org_admin", label: "Org Admin" },
  { value: "operator", label: "Operator" },
  { value: "fleet_manager", label: "Fleet Manager" },
  { value: "driver", label: "Driver" },
  { value: "technician", label: "Technician" },
  { value: "viewer", label: "Viewer" },
  { value: "mechanic", label: "Mechanic" },
];

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-destructive/15 text-destructive border-destructive/30",
  org_admin: "bg-primary/15 text-primary border-primary/30",
  fleet_manager: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  operator: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  driver: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  technician: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  viewer: "bg-muted text-muted-foreground border-border",
  mechanic: "bg-orange-500/15 text-orange-400 border-orange-500/30",
};

interface UserDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfile | null;
  onUserUpdated: () => void;
}

const UserDetailDialog = ({ open, onOpenChange, user, onUserUpdated }: UserDetailDialogProps) => {
  const { toast } = useToast();
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [newRole, setNewRole] = useState("");
  const [roleLoading, setRoleLoading] = useState(false);

  // Sync local state when user changes
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && user) {
      setEditName(user.full_name || "");
      setEditPhone(user.phone || "");
    }
    onOpenChange(isOpen);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: editName.trim() || null, phone: editPhone.trim() || null })
        .eq("id", user.id);
      if (error) throw error;
      toast({ title: "Profile Updated", description: "User profile saved successfully." });
      onUserUpdated();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddRole = async () => {
    if (!user || !newRole) return;
    setRoleLoading(true);
    try {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: user.id, role: newRole as any } as any);
      if (error) throw error;
      toast({ title: "Role Added" });
      setNewRole("");
      onUserUpdated();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setRoleLoading(false);
    }
  };

  const handleRemoveRole = async (role: string) => {
    if (!user) return;
    setRoleLoading(true);
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", user.id)
        .eq("role", role as any);
      if (error) throw error;
      toast({ title: "Role Removed" });
      onUserUpdated();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setRoleLoading(false);
    }
  };

  if (!user) return null;

  const existingRoles = user.user_roles.map(r => r.role);
  const availableRoles = ROLES.filter(r => !existingRoles.includes(r.value));
  const initials = user.full_name
    ? user.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email[0].toUpperCase();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-primary/30">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-xl">{user.full_name || "Unnamed User"}</DialogTitle>
              <DialogDescription className="flex items-center gap-1">
                <Mail className="w-3 h-3" /> {user.email}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="profile" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 mt-4">
            {/* Info cards */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/30">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-[11px] text-muted-foreground">Joined</p>
                  <p className="font-medium">{format(new Date(user.created_at), "MMM d, yyyy")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/30">
                <Building className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-[11px] text-muted-foreground">Organization</p>
                  <p className="font-medium truncate">{user.organization_id ? "Assigned" : "None"}</p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="detail-name">Full Name</Label>
                <Input id="detail-name" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Enter name" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="detail-phone">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="detail-phone" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="+251..." className="pl-10" />
                </div>
              </div>
              <Button onClick={handleSaveProfile} disabled={saving} className="w-full gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="roles" className="space-y-4 mt-4">
            {/* Current roles */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Current Roles</Label>
              {existingRoles.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-2">No roles assigned</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {existingRoles.map(role => (
                    <Badge
                      key={role}
                      variant="outline"
                      className={`gap-1 pr-1 ${ROLE_COLORS[role] || ""}`}
                    >
                      {ROLES.find(r => r.value === role)?.label || role}
                      <button
                        onClick={() => handleRemoveRole(role)}
                        className="ml-1 rounded-full p-0.5 hover:bg-destructive/20 transition-colors"
                        disabled={roleLoading}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Add role */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Add Role</Label>
              <div className="flex gap-2">
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAddRole} disabled={!newRole || roleLoading} size="icon" variant="outline">
                  {roleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Role descriptions */}
            <div className="rounded-lg bg-muted/20 border border-border/30 p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Role Guide</p>
              <div className="grid gap-1.5 text-xs">
                <div><span className="font-medium text-destructive">Super Admin</span> — Full system access, all organizations</div>
                <div><span className="font-medium text-primary">Org Admin</span> — Full access within their organization</div>
                <div><span className="font-medium text-blue-400">Fleet Manager</span> — Manage vehicles, routes, and schedules</div>
                <div><span className="font-medium text-cyan-400">Operator</span> — Day-to-day fleet operations</div>
                <div><span className="font-medium text-emerald-400">Driver</span> — Trips, logbooks, and incidents</div>
                <div><span className="font-medium text-amber-400">Technician</span> — Maintenance and inspections</div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default UserDetailDialog;
