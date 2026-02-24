import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const usePermissions = () => {
  const { user, roles: userRoles, loading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const roles = useMemo(() => userRoles.map((r) => r.role), [userRoles]);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user || roles.length === 0) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      try {
        setLoading(true);

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
  }, [authLoading, user, roles]);

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
