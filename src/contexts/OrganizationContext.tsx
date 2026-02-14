import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuthContext } from "./AuthContext";
import { usePermissions } from "@/hooks/usePermissions";

interface OrganizationContextType {
  viewingAsOrganizationId: string | null;
  setViewingAsOrganizationId: (orgId: string | null) => void;
  effectiveOrganizationId: string | null;
  isSuperAdminViewingAsOrg: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider = ({ children }: { children: ReactNode }) => {
  const { organizationId } = useAuthContext();
  const { isSuperAdmin } = usePermissions();
  const [viewingAsOrganizationId, setViewingAsOrganizationId] = useState<string | null>(null);

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
