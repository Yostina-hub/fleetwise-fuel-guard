import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import UsersQuickStats from "@/components/users/UsersQuickStats";
import UsersQuickActions from "@/components/users/UsersQuickActions";
import InviteUserDialog from "@/components/users/InviteUserDialog";
import BulkRoleAssignDialog from "@/components/users/BulkRoleAssignDialog";
import UserTable from "@/components/users/UserTable";
import UserDetailDialog from "@/components/users/UserDetailDialog";
import ResetPasswordDialog from "@/components/users/ResetPasswordDialog";
import ConfirmActionDialog from "@/components/users/ConfirmActionDialog";
import UserFilters from "@/components/users/UserFilters";
import type { UserProfile } from "@/components/users/UserTable";

const UserManagement = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isSuperAdmin } = usePermissions();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<UserProfile | null>(null);
  const [detailTab, setDetailTab] = useState<"profile" | "roles">("profile");
  const [resetPwdUser, setResetPwdUser] = useState<UserProfile | null>(null);
  const [deactivateUser, setDeactivateUser] = useState<UserProfile | null>(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);
  const itemsPerPage = 12;

  const fetchUsers = useCallback(async () => {
    try {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("id, email, full_name, avatar_url, phone, created_at, organization_id"),
        supabase.from("user_roles").select("user_id, role"),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const usersWithRoles: UserProfile[] = (profilesRes.data || []).map((profile) => ({
        ...profile,
        user_roles: (rolesRes.data || [])
          .filter((ur) => ur.user_id === profile.id)
          .map((ur) => ({ role: ur.role })),
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({ title: "Error", description: "Failed to load users", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleFilteredUsersChange = useCallback((filtered: UserProfile[]) => {
    setFilteredUsers(filtered);
  }, []);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage]);

  const handleExportUsers = useCallback(() => {
    const headers = ["Name", "Email", "Phone", "Roles", "Joined"];
    const rows = filteredUsers.map(u => [
      u.full_name || "",
      u.email,
      u.phone || "",
      u.user_roles.map(r => r.role).join("; "),
      new Date(u.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export Complete", description: `${filteredUsers.length} users exported to CSV` });
  }, [filteredUsers, toast]);

  const handleDeactivateUser = useCallback(async () => {
    if (!deactivateUser) return;
    setDeactivateLoading(true);
    try {
      const { error } = await supabase.functions.invoke("manage-user", {
        body: { action: "deactivate", userId: deactivateUser.id },
      });
      if (error) throw error;
      toast({ title: "User Deactivated", description: `${deactivateUser.email} has been deactivated.` });
      setDeactivateUser(null);
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to deactivate user", variant: "destructive" });
    } finally {
      setDeactivateLoading(false);
    }
  }, [deactivateUser, toast, fetchUsers]);

  if (!isSuperAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground">Only Super Admins can access user management</p>
          </div>
        </div>
      </Layout>
    );
  }

  const userStats = {
    totalUsers: users.length,
    admins: users.filter(u => u.user_roles.some(r => r.role === "super_admin")).length,
    activeUsers: users.filter(u => u.user_roles.length > 0).length,
    unassignedUsers: users.filter(u => u.user_roles.length === 0).length,
  };

  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3 slide-in-left">
          <div className="p-4 rounded-2xl glass-strong glow">
            <Users className="h-8 w-8 text-primary animate-float" />
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-bold gradient-text">{t("users.title")}</h1>
            <p className="text-muted-foreground mt-1 text-lg">{t("users.permissions")}</p>
          </div>
        </div>

        <UsersQuickStats {...userStats} />

        <UsersQuickActions
          onInviteUser={() => setInviteDialogOpen(true)}
          onRefreshUsers={fetchUsers}
          onExportUsers={handleExportUsers}
          onBulkAssignRoles={() => setBulkAssignOpen(true)}
        />

        {/* Filters */}
        <UserFilters
          users={users}
          onFilteredUsersChange={handleFilteredUsersChange}
          onPageReset={() => setCurrentPage(1)}
        />

        {/* Users Table */}
        <Card className="glass-strong">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>All Users</span>
              <span className="text-sm font-normal text-muted-foreground">
                {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <UserTable
              users={paginatedUsers}
              loading={loading}
              onViewUser={setDetailUser}
              onAssignRole={setDetailUser}
              onResetPassword={setResetPwdUser}
              onToggleStatus={setDeactivateUser}
            />
          </CardContent>
        </Card>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let page: number;
                if (totalPages <= 7) {
                  page = i + 1;
                } else if (currentPage <= 4) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 3) {
                  page = totalPages - 6 + i;
                } else {
                  page = currentPage - 3 + i;
                }
                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => setCurrentPage(page)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}

        {/* Dialogs */}
        <InviteUserDialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen} onUserCreated={fetchUsers} />
        <BulkRoleAssignDialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen} users={users} onComplete={fetchUsers} />
        <UserDetailDialog open={!!detailUser} onOpenChange={(o) => !o && setDetailUser(null)} user={detailUser} onUserUpdated={fetchUsers} />
        <ResetPasswordDialog open={!!resetPwdUser} onOpenChange={(o) => !o && setResetPwdUser(null)} user={resetPwdUser} />
        <ConfirmActionDialog
          open={!!deactivateUser}
          onOpenChange={(o) => !o && setDeactivateUser(null)}
          title="Deactivate User"
          description={`Are you sure you want to deactivate ${deactivateUser?.email}? They will no longer be able to sign in.`}
          confirmLabel="Deactivate"
          loading={deactivateLoading}
          onConfirm={handleDeactivateUser}
        />
      </div>
    </Layout>
  );
};

export default UserManagement;
