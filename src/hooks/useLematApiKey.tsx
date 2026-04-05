import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "lemat_api_key";

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
        const { data, error } = await supabase.functions.invoke("get-lemat-token", {
          method: "GET",
        });

        if (error) {
          console.error("Failed to fetch Lemat API key:", error);
          return;
        }

        if (data?.token && !cancelled) {
          sessionStorage.setItem(SESSION_KEY, data.token);
          setReady(true);
        }
      } catch (e) {
        console.error("Failed to fetch Lemat API key:", e);
      }
    };

    fetchKey();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    apiKey: typeof window !== "undefined" ? sessionStorage.getItem(SESSION_KEY) || "" : "",
    ready,
  };
};
