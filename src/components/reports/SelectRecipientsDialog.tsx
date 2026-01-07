import { useState, useMemo, useEffect } from "react";
import { X, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role?: string;
}

interface SelectRecipientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRecipients: string[];
  onConfirm: (emails: string[]) => void;
}

const USER_FILTERS = [
  { value: "all", label: "All" },
  { value: "admin", label: "Admins" },
  { value: "manager", label: "Managers" },
  { value: "user", label: "Users" },
];

export const SelectRecipientsDialog = ({
  open,
  onOpenChange,
  selectedRecipients,
  onConfirm,
}: SelectRecipientsDialogProps) => {
  const { organizationId } = useOrganization();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedEmails, setSelectedEmails] = useState<string[]>(selectedRecipients);

  // Fetch users from database when dialog opens
  useEffect(() => {
    if (!open || !organizationId) return;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        // Fetch profiles
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .eq("organization_id", organizationId)
          .order("email");

        if (profilesError) throw profilesError;

        // Fetch user roles
        const { data: rolesData, error: rolesError } = await supabase
          .from("user_roles")
          .select("user_id, role");

        if (rolesError) throw rolesError;

        // Merge profiles with their roles
        const usersWithRoles = (profilesData || []).map((profile) => {
          const userRole = rolesData?.find(r => r.user_id === profile.id);
          return {
            ...profile,
            role: userRole?.role || "user",
          };
        });

        setUsers(usersWithRoles);
      } catch (error) {
        console.error("Error fetching users:", error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [open, organizationId]);

  // Reset selected emails when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedEmails(selectedRecipients);
    }
  }, [open, selectedRecipients]);

  // Filter users based on search and role filter
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      
      const matchesFilter = filter === "all" || user.role === filter;
      
      return matchesSearch && matchesFilter;
    });
  }, [users, searchQuery, filter]);

  // Group users by role category
  const groupedUsers = useMemo(() => {
    const adminRoles = ["super_admin", "fleet_owner", "operations_manager"];
    const managerRoles = ["dispatcher", "maintenance_lead", "fuel_controller"];
    
    const admins = filteredUsers.filter(u => adminRoles.includes(u.role || ""));
    const managers = filteredUsers.filter(u => managerRoles.includes(u.role || ""));
    const others = filteredUsers.filter(u => 
      !adminRoles.includes(u.role || "") && !managerRoles.includes(u.role || "")
    );

    return { admins, managers, others };
  }, [filteredUsers]);

  const handleSelectAll = (emails: string[]) => {
    const allSelected = emails.every(email => selectedEmails.includes(email));
    if (allSelected) {
      setSelectedEmails(prev => prev.filter(e => !emails.includes(e)));
    } else {
      setSelectedEmails(prev => [...new Set([...prev, ...emails])]);
    }
  };

  const handleToggleEmail = (email: string) => {
    setSelectedEmails(prev =>
      prev.includes(email)
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
  };

  const handleConfirm = () => {
    onConfirm(selectedEmails);
    onOpenChange(false);
  };

  const renderUserGroup = (title: string, userList: UserProfile[]) => {
    if (userList.length === 0) return null;
    
    const groupEmails = userList.map(u => u.email);
    const allSelected = groupEmails.length > 0 && groupEmails.every(e => selectedEmails.includes(e));

    return (
      <div className="space-y-2">
        <div className="font-semibold text-sm text-foreground">{title}</div>
        <div
          className="flex items-center gap-3 px-2 py-2 hover:bg-muted/30 cursor-pointer rounded"
          onClick={() => handleSelectAll(groupEmails)}
        >
          <Checkbox checked={allSelected} />
          <span className="text-sm font-medium">Select All</span>
        </div>
        {userList.map(user => (
          <div
            key={user.id}
            className="flex items-center gap-3 px-2 py-2 hover:bg-muted/30 cursor-pointer rounded ml-4"
            onClick={() => handleToggleEmail(user.email)}
          >
            <Checkbox checked={selectedEmails.includes(user.email)} />
            <div className="flex flex-col">
              <span className="text-sm">{user.full_name || user.email}</span>
              {user.full_name && (
                <span className="text-xs text-muted-foreground">{user.email}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" hideClose>
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Select Email Addresses</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
          >
            <X className="w-5 h-5" />
          </Button>
        </DialogHeader>
        <DialogDescription className="sr-only">
          Select users to receive scheduled report emails
        </DialogDescription>

        {/* Search and Filter */}
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {USER_FILTERS.map(f => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* User Lists */}
        <ScrollArea className="h-80 mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading users...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No users found
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
              <div className="space-y-4">
                {renderUserGroup("Admin Users", groupedUsers.admins)}
                {renderUserGroup("Manager Users", groupedUsers.managers)}
              </div>
              <div className="space-y-4">
                {renderUserGroup("Other Users", groupedUsers.others)}
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <span className="text-sm text-muted-foreground">
            {selectedEmails.length} recipient{selectedEmails.length !== 1 ? "s" : ""} selected
          </span>
          <Button onClick={handleConfirm} className="px-8">
            Ok
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
