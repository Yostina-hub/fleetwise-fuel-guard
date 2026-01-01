import { useAuthContext } from "@/contexts/AuthContext";

/**
 * Hook to access organization data from the centralized AuthContext.
 * This hook no longer makes database calls - the organizationId is fetched
 * once when the user logs in and cached in AuthContext.
 */
export const useOrganization = () => {
  const { organizationId, organizationLoading } = useAuthContext();

  return {
    organizationId,
    loading: organizationLoading,
  };
};
