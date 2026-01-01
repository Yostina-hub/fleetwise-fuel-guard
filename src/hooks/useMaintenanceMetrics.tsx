import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { useMemo } from "react";

interface MaintenanceMetrics {
  complianceRate: number;
  overdueCount: number;
  upcomingCount: number;
  totalScheduled: number;
  completedThisMonth: number;
}

export const useMaintenanceMetrics = () => {
  const { organizationId } = useOrganization();

  // Fetch maintenance schedules
  const { data: schedules, isLoading: schedulesLoading } = useQuery({
    queryKey: ['maintenance-schedules-metrics', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('maintenance_schedules')
        .select('id, next_due_date, is_active')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch work orders to check completed maintenance
  const { data: workOrders, isLoading: workOrdersLoading } = useQuery({
    queryKey: ['work-orders-metrics', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('work_orders')
        .select('id, status, completed_date')
        .eq('organization_id', organizationId)
        .gte('created_at', startOfMonth.toISOString());

      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const metrics = useMemo<MaintenanceMetrics>(() => {
    if (!schedules) {
      return {
        complianceRate: 0,
        overdueCount: 0,
        upcomingCount: 0,
        totalScheduled: 0,
        completedThisMonth: 0,
      };
    }

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    let overdueCount = 0;
    let upcomingCount = 0;
    let onScheduleCount = 0;

    schedules.forEach(schedule => {
      if (!schedule.next_due_date) return;

      const dueDate = new Date(schedule.next_due_date);
      
      if (dueDate < now) {
        overdueCount++;
      } else if (dueDate <= sevenDaysFromNow) {
        upcomingCount++;
      } else {
        onScheduleCount++;
      }
    });

    const totalScheduled = schedules.length;
    const compliantCount = onScheduleCount + upcomingCount;
    const complianceRate = totalScheduled > 0 
      ? (compliantCount / totalScheduled) * 100 
      : 100;

    const completedThisMonth = workOrders?.filter(wo => wo.status === 'completed').length || 0;

    return {
      complianceRate,
      overdueCount,
      upcomingCount,
      totalScheduled,
      completedThisMonth,
    };
  }, [schedules, workOrders]);

  return {
    metrics,
    loading: schedulesLoading || workOrdersLoading,
  };
};
