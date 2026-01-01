import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { toast } from "@/hooks/use-toast";

export interface MaintenanceSchedule {
  id: string;
  organization_id: string;
  vehicle_id: string;
  service_type: string;
  interval_type: 'mileage' | 'hours' | 'calendar';
  interval_value: number;
  last_service_date?: string;
  last_service_odometer?: number;
  last_service_hours?: number;
  next_due_date?: string;
  next_due_odometer?: number;
  next_due_hours?: number;
  reminder_days_before?: number;
  reminder_km_before?: number;
  priority: 'low' | 'medium' | 'high';
  checklist_template_id?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface VehicleInspection {
  id: string;
  organization_id: string;
  vehicle_id: string;
  driver_id?: string;
  inspection_type: string;
  inspection_date: string;
  odometer_km?: number;
  checklist_data?: Record<string, any>;
  overall_condition?: string;
  defects_found?: Record<string, any>;
  mechanic_notes?: string;
  inspector_signature_url?: string;
  mechanic_signature_url?: string;
  certified_safe?: boolean;
  repaired_at?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export const useMaintenanceSchedules = (vehicleId?: string) => {
  const { organizationId } = useOrganization();
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [inspections, setInspections] = useState<VehicleInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedules = async () => {
    if (!organizationId) {
      setSchedules([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase
        .from("maintenance_schedules")
        .select("*")
        .eq("organization_id", organizationId);

      if (vehicleId) {
        query = query.eq("vehicle_id", vehicleId);
      }

      const { data, error } = await query.order("next_due_date", { ascending: true });

      if (error) throw error;
      setSchedules((data as MaintenanceSchedule[]) || []);
    } catch (err: any) {
      console.error("Error fetching maintenance schedules:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchInspections = async () => {
    if (!organizationId) return;

    try {
      let query = supabase
        .from("vehicle_inspections")
        .select("*")
        .eq("organization_id", organizationId);

      if (vehicleId) {
        query = query.eq("vehicle_id", vehicleId);
      }

      const { data, error } = await query
        .order("inspection_date", { ascending: false })
        .limit(50);

      if (error) throw error;
      setInspections((data as VehicleInspection[]) || []);
    } catch (err: any) {
      console.error("Error fetching inspections:", err);
    }
  };

  useEffect(() => {
    fetchSchedules();
    fetchInspections();
  }, [organizationId, vehicleId]);

  const createSchedule = async (schedule: Omit<MaintenanceSchedule, 'id' | 'organization_id' | 'created_at' | 'updated_at'>) => {
    if (!organizationId) return null;

    try {
      const { data, error } = await supabase
        .from("maintenance_schedules")
        .insert({
          ...schedule,
          organization_id: organizationId,
        })
        .select()
        .single();

      if (error) throw error;
      toast({ title: "Schedule created", description: "Maintenance schedule added" });
      fetchSchedules();
      return data;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      return null;
    }
  };

  const updateSchedule = async (id: string, updates: Partial<MaintenanceSchedule>) => {
    try {
      const { error } = await supabase
        .from("maintenance_schedules")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Schedule updated", description: "Maintenance schedule updated" });
      fetchSchedules();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const recordService = async (scheduleId: string, serviceDate: string, odometer?: number, hours?: number) => {
    try {
      const schedule = schedules.find(s => s.id === scheduleId);
      if (!schedule) throw new Error("Schedule not found");

      // Calculate next due based on interval type
      let nextDueDate: string | undefined;
      let nextDueOdometer: number | undefined;
      let nextDueHours: number | undefined;

      if (schedule.interval_type === 'calendar') {
        const date = new Date(serviceDate);
        date.setDate(date.getDate() + schedule.interval_value);
        nextDueDate = date.toISOString();
      } else if (schedule.interval_type === 'mileage' && odometer) {
        nextDueOdometer = odometer + schedule.interval_value;
      } else if (schedule.interval_type === 'hours' && hours) {
        nextDueHours = hours + schedule.interval_value;
      }

      const { error } = await supabase
        .from("maintenance_schedules")
        .update({
          last_service_date: serviceDate,
          last_service_odometer: odometer,
          last_service_hours: hours,
          next_due_date: nextDueDate,
          next_due_odometer: nextDueOdometer,
          next_due_hours: nextDueHours,
        })
        .eq("id", scheduleId);

      if (error) throw error;
      toast({ title: "Service recorded", description: "Maintenance service logged" });
      fetchSchedules();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const createInspection = async (inspection: Omit<VehicleInspection, 'id' | 'organization_id' | 'created_at'>) => {
    if (!organizationId) return null;

    try {
      const { data, error } = await supabase
        .from("vehicle_inspections")
        .insert({
          ...inspection,
          organization_id: organizationId,
        })
        .select()
        .single();

      if (error) throw error;
      toast({ title: "Inspection recorded", description: "Vehicle inspection saved" });
      fetchInspections();
      return data;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      return null;
    }
  };

  return {
    schedules,
    inspections,
    loading,
    error,
    createSchedule,
    updateSchedule,
    recordService,
    createInspection,
    refetch: fetchSchedules,
  };
};
