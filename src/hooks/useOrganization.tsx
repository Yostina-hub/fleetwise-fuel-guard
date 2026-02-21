import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganizationContext } from "@/contexts/OrganizationContext";

/**
 * Hook to access organization data.
 * Uses OrganizationContext's effectiveOrganizationId which supports
 * super_admin org switching for multi-tenant management.
 */
export const useOrganization = () => {
  const { organizationLoading, hasRole } = useAuthContext();
  const { effectiveOrganizationId, viewingAsOrganizationId } = useOrganizationContext();

  const isSuperAdmin = hasRole("super_admin");
  // Super admin viewing platform-wide (no specific org selected)
  const isViewingAllOrgs = isSuperAdmin && viewingAsOrganizationId === null;

  return {
    organizationId: effectiveOrganizationId,
    loading: organizationLoading,
    isSuperAdmin,
    isViewingAllOrgs,
  };
};
