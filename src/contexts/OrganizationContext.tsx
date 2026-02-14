import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuthContext } from "./AuthContext";

interface OrganizationContextType {
  viewingAsOrganizationId: string | null;
  setViewingAsOrganizationId: (orgId: string | null) => void;
  effectiveOrganizationId: string | null;
  isSuperAdminViewingAsOrg: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider = ({ children }: { children: ReactNode }) => {
  const { hasRole, organizationId } = useAuthContext();
  const [viewingAsOrganizationId, setViewingAsOrganizationId] = useState<string | null>(null);

  const isSuperAdmin = hasRole("super_admin");
  const isSuperAdminViewingAsOrg = isSuperAdmin && viewingAsOrganizationId !== null;
  const effectiveOrganizationId = isSuperAdmin && viewingAsOrganizationId
    ? viewingAsOrganizationId
    : organizationId || null;

  useEffect(() => {
    if (!isSuperAdmin) setViewingAsOrganizationId(null);
  }, [isSuperAdmin]);

  return (
    <OrganizationContext.Provider
      value={{
        viewingAsOrganizationId,
        setViewingAsOrganizationId,
        effectiveOrganizationId,
        isSuperAdminViewingAsOrg,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganizationContext = () => {
  const context = useContext(OrganizationContext);
  if (!context) throw new Error("useOrganizationContext must be used within OrganizationProvider");
  return context;
};
