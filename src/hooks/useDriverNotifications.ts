/**
 * useDriverNotifications — fetches & subscribes to a driver's notification inbox.
 *
 * Powers the LicenseRenewedBanner and the inbox bell on the Driver Portal.
 * Realtime is enabled on `driver_notifications`, so new rows arrive without polling.
 */
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DriverNotification {
  id: string;
  organization_id: string;
  driver_id: string;
  user_id: string | null;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  payload: Record<string, any>;
  workflow_instance_id: string | null;
  read_at: string | null;
  created_at: string;
}

export function useDriverNotifications(driverId?: string | null, opts?: { limit?: number }) {
  const qc = useQueryClient();
  const limit = opts?.limit ?? 25;

  const query = useQuery({
    queryKey: ["driver-notifications", driverId, limit],
    enabled: !!driverId,
    queryFn: async (): Promise<DriverNotification[]> => {
      const { data, error } = await (supabase as any)
        .from("driver_notifications")
        .select("*")
        .eq("driver_id", driverId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as DriverNotification[];
    },
  });

  useEffect(() => {
    if (!driverId) return;
    const channel = supabase
      .channel(`driver-notifications:${driverId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "driver_notifications",
          filter: `driver_id=eq.${driverId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["driver-notifications", driverId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId, qc]);

  return query;
}

export async function markDriverNotificationRead(id: string) {
  await (supabase as any)
    .from("driver_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
}

export async function markAllDriverNotificationsRead(driverId: string) {
  await (supabase as any)
    .from("driver_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("driver_id", driverId)
    .is("read_at", null);
}
