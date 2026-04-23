import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { trackSession, updateSessionActivity, endSession } from "@/lib/sessionTracker";
import { recordLoginEvent } from "@/hooks/useLoginHistory";

interface UserProfile {
  id: string;
  organization_id: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

interface UserRole {
  role: string;
  organization_id: string;
}



export function useAuthRaw() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const initialLoadDone = useRef(false);
  const sessionTrackedRef = useRef<string | null>(null);
  const retryTimeoutsRef = useRef<number[]>([]);
  const activeUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const clearRetryTimeouts = () => {
      retryTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      retryTimeoutsRef.current = [];
    };

    const fetchUserData = async (userId: string, attempt = 0) => {
      // Ignore stale retries from previous account sessions
      if (activeUserIdRef.current !== userId) return;

      let isRetrying = false;
      // Max retries for initial load is higher to survive sustained 503s
      const maxRetries = initialLoadDone.current ? 4 : 10;

      try {
        if (!initialLoadDone.current) {
          setLoading(true);
        }

        const [profileRes, rolesRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, organization_id, full_name, email, phone")
            .eq("id", userId)
            .single(),
          supabase
            .from("user_roles")
            .select("role, organization_id")
            .eq("user_id", userId),
        ]);

        if (!isMounted || activeUserIdRef.current !== userId) return;

        // Retry on transient server errors (503, 502, etc.)
        const hasTransientError =
          (profileRes.error && profileRes.error.message?.includes("upstream")) ||
          (rolesRes.error && rolesRes.error.message?.includes("upstream")) ||
          (profileRes.error && profileRes.error.message?.includes("503")) ||
          (rolesRes.error && rolesRes.error.message?.includes("503"));

        if (hasTransientError && attempt < maxRetries) {
          isRetrying = true;
          const delay = Math.min(1000 * Math.pow(2, attempt), 15000);
          console.log(`[Auth] Transient error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
          const timeoutId = window.setTimeout(() => {
            if (isMounted && activeUserIdRef.current === userId) {
              fetchUserData(userId, attempt + 1);
            }
          }, delay);
          retryTimeoutsRef.current.push(timeoutId);
          return;
        }

        if (profileRes.error) {
          console.error("Error fetching profile:", profileRes.error);
        }

        if (rolesRes.error) {
          console.error("Error fetching roles:", rolesRes.error);
        }

        const fetchedRoles = (rolesRes.data as UserRole[]) ?? [];
        setProfile(profileRes.data ?? null);
        setRoles(fetchedRoles);

        // If we got a user but roles are empty due to errors AND we haven't exhausted background retries,
        // schedule a background re-fetch to recover super admin UI
        if (fetchedRoles.length === 0 && rolesRes.error && initialLoadDone.current) {
          console.log("[Auth] Roles empty due to error, scheduling background re-fetch...");
          const timeoutId = window.setTimeout(() => {
            if (isMounted && activeUserIdRef.current === userId) {
              fetchUserData(userId, 0);
            }
          }, 5000);
          retryTimeoutsRef.current.push(timeoutId);
        }
      } catch (error) {
        if (!isMounted || activeUserIdRef.current !== userId) return;
        console.error("Error fetching user data:", error);

        // Retry on network errors
        if (attempt < maxRetries) {
          isRetrying = true;
          const delay = Math.min(1000 * Math.pow(2, attempt), 15000);
          console.log(`[Auth] Network error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
          const timeoutId = window.setTimeout(() => {
            if (isMounted && activeUserIdRef.current === userId) {
              fetchUserData(userId, attempt + 1);
            }
          }, delay);
          retryTimeoutsRef.current.push(timeoutId);
          return;
        }

        setProfile(null);
        setRoles([]);
      } finally {
        // Don't finalize loading if we're scheduling a retry
        if (!isRetrying && isMounted && activeUserIdRef.current === userId) {
          setLoading(false);
          initialLoadDone.current = true;
        }
      }
    };

    const handleSessionChange = async (nextSession: Session | null, event?: string) => {
      const nextUser = nextSession?.user ?? null;

      clearRetryTimeouts();
      activeUserIdRef.current = nextUser?.id ?? null;

      // Access control is enforced by RBAC (user_roles table).
      // Only users created via the admin create-user function will have roles assigned.

      setSession(nextSession);
      setUser(nextUser);

      if (nextUser && nextSession) {
        if (event === "SIGNED_IN" && sessionTrackedRef.current !== nextUser.id) {
          sessionTrackedRef.current = nextUser.id;
          trackSession(nextUser.id).catch(console.error);
        }

        fetchUserData(nextUser.id);
      } else {
        sessionTrackedRef.current = null;
        setProfile(null);
        setRoles([]);
        setLoading(false);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      handleSessionChange(nextSession, event);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) handleSessionChange(session);
    });

    return () => {
      isMounted = false;
      clearRetryTimeouts();
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      updateSessionActivity().catch(console.error);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  const signOut = async () => {
    // Close the active session row before clearing auth state.
    try { await endSession("logout"); } catch (e) { console.warn(e); }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    sessionTrackedRef.current = null;
  };

  const signIn = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    
    if (error) {
      // Record failed login
      recordLoginEvent({
        user_id: "",
        organization_id: "",
        status: "failed",
        failure_reason: error.message,
      }).catch(() => {});
      return { error };
    }

    // Record successful login
    if (data?.user) {
      const orgId = profile?.organization_id || "";
      recordLoginEvent({
        user_id: data.user.id,
        organization_id: orgId,
        status: "success",
      }).catch(() => {});
    }

    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    // GAP FIX: Block all signups - admin-only system, users are created via create-user edge function
    return {
      error: {
        message: "Self-registration is disabled. Contact your administrator.",
      } as any,
    };
  };

  const hasRole = (role: string, organizationId?: string) => {
    return roles.some(
      (r) =>
        r.role === role && (organizationId ? r.organization_id === organizationId : true)
    );
  };

  const isOrgAdmin = () => hasRole("org_admin") || hasRole("super_admin");
  const isOperator = () => hasRole("operator") || isOrgAdmin();

  return {
    user,
    session,
    profile,
    roles,
    loading,
    signOut,
    signIn,
    signUp,
    hasRole,
    isOrgAdmin,
    isOperator,
    organizationId: profile?.organization_id ?? null,
    organizationLoading: loading,
  };
}