import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const usePermissions = () => {
  const { user, roles: userRoles, loading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [superAdminOverride, setSuperAdminOverride] = useState<boolean | null>(null);

  const roles = useMemo(() => userRoles.map((r) => r.role), [userRoles]);

  useEffect(() => {
    let cancelled = false;
    const timeoutIds: number[] = [];

    const checkSuperAdmin = async (attempt = 0) => {
      if (!user) {
        if (!cancelled) setSuperAdminOverride(null);
        return;
      }

      if (roles.includes("super_admin")) {
        if (!cancelled) setSuperAdminOverride(true);
        return;
      }

      const { data, error } = await supabase.rpc("is_super_admin", { _user_id: user.id });

      if (cancelled) return;

      if (error) {
        const isTransient =
          error.message?.includes("503") ||
          error.message?.includes("upstream") ||
          error.message?.includes("timeout");

        if (isTransient && attempt < 5) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
          const id = window.setTimeout(() => checkSuperAdmin(attempt + 1), delay);
          timeoutIds.push(id);
          return;
        }

        setSuperAdminOverride(false);
        return;
      }

      setSuperAdminOverride(Boolean(data));
    };

    if (user) {
      checkSuperAdmin();
    } else {
      setSuperAdminOverride(null);
    }

    return () => {
      cancelled = true;
      timeoutIds.forEach((id) => window.clearTimeout(id));
    };
  }, [user, roles]);

  useEffect(() => {
    const resolvedSuperAdmin = roles.includes("super_admin") || superAdminOverride === true;

    if (authLoading && !resolvedSuperAdmin) {
      setLoading(true);
      return;
    }

    // Keep loading while we are still resolving fallback admin status
    if (user && roles.length === 0 && superAdminOverride === null) {
      setLoading(true);
      return;
    }

    if (!user || (roles.length === 0 && !resolvedSuperAdmin)) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      try {
        setLoading(true);

        // If roles list is empty but super admin is confirmed by secure RPC,
        // skip permissions query and rely on role checks.
        if (roles.length === 0 && resolvedSuperAdmin) {
          setPermissions([]);
          return;
        }

        // Prefer the SECURITY DEFINER RPC that already merges per-user
        // overrides (granted/revoked) on top of the role-based matrix.
        const { data: effective, error: effError } = await supabase.rpc(
          "get_effective_permissions",
          { _user_id: user!.id },
        );

        if (!effError && Array.isArray(effective)) {
          const names = effective
            .map((row: any) => row?.permission_name)
            .filter(Boolean);
          setPermissions([...new Set(names)]);
          return;
        }

        // Fallback: role-only mapping (legacy path).
        const { data: rolePermissions, error: permsError } = await supabase
          .from("role_permissions")
          .select(`
            permissions (
              name
            )
          `)
          .in("role", roles as any);

        if (permsError) throw permsError;

        const permsList =
          rolePermissions
            ?.map((rp) => (rp as any).permissions?.name)
            .filter(Boolean) || [];

        setPermissions([...new Set(permsList)]);
      } catch (error) {
        console.error("Error fetching permissions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [authLoading, user, roles, superAdminOverride]);

  const hasRole = (role: string) => {
    if (role === "super_admin") {
      return roles.includes("super_admin") || superAdminOverride === true;
    }
    return roles.includes(role);
  };

  const hasPermission = (permission: string) => permissions.includes(permission);

  const hasAnyRole = (roleList: string[]) => roleList.some((r) => hasRole(r));

  const hasAllPermissions = (permList: string[]) => permList.every((p) => hasPermission(p));

  return {
    roles,
    permissions,
    loading,
    hasRole,
    hasPermission,
    hasAnyRole,
    hasAllPermissions,
    isSuperAdmin: hasRole("super_admin"),
  };
};
