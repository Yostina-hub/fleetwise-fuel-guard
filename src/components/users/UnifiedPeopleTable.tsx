import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { formatDistanceToNow } from "date-fns";
import {
  KeyRound,
  MoreHorizontal,
  Shield,
  Trash2,
  UserCheck,
  UserCog,
  UserPlus,
  UserX,
  Users as UsersIcon,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { UnifiedPerson } from "@/hooks/useUnifiedPeople";
import { ROLE_COLORS, ROLE_LABELS } from "@/lib/roleMapping";

const SOURCE_BADGE: Record<UnifiedPerson["source"], { label: string; cls: string }> = {
  user: { label: "System User", cls: "bg-primary/10 text-primary border-primary/30" },
  driver: { label: "Driver", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  employee: { label: "Employee", cls: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" },
};

const getInitials = (name: string, email: string | null) => {
  if (name && name !== "Unnamed User") {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  }
  return (email?.[0] ?? "?").toUpperCase();
};

interface UnifiedPeopleTableProps {
  people: UnifiedPerson[];
  loading: boolean;
  onViewUser?: (p: UnifiedPerson) => void;
  onManageRoles?: (p: UnifiedPerson) => void;
  onProvisionAccount: (p: UnifiedPerson) => void;
  onResetPassword?: (p: UnifiedPerson) => void;
  onToggleStatus?: (p: UnifiedPerson) => void;
  onDeleteUser?: (p: UnifiedPerson) => void;
}

const RowActions = ({
  person,
  onViewUser,
  onManageRoles,
  onProvisionAccount,
  onResetPassword,
  onToggleStatus,
  onDeleteUser,
}: Omit<UnifiedPeopleTableProps, "people" | "loading"> & { person: UnifiedPerson }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-52">
      {person.hasLogin ? (
        <>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewUser?.(person); }}>
            <UserCog className="w-4 h-4 mr-2" /> View Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onManageRoles?.(person); }}>
            <Shield className="w-4 h-4 mr-2" /> Manage Roles
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onResetPassword?.(person); }}>
            <KeyRound className="w-4 h-4 mr-2" /> Reset Password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => { e.stopPropagation(); onToggleStatus?.(person); }}
            className={person.isBanned ? "text-emerald-400 focus:text-emerald-400" : "text-amber-400 focus:text-amber-400"}
          >
            {person.isBanned ? <><UserCheck className="w-4 h-4 mr-2" /> Activate</> : <><UserX className="w-4 h-4 mr-2" /> Deactivate</>}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => { e.stopPropagation(); onDeleteUser?.(person); }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" /> Delete User
          </DropdownMenuItem>
        </>
      ) : (
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onProvisionAccount(person); }}>
          <UserPlus className="w-4 h-4 mr-2" /> Provision Login
        </DropdownMenuItem>
      )}
    </DropdownMenuContent>
  </DropdownMenu>
);

const RolesCell = ({ person }: { person: UnifiedPerson }) => {
  if (person.roles.length === 0) {
    return <span className="text-xs text-muted-foreground italic">No roles</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {person.roles.map((r) => (
        <Badge key={r} variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${ROLE_COLORS[r] || ""}`}>
          {ROLE_LABELS[r] || r}
        </Badge>
      ))}
    </div>
  );
};

const StatusCell = ({ person }: { person: UnifiedPerson }) => {
  if (!person.hasLogin) {
    return (
      <Badge variant="outline" className="bg-muted/40 text-muted-foreground border-border text-[10px]">
        No Login
      </Badge>
    );
  }
  if (person.isBanned) {
    return (
      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-[10px]">
        Deactivated
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
      Active
    </Badge>
  );
};

const UnifiedPeopleTable = ({
  people,
  loading,
  onViewUser,
  onManageRoles,
  onProvisionAccount,
  onResetPassword,
  onToggleStatus,
  onDeleteUser,
}: UnifiedPeopleTableProps) => {
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-pulse text-muted-foreground">Loading people...</div>
      </div>
    );
  }

  if (people.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <UsersIcon className="w-12 h-12 mb-3 opacity-40" />
        <p className="text-lg font-medium">No people found</p>
        <p className="text-sm">Try adjusting your search or filters</p>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="px-3 pb-2 space-y-2">
        {people.map((person) => {
          const src = SOURCE_BADGE[person.source];
          return (
            <div
              key={person.key}
              className="rounded-xl border border-border/30 bg-muted/10 p-3 active:bg-muted/30 transition-colors touch-manipulation"
              onClick={() => person.hasLogin ? onViewUser?.(person) : onProvisionAccount(person)}
            >
              <div className="flex items-start gap-3">
                <Avatar className={`h-10 w-10 border shrink-0 ${person.isBanned ? "border-destructive/50 opacity-60" : "border-border/50"}`}>
                  <AvatarImage src={person.avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {getInitials(person.fullName, person.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`font-medium text-sm truncate ${person.isBanned ? "text-muted-foreground line-through" : ""}`}>
                      {person.fullName}
                    </p>
                    <RowActions
                      person={person}
                      onViewUser={onViewUser}
                      onManageRoles={onManageRoles}
                      onProvisionAccount={onProvisionAccount}
                      onResetPassword={onResetPassword}
                      onToggleStatus={onToggleStatus}
                      onDeleteUser={onDeleteUser}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{person.email || "no email"}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${src.cls}`}>{src.label}</Badge>
                    {person.jobTitle && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {person.jobTitle}
                      </Badge>
                    )}
                    <StatusCell person={person} />
                  </div>
                  <div className="mt-2">
                    <RolesCell person={person} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border/50 hover:bg-transparent">
            <TableHead className="w-[280px]">Person</TableHead>
            <TableHead className="w-[120px]">Source</TableHead>
            <TableHead>Roles</TableHead>
            <TableHead className="hidden md:table-cell">Job / Type</TableHead>
            <TableHead className="hidden lg:table-cell">Status</TableHead>
            <TableHead className="hidden xl:table-cell">Joined</TableHead>
            <TableHead className="w-[60px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {people.map((person) => {
            const src = SOURCE_BADGE[person.source];
            return (
              <TableRow
                key={person.key}
                className="border-border/30 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => person.hasLogin ? onViewUser?.(person) : onProvisionAccount(person)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className={`h-9 w-9 border ${person.isBanned ? "border-destructive/50 opacity-60" : "border-border/50"}`}>
                      <AvatarImage src={person.avatarUrl || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {getInitials(person.fullName, person.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className={`font-medium text-sm truncate ${person.isBanned ? "text-muted-foreground line-through" : ""}`}>
                        {person.fullName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{person.email || "—"}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${src.cls}`}>
                    {src.label}
                  </Badge>
                </TableCell>
                <TableCell><RolesCell person={person} /></TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="text-sm text-muted-foreground">{person.jobTitle || "—"}</span>
                </TableCell>
                <TableCell className="hidden lg:table-cell"><StatusCell person={person} /></TableCell>
                <TableCell className="hidden xl:table-cell">
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(person.createdAt), { addSuffix: true })}
                  </span>
                </TableCell>
                <TableCell>
                  <RowActions
                    person={person}
                    onViewUser={onViewUser}
                    onManageRoles={onManageRoles}
                    onProvisionAccount={onProvisionAccount}
                    onResetPassword={onResetPassword}
                    onToggleStatus={onToggleStatus}
                    onDeleteUser={onDeleteUser}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default UnifiedPeopleTable;
