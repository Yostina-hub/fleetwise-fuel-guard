import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Shield, UserCog, KeyRound, UserX, UserCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  organization_id: string | null;
  user_roles: Array<{ role: string }>;
}

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

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  org_admin: "Org Admin",
  fleet_manager: "Fleet Manager",
  operator: "Operator",
  driver: "Driver",
  technician: "Technician",
  viewer: "Viewer",
  mechanic: "Mechanic",
};

interface UserTableProps {
  users: UserProfile[];
  loading: boolean;
  onViewUser: (user: UserProfile) => void;
  onAssignRole: (user: UserProfile) => void;
  onResetPassword: (user: UserProfile) => void;
  onToggleStatus: (user: UserProfile) => void;
}

const UserTable = ({ users, loading, onViewUser, onAssignRole, onResetPassword, onToggleStatus }: UserTableProps) => {
  const getInitials = (name: string | null, email: string) => {
    if (name) return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    return email[0].toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-pulse text-muted-foreground">Loading users...</div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <UserCog className="w-12 h-12 mb-3 opacity-40" />
        <p className="text-lg font-medium">No users found</p>
        <p className="text-sm">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border/50 hover:bg-transparent">
            <TableHead className="w-[300px]">User</TableHead>
            <TableHead>Roles</TableHead>
            <TableHead className="hidden md:table-cell">Phone</TableHead>
            <TableHead className="hidden lg:table-cell">Joined</TableHead>
            <TableHead className="hidden lg:table-cell">Status</TableHead>
            <TableHead className="w-[60px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow
              key={user.id}
              className="border-border/30 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => onViewUser(user)}
            >
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 border border-border/50">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {getInitials(user.full_name, user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{user.full_name || "Unnamed User"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {user.user_roles.length > 0 ? user.user_roles.map((ur) => (
                    <Badge
                      key={ur.role}
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 font-medium ${ROLE_COLORS[ur.role] || ""}`}
                    >
                      {ROLE_LABELS[ur.role] || ur.role}
                    </Badge>
                  )) : (
                    <span className="text-xs text-muted-foreground italic">Unassigned</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <span className="text-sm text-muted-foreground">{user.phone || "—"}</span>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                </span>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                  Active
                </Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewUser(user); }}>
                      <UserCog className="w-4 h-4 mr-2" /> View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAssignRole(user); }}>
                      <Shield className="w-4 h-4 mr-2" /> Manage Roles
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onResetPassword(user); }}>
                      <KeyRound className="w-4 h-4 mr-2" /> Reset Password
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); onToggleStatus(user); }}
                      className="text-destructive focus:text-destructive"
                    >
                      <UserX className="w-4 h-4 mr-2" /> Deactivate
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default UserTable;
