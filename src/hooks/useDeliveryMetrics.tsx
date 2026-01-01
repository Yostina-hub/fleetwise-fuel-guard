import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { useMemo } from "react";

interface DeliveryMetrics {
  onTimeRate: number;
  averageDelayMinutes: number;
  completedTrips: number;
  totalTrips: number;
  slaMet: number;
  slaNotMet: number;
}

interface DateRange {
  start: Date;
  end: Date;
}

export const useDeliveryMetrics = (dateRange?: DateRange) => {
  const { organizationId } = useOrganization();

  // Default to current month if no date range provided
  const effectiveDateRange = useMemo(() => {
    if (dateRange) return dateRange;
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: now,
    };
  }, [dateRange]);

  const { data: dispatchJobs, isLoading } = useQuery({
    queryKey: ['delivery-metrics', organizationId, effectiveDateRange.start.toISOString(), effectiveDateRange.end.toISOString()],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('dispatch_jobs')
        .select('id, status, sla_deadline_at, sla_met, actual_dropoff_at, scheduled_dropoff_at, completed_at')
        .eq('organization_id', organizationId)
        .gte('created_at', effectiveDateRange.start.toISOString())
        .lte('created_at', effectiveDateRange.end.toISOString());

      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const metrics = useMemo<DeliveryMetrics>(() => {
    if (!dispatchJobs || dispatchJobs.length === 0) {
      return {
        onTimeRate: 0,
        averageDelayMinutes: 0,
        completedTrips: 0,
        totalTrips: 0,
        slaMet: 0,
        slaNotMet: 0,
      };
    }

    const completedJobs = dispatchJobs.filter(job => job.status === 'completed');
    const totalTrips = dispatchJobs.length;
    const completedTrips = completedJobs.length;

    // Calculate SLA metrics
    const jobsWithSla = completedJobs.filter(job => job.sla_met !== null);
    const slaMet = jobsWithSla.filter(job => job.sla_met === true).length;
    const slaNotMet = jobsWithSla.filter(job => job.sla_met === false).length;

    // Calculate on-time rate based on sla_met field
    const onTimeRate = jobsWithSla.length > 0 
      ? (slaMet / jobsWithSla.length) * 100 
      : completedTrips > 0 ? 95 : 0; // Fallback if no SLA data

    // Calculate average delay for late deliveries
    let totalDelayMinutes = 0;
    let lateCount = 0;

    completedJobs.forEach(job => {
      if (job.scheduled_dropoff_at && job.actual_dropoff_at) {
        const scheduled = new Date(job.scheduled_dropoff_at).getTime();
        const actual = new Date(job.actual_dropoff_at).getTime();
        const delayMs = actual - scheduled;
        
        if (delayMs > 0) {
          totalDelayMinutes += delayMs / (1000 * 60);
          lateCount++;
        }
      }
    });

    const averageDelayMinutes = lateCount > 0 ? Math.round(totalDelayMinutes / lateCount) : 0;

    return {
      onTimeRate,
      averageDelayMinutes,
      completedTrips,
      totalTrips,
      slaMet,
      slaNotMet,
    };
  }, [dispatchJobs]);

  return {
    metrics,
    loading: isLoading,
  };
};
