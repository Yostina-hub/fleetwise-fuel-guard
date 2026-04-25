import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Shield, Loader2 } from "lucide-react";
import { friendlyToastError } from "@/lib/errorMessages";

const ROLES = [
  { value: "super_admin", label: "Super Admin" },
  { value: "org_admin", label: "Org Admin" },
  { value: "operator", label: "Operator" },
  { value: "fleet_manager", label: "Fleet Manager" },
  { value: "driver", label: "Driver" },
  { value: "technician", label: "Technician" },
];

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  user_roles: Array<{ role: string }>;
}

interface BulkRoleAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: UserProfile[];
  onComplete: () => void;
}

const BulkRoleAssignDialog = ({ open, onOpenChange, users, onComplete }: BulkRoleAssignDialogProps) => {
  const { toast } = useToast();
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [selectedRole, setSelectedRole] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedUserIds.size === filteredUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const handleAssign = async () => {
    if (!selectedRole || selectedUserIds.size === 0) return;
    setLoading(true);
    let successCount = 0;
    let skipCount = 0;

    try {
      for (const userId of selectedUserIds) {
        const user = users.find(u => u.id === userId);
        if (user?.user_roles.some(r => r.role === selectedRole)) {
          skipCount++;
          continue;
        }
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: selectedRole as any } as any);
        if (!error) successCount++;
      }

      toast({
        title: "Bulk Assignment Complete",
        description: `${successCount} assigned, ${skipCount} already had the role.`,
      });
      setSelectedUserIds(new Set());
      setSelectedRole("");
      onOpenChange(false);
      onComplete();
    } catch (error: any) {
      friendlyToastError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" /> Bulk Role Assignment
          </DialogTitle>
          <DialogDescription>
            Select users and assign a role to all of them at once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger>
              <SelectValue placeholder="Select role to assign" />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map(r => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search users..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <button type="button" onClick={toggleAll} className="hover:text-foreground transition-colors">
              {selectedUserIds.size === filteredUsers.length ? "Deselect all" : "Select all"}
            </button>
            <span>{selectedUserIds.size} selected</span>
          </div>

          <ScrollArea className="h-[250px] border rounded-md">
            <div className="p-2 space-y-1">
              {filteredUsers.map(user => (
                <label
                  key={user.id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedUserIds.has(user.id)}
                    onCheckedChange={() => toggleUser(user.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{user.full_name || "No name"}</div>
                    <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {user.user_roles.map(r => (
                      <Badge key={r.role} variant="outline" className="text-[10px] px-1 py-0">{r.role}</Badge>
                    ))}
                  </div>
                </label>
              ))}
            </div>
          </ScrollArea>

          <Button
            onClick={handleAssign}
            disabled={!selectedRole || selectedUserIds.size === 0 || loading}
            className="w-full"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Assign {selectedRole ? ROLES.find(r => r.value === selectedRole)?.label : "Role"} to {selectedUserIds.size} users
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkRoleAssignDialog;
