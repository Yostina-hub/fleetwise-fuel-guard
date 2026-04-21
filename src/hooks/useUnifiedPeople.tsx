import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

export type PersonSource = "user" | "driver" | "employee";

export interface UnifiedPerson {
  /** Stable composite id: `${source}:${recordId}` so a driver and their linked user don't collide. */
  key: string;
  /** Original record id (profile.id, driver.id, or employee.id). */
  recordId: string;
  source: PersonSource;
  /** Linked auth user id, when known. */
  userId: string | null;
  /** Linked driver record id, when known. */
  driverId: string | null;
  /** Linked employee record id, when known. */
  employeeId: string | null;

  fullName: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  organizationId: string | null;
  createdAt: string;

  /** RBAC roles assigned to the linked auth user, if any. */
  roles: string[];
  /** HR employee_type (from drivers/employees), if applicable. */
  employeeType: string | null;
  /** Department / job title (from employees) or 'Driver' for drivers. */
  jobTitle: string | null;
  /** HR record status (active/inactive) when present. */
  hrStatus: string | null;
  /** Auth account ban state. Undefined = not yet checked. */
  isBanned?: boolean;

  /** True when this row already has a login account. */
  hasLogin: boolean;
}

interface RawProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  middle_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  organization_id: string | null;
  employee_code: string | null;
  department: string | null;
  job_title: string | null;
  hire_date: string | null;
  status: string | null;
  employee_type: string | null;
  linked_employee_id: string | null;
  linked_driver_id: string | null;
}
interface RawDriver {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: string | null;
  organization_id: string;
  created_at: string;
}
interface RawEmployee {
  id: string;
  user_id: string | null;
  driver_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  employee_type: string;
  job_title: string | null;
  department: string | null;
  status: string;
  organization_id: string;
  created_at: string;
}

export const useUnifiedPeople = () => {
  const { organizationId, isViewingAllOrgs } = useOrganization();
  const [people, setPeople] = useState<UnifiedPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);

      const profilesQ = supabase
        .from("profiles")
        .select("id, email, full_name, first_name, last_name, middle_name, avatar_url, phone, created_at, organization_id, employee_code, department, job_title, hire_date, status, employee_type, linked_employee_id, linked_driver_id");
      const driversQ = supabase
        .from("drivers")
        .select("id, user_id, first_name, last_name, email, phone, avatar_url, status, organization_id, created_at");
      const employeesQ = supabase
        .from("employees")
        .select("id, user_id, driver_id, first_name, last_name, email, phone, avatar_url, employee_type, job_title, department, status, organization_id, created_at");
      const rolesQ = supabase.from("user_roles").select("user_id, role");

      // Scope by organization unless super-admin viewing all
      if (organizationId && !isViewingAllOrgs) {
        profilesQ.eq("organization_id", organizationId);
        driversQ.eq("organization_id", organizationId);
        employeesQ.eq("organization_id", organizationId);
      }

      const [profilesRes, driversRes, employeesRes, rolesRes] = await Promise.all([
        profilesQ,
        driversQ,
        employeesQ,
        rolesQ,
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (driversRes.error) throw driversRes.error;
      if (employeesRes.error) throw employeesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const profiles = (profilesRes.data || []) as RawProfile[];
      const drivers = (driversRes.data || []) as RawDriver[];
      const employees = (employeesRes.data || []) as RawEmployee[];
      const allRoles = (rolesRes.data || []) as Array<{ user_id: string; role: string }>;

      const rolesByUser = new Map<string, string[]>();
      allRoles.forEach((r) => {
        const arr = rolesByUser.get(r.user_id) ?? [];
        arr.push(r.role);
        rolesByUser.set(r.user_id, arr);
      });

      // Indexes for cross-linking
      const driverByUser = new Map<string, RawDriver>();
      drivers.forEach((d) => {
        if (d.user_id) driverByUser.set(d.user_id, d);
      });
      const employeeByUser = new Map<string, RawEmployee>();
      const employeeByDriver = new Map<string, RawEmployee>();
      employees.forEach((e) => {
        if (e.user_id) employeeByUser.set(e.user_id, e);
        if (e.driver_id) employeeByDriver.set(e.driver_id, e);
      });

      const merged: UnifiedPerson[] = [];

      // 1) System users (profiles) — always have a login
      profiles.forEach((p) => {
        // Prefer linked records, fall back to user_id reverse lookup
        const driver = (p.linked_driver_id ? drivers.find((d) => d.id === p.linked_driver_id) : null) ?? driverByUser.get(p.id) ?? null;
        const employee = (p.linked_employee_id ? employees.find((e) => e.id === p.linked_employee_id) : null) ?? employeeByUser.get(p.id) ?? null;
        const composedName =
          [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(" ").trim() ||
          p.full_name ||
          (employee ? `${employee.first_name} ${employee.last_name}` : "") ||
          (driver ? `${driver.first_name} ${driver.last_name}` : "") ||
          "Unnamed User";
        merged.push({
          key: `user:${p.id}`,
          recordId: p.id,
          source: "user",
          userId: p.id,
          driverId: driver?.id ?? p.linked_driver_id ?? null,
          employeeId: employee?.id ?? p.linked_employee_id ?? null,
          fullName: composedName,
          email: p.email,
          phone: p.phone || employee?.phone || driver?.phone || null,
          avatarUrl: p.avatar_url || employee?.avatar_url || driver?.avatar_url || null,
          organizationId: p.organization_id,
          createdAt: p.created_at,
          roles: rolesByUser.get(p.id) ?? [],
          employeeType: p.employee_type ?? employee?.employee_type ?? (driver ? "driver" : null),
          jobTitle: p.job_title ?? employee?.job_title ?? p.department ?? employee?.department ?? (driver ? "Driver" : null),
          hrStatus: p.status ?? employee?.status ?? driver?.status ?? null,
          hasLogin: true,
        });
      });

      // 2) Drivers WITHOUT a linked user
      drivers.forEach((d) => {
        if (d.user_id) return; // already represented via profile
        const employee = employeeByDriver.get(d.id) ?? null;
        merged.push({
          key: `driver:${d.id}`,
          recordId: d.id,
          source: "driver",
          userId: null,
          driverId: d.id,
          employeeId: employee?.id ?? null,
          fullName: `${d.first_name} ${d.last_name}`,
          email: d.email,
          phone: d.phone,
          avatarUrl: d.avatar_url,
          organizationId: d.organization_id,
          createdAt: d.created_at,
          roles: [],
          employeeType: "driver",
          jobTitle: employee?.job_title ?? "Driver",
          hrStatus: d.status,
          hasLogin: false,
        });
      });

      // 3) Employees WITHOUT a linked user (and not already surfaced via their driver record)
      employees.forEach((e) => {
        if (e.user_id) return;
        if (e.driver_id) return; // surfaced through the driver row above
        merged.push({
          key: `employee:${e.id}`,
          recordId: e.id,
          source: "employee",
          userId: null,
          driverId: null,
          employeeId: e.id,
          fullName: `${e.first_name} ${e.last_name}`,
          email: e.email,
          phone: e.phone,
          avatarUrl: e.avatar_url,
          organizationId: e.organization_id,
          createdAt: e.created_at,
          roles: [],
          employeeType: e.employee_type,
          jobTitle: e.job_title || e.department,
          hrStatus: e.status,
          hasLogin: false,
        });
      });

      // #3 — Newest registrations first so freshly-created users surface at the top
      // of the People & Access directory instead of being buried at the bottom.
      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setPeople(merged);
      setError(null);
    } catch (err: any) {
      console.error("useUnifiedPeople error:", err);
      setError(err.message ?? "Failed to load people");
    } finally {
      setLoading(false);
    }
  }, [organizationId, isViewingAllOrgs]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { people, loading, error, refresh: fetchAll };
};
