/**
 * useCan — verb-aware permission check tied to the role_permissions matrix.
 *
 * Resolves <resource>.<action> against the cached permissions list from
 * `usePermissions`. Falls back to common synonyms (`edit` ↔ `update`,
 * `read` ↔ `view`) so callers can pick the verb that reads naturally without
 * worrying about the legacy seed naming.
 *
 * Super admins always pass.
 */
import { useMemo } from "react";
import { usePermissions } from "./usePermissions";

const SYNONYMS: Record<string, string[]> = {
  read: ["read", "view"],
  view: ["view", "read"],
  edit: ["edit", "update"],
  update: ["update", "edit"],
  create: ["create", "write"],
  write: ["write", "create"],
  delete: ["delete", "remove"],
  remove: ["remove", "delete"],
};

export const useCan = (resource: string, action: string) => {
  const { permissions, loading, isSuperAdmin } = usePermissions();

  const allowed = useMemo(() => {
    if (isSuperAdmin) return true;
    const verbs = SYNONYMS[action] ?? [action];
    return verbs.some((verb) => permissions.includes(`${resource}.${verb}`));
  }, [permissions, isSuperAdmin, resource, action]);

  return { allowed, loading };
};

/**
 * useCanAny — returns true if the user has ANY of the requested permissions.
 * Useful for menu items that map to several possible actions on a resource.
 */
export const useCanAny = (
  checks: Array<{ resource: string; action: string }>,
) => {
  const { permissions, loading, isSuperAdmin } = usePermissions();

  const allowed = useMemo(() => {
    if (isSuperAdmin) return true;
    return checks.some(({ resource, action }) => {
      const verbs = SYNONYMS[action] ?? [action];
      return verbs.some((v) => permissions.includes(`${resource}.${v}`));
    });
  }, [permissions, isSuperAdmin, checks]);

  return { allowed, loading };
};
