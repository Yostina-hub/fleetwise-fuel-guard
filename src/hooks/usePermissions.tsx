import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const usePermissions = () => {
  const { user, roles: userRoles } = useAuth();
  const [fallbackRoles, setFallbackRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const roles = useMemo(() => {
    if (userRoles.length > 0) return userRoles.map((r) => r.role);
    return fallbackRoles;
  }, [userRoles, fallbackRoles]);

  // Resilient fallback: if auth role hydration is temporarily empty, fetch direct roles
  useEffect(() => {
    const fetchFallbackRoles = async () => {
      if (!user) {
        setFallbackRoles([]);
        return;
      }

      if (userRoles.length > 0) {
        setFallbackRoles([]);
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching fallback roles:", error);
        return;
      }

      setFallbackRoles((data || []).map((row) => row.role));
    };

    fetchFallbackRoles();
  }, [user, userRoles]);

  useEffect(() => {
    if (!user || roles.length === 0) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      try {
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
  }, [user, roles]);

  const hasRole = (role: string) => roles.includes(role);

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
