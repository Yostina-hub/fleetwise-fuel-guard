import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

interface DateRange {
  start: Date;
  end: Date;
}

interface RevenueMetrics {
  totalRevenue: number;
  revenuePerVehicle: number;
  completedJobs: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

export const useRevenueMetrics = (dateRange?: DateRange) => {
  const { organizationId } = useOrganization();
  
  const currentStart = dateRange?.start || startOfMonth(new Date());
  const currentEnd = dateRange?.end || endOfMonth(new Date());
  
  // Previous period for comparison
  const prevStart = subMonths(currentStart, 1);
  const prevEnd = subMonths(currentEnd, 1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['revenue-metrics', organizationId, currentStart.toISOString(), currentEnd.toISOString()],
    queryFn: async () => {
      if (!organizationId) return null;

      // Get completed dispatch jobs for current period
      // Revenue could be calculated based on cargo weight, distance, or flat rate
      const { data: currentJobs, error: currentError } = await supabase
        .from('dispatch_jobs')
        .select('id, cargo_weight_kg, vehicle_id')
        .eq('organization_id', organizationId)
        .eq('status', 'delivered')
        .gte('completed_at', currentStart.toISOString())
        .lte('completed_at', currentEnd.toISOString());

      if (currentError) throw currentError;

      // Get previous period jobs for trend comparison
      const { data: prevJobs, error: prevError } = await supabase
        .from('dispatch_jobs')
        .select('id, cargo_weight_kg')
        .eq('organization_id', organizationId)
        .eq('status', 'delivered')
        .gte('completed_at', prevStart.toISOString())
        .lte('completed_at', prevEnd.toISOString());

      if (prevError) throw prevError;

      // Get vehicle count
      const { count: vehicleCount } = await supabase
        .from('vehicles')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      return {
        currentJobs: currentJobs || [],
        prevJobs: prevJobs || [],
        vehicleCount: vehicleCount || 1,
      };
    },
    enabled: !!organizationId,
  });

  // Calculate revenue metrics
  // Using a simple model: base rate per job + rate per kg of cargo
  const BASE_RATE_PER_JOB = 150; // Base rate per completed job
  const RATE_PER_KG = 0.5; // Additional rate per kg of cargo

  const calculateRevenue = (jobs: { cargo_weight_kg?: number | null }[]) => {
    return jobs.reduce((sum, job) => {
      const cargoRevenue = (job.cargo_weight_kg || 0) * RATE_PER_KG;
      return sum + BASE_RATE_PER_JOB + cargoRevenue;
    }, 0);
  };

  const currentRevenue = data ? calculateRevenue(data.currentJobs) : 0;
  const prevRevenue = data ? calculateRevenue(data.prevJobs) : 0;
  
  let trend: 'up' | 'down' | 'stable' = 'stable';
  let trendPercentage = 0;
  
  if (prevRevenue > 0) {
    const change = ((currentRevenue - prevRevenue) / prevRevenue) * 100;
    trendPercentage = Math.abs(change);
    if (change > 2) trend = 'up';
    else if (change < -2) trend = 'down';
  }

  const metrics: RevenueMetrics = {
    totalRevenue: currentRevenue,
    revenuePerVehicle: data?.vehicleCount ? currentRevenue / data.vehicleCount : 0,
    completedJobs: data?.currentJobs.length || 0,
    trend,
    trendPercentage,
  };

  return {
    metrics,
    loading: isLoading,
    error,
  };
};
