import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const usePermissions = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRoles([]);
      setPermissions([]);
      setLoading(false);
      return;
    }

    const fetchRolesAndPermissions = async () => {
      try {
        // Fetch user roles
        const { data: userRoles, error: rolesError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (rolesError) throw rolesError;

        const rolesList = userRoles?.map(r => r.role) || [];
        setRoles(rolesList);

        // Fetch permissions based on roles
        if (rolesList.length > 0) {
          const { data: rolePermissions, error: permsError } = await supabase
            .from("role_permissions")
            .select(`
              permissions (
                name
              )
            `)
            .in("role", rolesList);

          if (permsError) throw permsError;

          const permsList = rolePermissions
            ?.map(rp => (rp as any).permissions?.name)
            .filter(Boolean) || [];
          
          setPermissions([...new Set(permsList)]);
        }
      } catch (error) {
        console.error("Error fetching permissions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRolesAndPermissions();
  }, [user]);

  const hasRole = (role: string) => roles.includes(role);
  
  const hasPermission = (permission: string) => permissions.includes(permission);
  
  const hasAnyRole = (roleList: string[]) => roleList.some(r => hasRole(r));
  
  const hasAllPermissions = (permList: string[]) => permList.every(p => hasPermission(p));

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
