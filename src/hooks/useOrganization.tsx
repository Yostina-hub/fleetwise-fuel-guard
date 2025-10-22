import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useOrganization = () => {
  const { user } = useAuth();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setOrganizationId(null);
      setLoading(false);
      return;
    }

    const fetchOrganization = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("organization_id")
          .eq("id", user.id)
          .single();

        if (error) throw error;
        setOrganizationId(data?.organization_id || null);
      } catch (error) {
        console.error("Error fetching organization:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganization();
  }, [user]);

  return {
    organizationId,
    loading,
  };
};
