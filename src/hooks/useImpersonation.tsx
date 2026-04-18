import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface ImpersonationContextType {
  impersonatedUserId: string | null;
  impersonatedUserProfile: any | null;
  isImpersonating: boolean;
  sessionId: string | null;
  startImpersonation: (userId: string) => Promise<void>;
  endImpersonation: () => Promise<void>;
  logActivity: (
    activityType: string,
    action: string,
    details?: any,
    resourceType?: string,
    resourceId?: string
  ) => Promise<void>;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  // We talk to the *real* super_admin via realUser/realRoles — the AuthContext
  // override mechanism makes user/roles reflect the impersonated user once
  // impersonation starts, so we must not loop on those.
  const { realUser, realRoles, _setImpersonationOverride } = useAuthContext();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(null);
  const [impersonatedUserProfile, setImpersonatedUserProfile] = useState<any | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const isSuperAdmin = realRoles.some((r) => r.role === "super_admin");
  const isImpersonating = isSuperAdmin && impersonatedUserId !== null;

  // Track navigation while impersonating (audit trail)
  useEffect(() => {
    if (isImpersonating && sessionId) {
      logActivity("navigation", "navigate", {
        from: document.referrer,
        to: location.pathname + location.search,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search, isImpersonating, sessionId]);

  // Load impersonated profile + roles, push them into AuthContext override.
  useEffect(() => {
    if (!impersonatedUserId) {
      setImpersonatedUserProfile(null);
      _setImpersonationOverride(null);
      // Refetch all queries so they go back to super_admin's data
      queryClient.invalidateQueries();
      return;
    }

    let cancelled = false;
    const loadImpersonatedIdentity = async () => {
      const [profileRes, rolesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, phone, organization_id, created_at")
          .eq("id", impersonatedUserId)
          .single(),
        supabase
          .from("user_roles")
          .select("role, organization_id")
          .eq("user_id", impersonatedUserId),
      ]);

      if (cancelled) return;

      if (profileRes.error) {
        console.error("Error fetching impersonated user profile:", profileRes.error);
        toast.error("Could not load impersonated user — ending session");
        setImpersonatedUserId(null);
        return;
      }

      const profile = profileRes.data;
      const roles = (rolesRes.data ?? []) as { role: string; organization_id: string }[];

      setImpersonatedUserProfile(profile);
      _setImpersonationOverride({
        userId: impersonatedUserId,
        profile,
        roles,
      });

      // Refetch every query so all data is scoped to the impersonated user
      queryClient.invalidateQueries();
    };

    loadImpersonatedIdentity();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [impersonatedUserId]);

  const logActivity = useCallback(
    async (
      activityType: string,
      action: string,
      details: any = {},
      resourceType?: string,
      resourceId?: string,
    ) => {
      if (!isImpersonating || !sessionId) return;
      try {
        await supabase.functions.invoke("log-impersonation-activity", {
          body: {
            sessionId,
            impersonatedUserId,
            organizationId: impersonatedUserProfile?.organization_id,
            activityType,
            resourceType,
            resourceId,
            action,
            details,
            metadata: {
              url: window.location.href,
              pathname: location.pathname,
              timestamp: new Date().toISOString(),
            },
          },
        });
      } catch (error) {
        console.error("Error logging activity:", error);
      }
    },
    [isImpersonating, sessionId, impersonatedUserId, impersonatedUserProfile, location.pathname],
  );

  const startImpersonation = async (userId: string) => {
    if (!isSuperAdmin) {
      toast.error("Only super admins can impersonate users");
      return;
    }
    if (userId === realUser?.id) {
      toast.error("You cannot impersonate yourself");
      return;
    }

    try {
      const newSessionId = crypto.randomUUID();

      const { data: profileData } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", userId)
        .single();

      const { error: logError } = await supabase.functions.invoke("log-impersonation", {
        body: {
          impersonatedUserId: userId,
          action: "start",
          organizationId: profileData?.organization_id,
        },
      });

      if (logError) {
        console.error("Error logging impersonation:", logError);
        toast.error("Failed to start impersonation");
        return;
      }

      setSessionId(newSessionId);
      setImpersonatedUserId(userId);

      await supabase.functions.invoke("log-impersonation-activity", {
        body: {
          sessionId: newSessionId,
          impersonatedUserId: userId,
          organizationId: profileData?.organization_id,
          activityType: "user_action",
          action: "impersonation_started",
          details: { timestamp: new Date().toISOString() },
          metadata: { url: window.location.href },
        },
      });

      toast.success("Now acting as the selected user — every action is recorded");
    } catch (error: any) {
      console.error("Error starting impersonation:", error);
      toast.error("Failed to start impersonation");
    }
  };

  const endImpersonation = async () => {
    if (!impersonatedUserId || !sessionId) return;

    try {
      await supabase.functions.invoke("log-impersonation-activity", {
        body: {
          sessionId,
          impersonatedUserId,
          organizationId: impersonatedUserProfile?.organization_id,
          activityType: "user_action",
          action: "impersonation_ended",
          details: { timestamp: new Date().toISOString() },
          metadata: { url: window.location.href },
        },
      });

      await supabase.functions.invoke("log-impersonation", {
        body: {
          impersonatedUserId,
          action: "end",
          organizationId: impersonatedUserProfile?.organization_id,
        },
      });

      setImpersonatedUserId(null);
      setImpersonatedUserProfile(null);
      setSessionId(null);
      toast.success("Impersonation ended");
    } catch (error: any) {
      console.error("Error ending impersonation:", error);
      toast.error("Failed to end impersonation");
    }
  };

  // Safety: drop impersonation if the real user loses super_admin
  useEffect(() => {
    if (!isSuperAdmin && impersonatedUserId) {
      setImpersonatedUserId(null);
      setImpersonatedUserProfile(null);
      setSessionId(null);
    }
  }, [isSuperAdmin, impersonatedUserId]);

  return (
    <ImpersonationContext.Provider
      value={{
        impersonatedUserId,
        impersonatedUserProfile,
        isImpersonating,
        sessionId,
        startImpersonation,
        endImpersonation,
        logActivity,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error("useImpersonation must be used within ImpersonationProvider");
  }
  return context;
}
