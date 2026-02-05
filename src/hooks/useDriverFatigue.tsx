import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";

export interface HOSLog {
  id: string;
  organization_id: string;
  driver_id: string;
  vehicle_id: string | null;
  log_date: string;
  status: 'off_duty' | 'sleeper_berth' | 'driving' | 'on_duty_not_driving';
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  location_start: string | null;
  location_end: string | null;
  lat_start: number | null;
  lng_start: number | null;
  lat_end: number | null;
  lng_end: number | null;
  odometer_start: number | null;
  odometer_end: number | null;
  notes: string | null;
  is_violation: boolean;
  violation_type: string | null;
  created_at: string;
}

export interface FatigueIndicator {
  id: string;
  organization_id: string;
  driver_id: string;
  recorded_at: string;
  fatigue_risk_level: 'low' | 'moderate' | 'high' | 'critical';
  risk_score: number;
  driving_hours_24h: number | null;
  driving_hours_8_days: number | null;
  hours_since_rest: number | null;
  consecutive_driving_minutes: number | null;
  reaction_time_ms: number | null;
  eye_closure_events: number | null;
  lane_departure_events: number | null;
  yawning_detected: number | null;
  hard_braking_events: number | null;
  recommendations: string[];
  data_source: string;
  created_at: string;
}

export interface HOSSummary {
  drivingHours24h: number;
  drivingHours7Days: number;
  drivingHours8Days: number;
  restHours24h: number;
  consecutiveDrivingMinutes: number;
  hoursSinceLastBreak: number;
  violations: number;
  canDrive: boolean;
  remainingDriveTime: number;
  warnings: string[];
}

// Federal HOS Limits
const HOS_LIMITS = {
  driving_limit_hours: 11, // Max driving per day
  on_duty_limit_hours: 14, // Max on-duty window
  weekly_limit_hours_70: 70, // 70-hour/8-day rule
  weekly_limit_hours_60: 60, // 60-hour/7-day rule
  break_required_after_hours: 8, // 30-min break required after 8 hours
  rest_period_hours: 10, // Required off-duty rest period
  consecutive_driving_limit_hours: 8, // Max continuous driving before break
};

export const useDriverFatigue = (driverId?: string) => {
  const { organizationId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch HOS logs for a driver
  const { data: hosLogs = [], isLoading: hosLoading } = useQuery({
    queryKey: ["driver-hos-logs", driverId],
    queryFn: async () => {
      if (!driverId) return [];
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
      
      const { data, error } = await (supabase as any)
        .from("driver_hos_logs")
        .select("*")
        .eq("driver_id", driverId)
        .gte("log_date", eightDaysAgo.toISOString().split('T')[0])
        .order("start_time", { ascending: false });
      if (error) throw error;
      return data as HOSLog[];
    },
    enabled: !!driverId,
  });

  // Fetch fatigue indicators for a driver
  const { data: fatigueIndicators = [], isLoading: fatigueLoading } = useQuery({
    queryKey: ["driver-fatigue-indicators", driverId],
    queryFn: async () => {
      if (!driverId) return [];
      const { data, error } = await (supabase as any)
        .from("driver_fatigue_indicators")
        .select("*")
        .eq("driver_id", driverId)
        .order("recorded_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as FatigueIndicator[];
    },
    enabled: !!driverId,
  });

  // Fetch latest fatigue indicator
  const { data: latestFatigue } = useQuery({
    queryKey: ["driver-fatigue-latest", driverId],
    queryFn: async () => {
      if (!driverId) return null;
      const { data, error } = await (supabase as any)
        .from("driver_fatigue_indicators")
        .select("*")
        .eq("driver_id", driverId)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      return data as FatigueIndicator | null;
    },
    enabled: !!driverId,
  });

  // Fetch all drivers with fatigue status (for fleet overview)
  const { data: fleetFatigueStatus = [] } = useQuery({
    queryKey: ["fleet-fatigue-status", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("driver_fatigue_indicators")
        .select(`
          *,
          driver:driver_id (
            id,
            first_name,
            last_name,
            avatar_url,
            status
          )
        `)
        .order("recorded_at", { ascending: false });
      if (error) throw error;
      
      // Get unique drivers with their latest fatigue status
      const latestByDriver = new Map();
      data.forEach((indicator: any) => {
        if (!latestByDriver.has(indicator.driver_id)) {
          latestByDriver.set(indicator.driver_id, indicator);
        }
      });
      
      return Array.from(latestByDriver.values());
    },
    enabled: !!organizationId,
  });

  // Calculate HOS summary from logs
  const calculateHOSSummary = (logs: HOSLog[]): HOSSummary => {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);

    let drivingMinutes24h = 0;
    let restMinutes24h = 0;
    let drivingMinutes7Days = 0;
    let drivingMinutes8Days = 0;
    let consecutiveDrivingMinutes = 0;
    let lastBreakTime = now;
    let violations = 0;
    const warnings: string[] = [];

    logs.forEach(log => {
      const logStart = new Date(log.start_time);
      const logEnd = log.end_time ? new Date(log.end_time) : now;
      const duration = log.duration_minutes || Math.round((logEnd.getTime() - logStart.getTime()) / 60000);

      if (log.is_violation) violations++;

      // 24-hour calculations
      if (logStart >= twentyFourHoursAgo) {
        if (log.status === 'driving') {
          drivingMinutes24h += duration;
        } else if (log.status === 'off_duty' || log.status === 'sleeper_berth') {
          restMinutes24h += duration;
          if (duration >= 30) lastBreakTime = logEnd;
        }
      }

      // 7-day calculations
      if (logStart >= sevenDaysAgo && log.status === 'driving') {
        drivingMinutes7Days += duration;
      }

      // 8-day calculations
      if (logStart >= eightDaysAgo && log.status === 'driving') {
        drivingMinutes8Days += duration;
      }
    });

    // Calculate consecutive driving (simplified)
    const drivingLogs = logs.filter(l => l.status === 'driving').sort((a, b) => 
      new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    );
    
    if (drivingLogs.length > 0) {
      const latestDriving = drivingLogs[0];
      if (latestDriving.end_time === null || new Date(latestDriving.end_time) > new Date(now.getTime() - 30 * 60000)) {
        consecutiveDrivingMinutes = latestDriving.duration_minutes || 0;
      }
    }

    const hoursSinceLastBreak = (now.getTime() - lastBreakTime.getTime()) / (1000 * 60 * 60);

    // Generate warnings
    const drivingHours24h = drivingMinutes24h / 60;
    const drivingHours8Days = drivingMinutes8Days / 60;

    if (drivingHours24h >= HOS_LIMITS.driving_limit_hours - 1) {
      warnings.push("Approaching daily driving limit");
    }
    if (drivingHours8Days >= HOS_LIMITS.weekly_limit_hours_70 - 5) {
      warnings.push("Approaching 70-hour weekly limit");
    }
    if (hoursSinceLastBreak >= HOS_LIMITS.break_required_after_hours - 0.5) {
      warnings.push("30-minute break required soon");
    }
    if (consecutiveDrivingMinutes >= (HOS_LIMITS.consecutive_driving_limit_hours - 1) * 60) {
      warnings.push("Approaching consecutive driving limit");
    }

    const remainingDriveTime = Math.max(0, HOS_LIMITS.driving_limit_hours - drivingHours24h);
    const canDrive = drivingHours24h < HOS_LIMITS.driving_limit_hours && 
                     drivingHours8Days < HOS_LIMITS.weekly_limit_hours_70;

    return {
      drivingHours24h,
      drivingHours7Days: drivingMinutes7Days / 60,
      drivingHours8Days,
      restHours24h: restMinutes24h / 60,
      consecutiveDrivingMinutes,
      hoursSinceLastBreak,
      violations,
      canDrive,
      remainingDriveTime,
      warnings,
    };
  };

  // Log HOS entry
  const logHOS = useMutation({
    mutationFn: async (log: Omit<HOSLog, 'id' | 'organization_id' | 'created_at'>) => {
      if (!organizationId) throw new Error("No organization");
      
      const { error } = await (supabase as any)
        .from("driver_hos_logs")
        .insert({
          ...log,
          organization_id: organizationId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-hos-logs"] });
      toast({ title: "HOS entry logged" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to log HOS", description: error.message, variant: "destructive" });
    },
  });

  // Record fatigue indicator
  const recordFatigue = useMutation({
    mutationFn: async (indicator: Omit<FatigueIndicator, 'id' | 'organization_id' | 'created_at'>) => {
      if (!organizationId) throw new Error("No organization");
      
      const { error } = await (supabase as any)
        .from("driver_fatigue_indicators")
        .insert({
          ...indicator,
          organization_id: organizationId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-fatigue-indicators"] });
      queryClient.invalidateQueries({ queryKey: ["driver-fatigue-latest"] });
      queryClient.invalidateQueries({ queryKey: ["fleet-fatigue-status"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to record fatigue", description: error.message, variant: "destructive" });
    },
  });

  const hosSummary = calculateHOSSummary(hosLogs);

  return {
    hosLogs,
    fatigueIndicators,
    latestFatigue,
    fleetFatigueStatus,
    hosSummary,
    HOS_LIMITS,
    isLoading: hosLoading || fatigueLoading,
    logHOS,
    recordFatigue,
    calculateHOSSummary,
  };
};
