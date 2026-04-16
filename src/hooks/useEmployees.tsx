import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

export type EmployeeType = 'driver' | 'mechanic' | 'dispatcher' | 'office_staff' | 'manager' | 'technician' | 'coordinator' | 'other';

export interface Employee {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  employee_id?: string;
  employee_type: EmployeeType;
  department?: string;
  job_title?: string;
  hire_date?: string;
  status: string;
  avatar_url?: string;
  user_id?: string;
  driver_id?: string;
  notes?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  created_at: string;
  updated_at: string;
}

export const EMPLOYEE_TYPE_LABELS: Record<EmployeeType, string> = {
  driver: "Driver",
  mechanic: "Mechanic",
  dispatcher: "Dispatcher",
  office_staff: "Office Staff",
  manager: "Manager",
  technician: "Technician",
  coordinator: "Coordinator",
  other: "Other",
};

export const EMPLOYEE_TYPE_COLORS: Record<EmployeeType, string> = {
  driver: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  mechanic: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  dispatcher: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  office_staff: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  manager: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  technician: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  coordinator: "bg-pink-500/10 text-pink-400 border-pink-500/30",
  other: "bg-muted text-muted-foreground",
};

export const useEmployees = (typeFilter?: EmployeeType) => {
  const { organizationId } = useOrganization();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) {
      setEmployees([]);
      setLoading(false);
      return;
    }

    const fetchEmployees = async () => {
      try {
        setLoading(true);
        let query = supabase
          .from("employees")
          .select("*")
          .eq("organization_id", organizationId)
          .order("last_name", { ascending: true });

        if (typeFilter) {
          query = query.eq("employee_type", typeFilter);
        }

        const { data, error } = await query;
        if (error) throw error;
        setEmployees((data as Employee[]) || []);
      } catch (err: any) {
        console.error("Error fetching employees:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();

    let debounceTimer: ReturnType<typeof setTimeout>;
    const channel = supabase
      .channel(`employees-${organizationId.slice(0, 8)}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'employees',
        filter: `organization_id=eq.${organizationId}`
      }, () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(fetchEmployees, 500);
      })
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [organizationId, typeFilter]);

  return { employees, loading, error };
};
