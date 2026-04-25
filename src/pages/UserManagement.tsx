import { useMemo, useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, Search, ChevronLeft, ChevronRight, Download, RefreshCw, UserPlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useUnifiedPeople, type UnifiedPerson } from "@/hooks/useUnifiedPeople";
import PeopleStats from "@/components/users/PeopleStats";
import UnifiedPeopleTable from "@/components/users/UnifiedPeopleTable";
import ProvisionAccountDialog from "@/components/users/ProvisionAccountDialog";
import InviteUserDialog from "@/components/users/InviteUserDialog";
import UserDetailDialog from "@/components/users/UserDetailDialog";
import ResetPasswordDialog from "@/components/users/ResetPasswordDialog";
import ConfirmActionDialog from "@/components/users/ConfirmActionDialog";
import type { UserProfile } from "@/components/users/UserTable";
import { ROLE_LABELS } from "@/lib/roleMapping";
import { friendlyToastError } from "@/lib/errorMessages";

type TabKey = "all" | "users" | "drivers" | "workforce";

const ROLE_FILTER_OPTIONS = [
  "super_admin",
  "org_admin",
  "fleet_manager",
  "operations_manager",
  "dispatcher",
  "driver",
  "mechanic",
  "technician",
  "operator",
  "fuel_controller",
  "viewer",
];

const ITEMS_PER_PAGE = 15;

const toUserProfile = (p: UnifiedPerson): UserProfile => ({
  id: p.userId ?? p.recordId,
  email: p.email ?? "",
  full_name: p.fullName,
  avatar_url: p.avatarUrl,
  phone: p.phone,
  created_at: p.createdAt,
  organization_id: p.organizationId,
  user_roles: p.roles.map((role) => ({ role })),
  is_banned: p.isBanned,
});

const UserManagement = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isSuperAdmin, hasRole } = usePermissions();
  const isAdmin = isSuperAdmin || hasRole("org_admin");

  const { people, loading, refresh } = useUnifiedPeople();

  // Auth status enrichment (for users with logins)
  const [bannedMap, setBannedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    const userIds = people.filter((p) => p.userId).map((p) => p.userId!) as string[];
    if (userIds.length === 0) return;

    (async () => {
      const updates: Record<string, boolean> = {};
      // Limit concurrent calls — process in small batches
      for (let i = 0; i < userIds.length; i += 5) {
        if (cancelled) return;
        const batch = userIds.slice(i, i + 5);
        await Promise.all(batch.map(async (uid) => {
          try {
            const { data } = await supabase.functions.invoke("manage-user", {
              body: { action: "get_status", userId: uid },
            });
            updates[uid] = data?.banned === true;
          } catch {
            updates[uid] = false;
          }
        }));
      }
      if (!cancelled) setBannedMap((prev) => ({ ...prev, ...updates }));
    })();

    return () => { cancelled = true; };
  }, [people]);

  const enriched: UnifiedPerson[] = useMemo(
    () => people.map((p) => (p.userId ? { ...p, isBanned: bannedMap[p.userId] ?? false } : p)),
    [people, bannedMap]
  );

  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [linkFilter, setLinkFilter] = useState<"all" | "linked" | "unlinked">("all");
  const [page, setPage] = useState(1);

  // Dialog state
  const [provisionPerson, setProvisionPerson] = useState<UnifiedPerson | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<UserProfile | null>(null);
  const [detailTab, setDetailTab] = useState<"profile" | "hr" | "roles">("profile");
  const [resetPwdUser, setResetPwdUser] = useState<UserProfile | null>(null);
  const [statusActionUser, setStatusActionUser] = useState<UserProfile | null>(null);
  const [statusActionLoading, setStatusActionLoading] = useState(false);
  const [deleteUser, setDeleteUser] = useState<UserProfile | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const filtered = useMemo(() => {
    let list = enriched;

    // Tab filter
    if (tab === "users") list = list.filter((p) => p.source === "user");
    else if (tab === "drivers") list = list.filter((p) => p.employeeType === "driver" || p.source === "driver");
    else if (tab === "workforce") list = list.filter((p) => p.source !== "user" || (!!p.employeeId || !!p.driverId));

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) =>
        p.fullName.toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q) ||
        (p.phone ?? "").toLowerCase().includes(q) ||
        (p.jobTitle ?? "").toLowerCase().includes(q)
      );
    }

    // Role filter
    if (roleFilter !== "all") {
      list = list.filter((p) => p.roles.includes(roleFilter));
    }

    // Link filter
    if (linkFilter === "linked") list = list.filter((p) => p.hasLogin);
    else if (linkFilter === "unlinked") list = list.filter((p) => !p.hasLogin);

    return list;
  }, [enriched, tab, search, roleFilter, linkFilter]);

  useEffect(() => { setPage(1); }, [tab, search, roleFilter, linkFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, page]);

  const stats = useMemo(() => ({
    totalPeople: enriched.length,
    withLogin: enriched.filter((p) => p.hasLogin).length,
    withoutLogin: enriched.filter((p) => !p.hasLogin).length,
    admins: enriched.filter((p) => p.roles.some((r) => r === "super_admin" || r === "org_admin")).length,
  }), [enriched]);

  const tabCounts = useMemo(() => ({
    all: enriched.length,
    users: enriched.filter((p) => p.source === "user").length,
    drivers: enriched.filter((p) => p.employeeType === "driver" || p.source === "driver").length,
    workforce: enriched.filter((p) => p.source !== "user" || !!p.employeeId || !!p.driverId).length,
  }), [enriched]);

  const handleExport = useCallback(() => {
    const headers = ["Name", "Email", "Phone", "Source", "Job/Type", "Roles", "Has Login", "Status", "Joined"];
    const rows = filtered.map((p) => [
      p.fullName,
      p.email ?? "",
      p.phone ?? "",
      p.source,
      p.jobTitle ?? "",
      p.roles.join("; "),
      p.hasLogin ? "Yes" : "No",
      p.isBanned ? "Deactivated" : p.hasLogin ? "Active" : "—",
      new Date(p.createdAt).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `people_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export Complete", description: `${filtered.length} people exported.` });
  }, [filtered, toast]);

  const handleToggleStatus = useCallback(async () => {
    if (!statusActionUser) return;
    setStatusActionLoading(true);
    const action = statusActionUser.is_banned ? "activate" : "deactivate";
    try {
      const { data, error } = await supabase.functions.invoke("manage-user", {
        body: { action, userId: statusActionUser.id },
      });
      if (error) throw error;
      if (data && !data.success) throw new Error(data.error);
      toast({
        title: action === "activate" ? "User Activated" : "User Deactivated",
        description: `${statusActionUser.email} has been ${action === "activate" ? "activated" : "deactivated"}.`,
      });
      setStatusActionUser(null);
      setBannedMap((prev) => ({ ...prev, [statusActionUser.id]: action === "deactivate" }));
      refresh();
    } catch (err: any) {
      friendlyToastError(err, { fallback: `Failed to ${action} user` });
    } finally {
      setStatusActionLoading(false);
    }
  }, [statusActionUser, toast, refresh]);

  const handleDeleteUser = useCallback(async () => {
    if (!deleteUser) return;
    setDeleteLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-user", {
        body: { action: "delete", userId: deleteUser.id },
      });
      if (error) throw error;
      if (data && !data.success) throw new Error(data.error);
      toast({ title: "User Deleted", description: `${deleteUser.email} has been permanently deleted.` });
      setDeleteUser(null);
      refresh();
    } catch (err: any) {
      friendlyToastError(err, { fallback: "Failed to delete user" });
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteUser, toast, refresh]);

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground">Only admins can access user management</p>
          </div>
        </div>
      </Layout>
    );
  }

  const activeChips: { key: string; label: string; clear: () => void }[] = [];
  if (search) activeChips.push({ key: "search", label: `Search: ${search}`, clear: () => setSearch("") });
  if (roleFilter !== "all") activeChips.push({ key: "role", label: `Role: ${ROLE_LABELS[roleFilter] ?? roleFilter}`, clear: () => setRoleFilter("all") });
  if (linkFilter !== "all") activeChips.push({ key: "link", label: linkFilter === "linked" ? "Has Login" : "No Login", clear: () => setLinkFilter("all") });

  return (
    <Layout>
      <div className="p-3 sm:p-4 md:p-8 space-y-4 sm:space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 slide-in-left">
            <div className="p-3 sm:p-4 rounded-2xl glass-strong glow">
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary animate-float" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-4xl font-bold gradient-text">People & Access</h1>
              <p className="text-muted-foreground mt-0.5 sm:mt-1 text-sm sm:text-lg">
                Unified directory of users, drivers, and workforce
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={refresh} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
              <Download className="w-4 h-4" /> Export
            </Button>
            <Button size="sm" onClick={() => setInviteOpen(true)} className="gap-2">
              <UserPlus className="w-4 h-4" /> Create User
            </Button>
          </div>
        </div>

        <PeopleStats {...stats} />

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full sm:w-auto">
            <TabsTrigger value="all" className="gap-2">
              All <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{tabCounts.all}</Badge>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              System Users <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{tabCounts.users}</Badge>
            </TabsTrigger>
            <TabsTrigger value="drivers" className="gap-2">
              Drivers <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{tabCounts.drivers}</Badge>
            </TabsTrigger>
            <TabsTrigger value="workforce" className="gap-2">
              Workforce <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{tabCounts.workforce}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filters */}
        <Card className="glass-strong">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, email, phone, job title..."
                  className="pl-10 h-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-[180px] h-10">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {ROLE_FILTER_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r] ?? r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={linkFilter} onValueChange={(v) => setLinkFilter(v as typeof linkFilter)}>
                <SelectTrigger className="w-full sm:w-[160px] h-10">
                  <SelectValue placeholder="Login Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Login States</SelectItem>
                  <SelectItem value="linked">Has Login</SelectItem>
                  <SelectItem value="unlinked">No Login</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {activeChips.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {activeChips.map((chip) => (
                  <Badge
                    key={chip.key}
                    variant="secondary"
                    className="gap-1.5 pl-2.5 pr-1.5 py-1 text-xs cursor-pointer hover:bg-secondary/80"
                    onClick={chip.clear}
                  >
                    {chip.label}
                    <X className="w-3 h-3" />
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="glass-strong">
          <CardHeader className="pb-3 px-3 sm:px-6">
            <CardTitle className="text-base sm:text-lg flex items-center justify-between">
              <span>People Directory</span>
              <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                {filtered.length} record{filtered.length !== 1 ? "s" : ""}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <UnifiedPeopleTable
              people={paginated}
              loading={loading}
              onProvisionAccount={(p) => setProvisionPerson(p)}
              onViewUser={(p) => { setDetailTab("profile"); setDetailUser(toUserProfile(p)); }}
              onManageRoles={(p) => { setDetailTab("roles"); setDetailUser(toUserProfile(p)); }}
              onResetPassword={(p) => setResetPwdUser(toUserProfile(p))}
              onToggleStatus={(p) => setStatusActionUser(toUserProfile(p))}
              onDeleteUser={(p) => setDeleteUser(toUserProfile(p))}
            />
          </CardContent>
        </Card>

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="h-9 px-3 gap-1">
              <ChevronLeft className="w-4 h-4" /><span className="hidden sm:inline">Prev</span>
            </Button>
            <span className="text-sm text-muted-foreground px-2">Page {page} / {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="h-9 px-3 gap-1">
              <span className="hidden sm:inline">Next</span><ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Dialogs */}
        <ProvisionAccountDialog
          open={!!provisionPerson}
          onOpenChange={(o) => !o && setProvisionPerson(null)}
          person={provisionPerson}
          onProvisioned={refresh}
        />
        <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} onUserCreated={refresh} />
        <UserDetailDialog
          open={!!detailUser}
          onOpenChange={(o) => !o && setDetailUser(null)}
          user={detailUser}
          onUserUpdated={refresh}
          initialTab={detailTab}
        />
        <ResetPasswordDialog open={!!resetPwdUser} onOpenChange={(o) => !o && setResetPwdUser(null)} user={resetPwdUser} />

        <ConfirmActionDialog
          open={!!statusActionUser}
          onOpenChange={(o) => !o && setStatusActionUser(null)}
          title={statusActionUser?.is_banned ? "Activate User" : "Deactivate User"}
          description={
            statusActionUser?.is_banned
              ? `Activate ${statusActionUser?.email}? They will be able to sign in again.`
              : `Deactivate ${statusActionUser?.email}? They will no longer be able to sign in.`
          }
          confirmLabel={statusActionUser?.is_banned ? "Activate" : "Deactivate"}
          loading={statusActionLoading}
          onConfirm={handleToggleStatus}
          variant={statusActionUser?.is_banned ? "default" : "destructive"}
        />

        <ConfirmActionDialog
          open={!!deleteUser}
          onOpenChange={(o) => !o && setDeleteUser(null)}
          title="Delete User Permanently"
          description={`Permanently delete ${deleteUser?.email}? This removes their account, profile, and all role assignments. This cannot be undone.`}
          confirmLabel="Delete Permanently"
          loading={deleteLoading}
          onConfirm={handleDeleteUser}
          variant="destructive"
        />
      </div>
    </Layout>
  );
};

export default UserManagement;
