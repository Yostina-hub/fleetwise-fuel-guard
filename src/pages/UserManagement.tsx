import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [statusActionUser, setStatusActionUser] = useState<UserProfile | null>(null);
  const [statusActionLoading, setStatusActionLoading] = useState(false);
  const [deleteUser, setDeleteUser] = useState<UserProfile | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
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

      const statusPromises = usersWithRoles.map(async (user) => {
        try {
          const { data } = await supabase.functions.invoke("manage-user", {
            body: { action: "get_status", userId: user.id },
          });
          return { ...user, is_banned: data?.banned === true };
        } catch {
          return { ...user, is_banned: false };
        }
      });

      const usersWithStatus = await Promise.all(statusPromises);
      setUsers(usersWithStatus);

      setDetailUser(prev => prev ? usersWithStatus.find(u => u.id === prev.id) || null : null);
      setResetPwdUser(prev => prev ? usersWithStatus.find(u => u.id === prev.id) || null : null);
      setStatusActionUser(prev => prev ? usersWithStatus.find(u => u.id === prev.id) || null : null);
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
    const headers = ["Name", "Email", "Phone", "Roles", "Status", "Joined"];
    const rows = filteredUsers.map(u => [
      u.full_name || "",
      u.email,
      u.phone || "",
      u.user_roles.map(r => r.role).join("; "),
      u.is_banned ? "Deactivated" : "Active",
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
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || `Failed to ${action} user`, variant: "destructive" });
    } finally {
      setStatusActionLoading(false);
    }
  }, [statusActionUser, toast, fetchUsers]);

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
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to delete user", variant: "destructive" });
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteUser, toast, fetchUsers]);

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
    activeUsers: users.filter(u => !u.is_banned).length,
    unassignedUsers: users.filter(u => u.user_roles.length === 0).length,
  };

  return (
    <Layout>
      <div className="p-3 sm:p-4 md:p-8 space-y-4 sm:space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3 slide-in-left">
          <div className="p-3 sm:p-4 rounded-2xl glass-strong glow">
            <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary animate-float" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-4xl font-bold gradient-text">{t("users.title")}</h1>
            <p className="text-muted-foreground mt-0.5 sm:mt-1 text-sm sm:text-lg">{t("users.permissions")}</p>
          </div>
        </div>

        <UsersQuickStats {...userStats} />

        <UsersQuickActions
          onInviteUser={() => setInviteDialogOpen(true)}
          onRefreshUsers={fetchUsers}
          onExportUsers={handleExportUsers}
          onBulkAssignRoles={() => setBulkAssignOpen(true)}
        />

        <UserFilters
          users={users}
          onFilteredUsersChange={handleFilteredUsersChange}
          onPageReset={() => setCurrentPage(1)}
        />

        {/* Users Table */}
        <Card className="glass-strong">
          <CardHeader className="pb-3 px-3 sm:px-6">
            <CardTitle className="text-base sm:text-lg flex items-center justify-between">
              <span>All Users</span>
              <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            <UserTable
              users={paginatedUsers}
              loading={loading}
              onViewUser={(u) => { setDetailTab("profile"); setDetailUser(u); }}
              onAssignRole={(u) => { setDetailTab("roles"); setDetailUser(u); }}
              onResetPassword={setResetPwdUser}
              onToggleStatus={setStatusActionUser}
              onDeleteUser={setDeleteUser}
            />
          </CardContent>
        </Card>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="h-9 px-3 gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Prev</span>
            </Button>

            <div className="flex items-center gap-1">
              {(() => {
                const pages: number[] = [];
                const maxVisible = 5;
                if (totalPages <= maxVisible) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i);
                } else if (currentPage <= 3) {
                  for (let i = 1; i <= Math.min(maxVisible, totalPages); i++) pages.push(i);
                } else if (currentPage >= totalPages - 2) {
                  for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) pages.push(i);
                } else {
                  for (let i = currentPage - 2; i <= currentPage + 2; i++) pages.push(i);
                }
                return pages.map(page => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    className="h-9 w-9 p-0"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                ));
              })()}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="h-9 px-3 gap-1"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Dialogs */}
        <InviteUserDialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen} onUserCreated={fetchUsers} />
        <BulkRoleAssignDialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen} users={users} onComplete={fetchUsers} />
        <UserDetailDialog open={!!detailUser} onOpenChange={(o) => !o && setDetailUser(null)} user={detailUser} onUserUpdated={fetchUsers} initialTab={detailTab} />
        <ResetPasswordDialog open={!!resetPwdUser} onOpenChange={(o) => !o && setResetPwdUser(null)} user={resetPwdUser} />
        
        <ConfirmActionDialog
          open={!!statusActionUser}
          onOpenChange={(o) => !o && setStatusActionUser(null)}
          title={statusActionUser?.is_banned ? "Activate User" : "Deactivate User"}
          description={
            statusActionUser?.is_banned
              ? `Are you sure you want to activate ${statusActionUser?.email}? They will be able to sign in again.`
              : `Are you sure you want to deactivate ${statusActionUser?.email}? They will no longer be able to sign in.`
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
          description={`Are you sure you want to permanently delete ${deleteUser?.email}? This will remove their account, profile, and all role assignments. This action CANNOT be undone.`}
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
