import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

interface DateRange {
  start: Date;
  end: Date;
}

export const useRestrictedHoursViolations = (dateRange?: DateRange) => {
  const { organizationId } = useOrganization();

  const { data: violations = [], isLoading } = useQuery({
    queryKey: ["restricted-hours-violations", organizationId, dateRange?.start, dateRange?.end],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from("restricted_hours_violations")
        .select(`
          *,
          vehicle:vehicles(plate_number, make, model),
          driver:drivers(first_name, last_name)
        `)
        .eq("organization_id", organizationId)
        .order("violation_time", { ascending: false });

      if (dateRange) {
        query = query
          .gte("violation_time", dateRange.start.toISOString())
          .lte("violation_time", dateRange.end.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  return {
    violations,
    loading: isLoading,
  };
};
