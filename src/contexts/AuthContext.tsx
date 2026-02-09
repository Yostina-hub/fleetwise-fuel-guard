import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  organizationId: string | null;
  organizationLoading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationLoading, setOrganizationLoading] = useState(true);

  // Fetch organization when user changes - with retry logic
  useEffect(() => {
    if (!user) {
      setOrganizationId(null);
      setOrganizationLoading(false);
      return;
    }

    let isMounted = true;
    let retryTimer: NodeJS.Timeout;

    const fetchOrganization = async (attempt = 0) => {
      if (!isMounted) return;
      setOrganizationLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("organization_id")
          .eq("id", user.id)
          .single();

        if (error) throw error;
        if (isMounted) {
          setOrganizationId(data?.organization_id || null);
          setOrganizationLoading(false);
        }
      } catch (error) {
        console.error(`Error fetching organization (attempt ${attempt + 1}):`, error);
        if (isMounted) {
          if (attempt < 5) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 15000);
            console.log(`Retrying organization fetch in ${delay}ms...`);
            retryTimer = setTimeout(() => fetchOrganization(attempt + 1), delay);
          } else {
            setOrganizationId(null);
            setOrganizationLoading(false);
          }
        }
      }
    };

    fetchOrganization();

    return () => {
      isMounted = false;
      clearTimeout(retryTimer);
    };
  }, [user]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName
        }
      }
    });
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      organizationId,
      organizationLoading,
      signUp, 
      signIn, 
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};
