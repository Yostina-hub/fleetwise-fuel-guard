import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "lemat_api_key";

/**
 * Fetches the Lemat API key from the backend edge function
 * and caches it in sessionStorage for the current session.
 */
export const useLematApiKey = () => {
  const [ready, setReady] = useState(() => !!sessionStorage.getItem(SESSION_KEY));

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) {
      setReady(true);
      return;
    }

    let cancelled = false;

    const fetchKey = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-lemat-token`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
          }
        );

        if (!res.ok) return;
        const json = await res.json();
        if (json.token && !cancelled) {
          sessionStorage.setItem(SESSION_KEY, json.token);
          setReady(true);
        }
      } catch (e) {
        console.error("Failed to fetch Lemat API key:", e);
      }
    };

    fetchKey();
    return () => { cancelled = true; };
  }, []);

  return ready;
};
