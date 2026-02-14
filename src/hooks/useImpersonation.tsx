import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";
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
  const { user, hasRole } = useAuth();
  const location = useLocation();
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(null);
  const [impersonatedUserProfile, setImpersonatedUserProfile] = useState<any | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const isSuperAdmin = hasRole("super_admin");
  const isImpersonating = isSuperAdmin && impersonatedUserId !== null;

  useEffect(() => {
    if (isImpersonating && sessionId) {
      logActivity('navigation', 'navigate', {
        from: document.referrer,
        to: location.pathname + location.search,
      });
    }
  }, [location.pathname, location.search, isImpersonating, sessionId]);

  useEffect(() => {
    if (!impersonatedUserId) {
      setImpersonatedUserProfile(null);
      return;
    }

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, organization_id, created_at")
        .eq("id", impersonatedUserId)
        .single();

      if (error) {
        console.error("Error fetching impersonated user profile:", error);
        return;
      }

      setImpersonatedUserProfile(data);
    };

    fetchProfile();
  }, [impersonatedUserId]);

  const logActivity = async (
    activityType: string,
    action: string,
    details: any = {},
    resourceType?: string,
    resourceId?: string
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
  };

  const startImpersonation = async (userId: string) => {
    if (!isSuperAdmin) {
      toast.error("Only super admins can impersonate users");
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

      toast.success("Impersonation started - All actions are being recorded");
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
