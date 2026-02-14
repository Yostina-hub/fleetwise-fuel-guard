import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { trackSession, updateSessionActivity } from "@/lib/sessionTracker";

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

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const sessionTrackedRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchUserData = async (userId: string) => {
      try {
        setLoading(true);

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

        if (!isMounted) return;

        if (profileRes.error) {
          console.error("Error fetching profile:", profileRes.error);
        }

        if (rolesRes.error) {
          console.error("Error fetching roles:", rolesRes.error);
        }

        setProfile(profileRes.data ?? null);
        setRoles((rolesRes.data as UserRole[]) ?? []);
      } catch (error) {
        if (!isMounted) return;
        console.error("Error fetching user data:", error);
        setProfile(null);
        setRoles([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const handleSessionChange = async (nextSession: Session | null, event?: string) => {
      const nextUser = nextSession?.user ?? null;

      setSession(nextSession);
      setUser(nextUser);

      if (nextUser && nextSession) {
        if (event === 'SIGNED_IN' && sessionTrackedRef.current !== nextUser.id) {
          sessionTrackedRef.current = nextUser.id;
          trackSession(nextUser.id).catch(console.error);
        }

        setTimeout(() => {
          if (isMounted) {
            fetchUserData(nextUser.id);
          }
        }, 0);
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
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName },
      },
    });
    return { error };
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
