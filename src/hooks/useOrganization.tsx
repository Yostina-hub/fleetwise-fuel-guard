import { useAuthContext } from "@/contexts/AuthContext";
import { useOrganizationContext } from "@/contexts/OrganizationContext";

/**
 * Hook to access organization data.
 * Uses OrganizationContext's effectiveOrganizationId which supports
 * super_admin org switching for multi-tenant management.
 */
export const useOrganization = () => {
  const { organizationLoading } = useAuthContext();
  const { effectiveOrganizationId } = useOrganizationContext();

  return {
    organizationId: effectiveOrganizationId,
    loading: organizationLoading,
  };
};
