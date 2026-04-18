import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from "react";
import { useAuthRaw } from "@/hooks/useAuthRaw";

// Shape of the impersonation override that ImpersonationProvider pushes in.
// When set, useAuthContext() returns these values *instead* of the real session,
// so all downstream hooks (useApprovals, useDriverScope, useOrganization, etc.)
// transparently operate as the impersonated user.
export interface ImpersonationOverride {
  userId: string;
  profile: {
    id: string;
    organization_id: string | null;
    full_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  roles: { role: string; organization_id: string }[];
}

type RawAuth = ReturnType<typeof useAuthRaw>;

type AuthContextType = RawAuth & {
  /** True when a super_admin is acting as another user. */
  isImpersonating: boolean;
  /** The real (logged-in) super_admin user — never overridden. */
  realUser: RawAuth["user"];
  realProfile: RawAuth["profile"];
  realRoles: RawAuth["roles"];
  /** Setter used by ImpersonationProvider; do not call elsewhere. */
  _setImpersonationOverride: (override: ImpersonationOverride | null) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const auth = useAuthRaw();
  const [override, setOverride] = useState<ImpersonationOverride | null>(null);

  const _setImpersonationOverride = useCallback(
    (next: ImpersonationOverride | null) => setOverride(next),
    [],
  );

  const value = useMemo<AuthContextType>(() => {
    if (!override) {
      return {
        ...auth,
        isImpersonating: false,
        realUser: auth.user,
        realProfile: auth.profile,
        realRoles: auth.roles,
        _setImpersonationOverride,
      };
    }

    // Build a synthetic User shape for the impersonated user. We only ever need
    // id + email downstream; the real Supabase session remains untouched so RLS
    // still trusts the super_admin's JWT.
    const impersonatedUser = {
      ...(auth.user ?? ({} as any)),
      id: override.userId,
      email: override.profile?.email ?? auth.user?.email,
    } as RawAuth["user"];

    const hasRoleOverride = (role: string, organizationId?: string) =>
      override.roles.some(
        (r) =>
          r.role === role &&
          (organizationId ? r.organization_id === organizationId : true),
      );

    return {
      ...auth,
      user: impersonatedUser,
      profile: override.profile,
      roles: override.roles,
      organizationId: override.profile?.organization_id ?? null,
      hasRole: hasRoleOverride,
      isOrgAdmin: () => hasRoleOverride("org_admin") || hasRoleOverride("super_admin"),
      isOperator: () =>
        hasRoleOverride("operator") ||
        hasRoleOverride("org_admin") ||
        hasRoleOverride("super_admin"),
      isImpersonating: true,
      realUser: auth.user,
      realProfile: auth.profile,
      realRoles: auth.roles,
      _setImpersonationOverride,
    };
  }, [auth, override, _setImpersonationOverride]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};
