import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

export interface CoachingQueueItem {
  id: string;
  organization_id: string;
  driver_id: string | null;
  vehicle_id: string | null;
  source_alert_id: string | null;
  source_type: string;
  severity: string;
  title: string;
  recommendation: string | null;
  reroute_suggestion: string | null;
  suggested_assignment_id: string | null;
  status: "open" | "coached" | "dismissed" | string;
  coached_by: string | null;
  coached_at: string | null;
  coaching_notes: string | null;
  dismissed_by: string | null;
  dismissed_at: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

interface UseCoachingOptions {
  vehicleId?: string;
  assignmentId?: string;
  status?: "open" | "coached" | "dismissed";
  limit?: number;
}

export const useDriverCoachingQueue = (opts: UseCoachingOptions = {}) => {
  const { organizationId } = useOrganization();
  const [items, setItems] = useState<CoachingQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ open: 0, coached: 0, dismissed: 0 });

  const refresh = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      let query = supabase
        .from("driver_coaching_queue")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(opts.limit ?? 100);

      if (opts.vehicleId) query = query.eq("vehicle_id", opts.vehicleId);
      if (opts.assignmentId) query = query.eq("suggested_assignment_id", opts.assignmentId);
      if (opts.status) query = query.eq("status", opts.status);

      const [{ data }, { data: countRows }] = await Promise.all([
        query,
        supabase
          .from("driver_coaching_queue")
          .select("status")
          .eq("organization_id", organizationId),
      ]);

      const c = { open: 0, coached: 0, dismissed: 0 };
      for (const r of countRows || []) {
        const s = (r.status as keyof typeof c) ?? "open";
        if (s in c) c[s]++;
      }
      setCounts(c);
      setItems((data as CoachingQueueItem[]) || []);
    } finally {
      setLoading(false);
    }
  }, [organizationId, opts.vehicleId, opts.assignmentId, opts.status, opts.limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!organizationId) return;
    const channel = supabase
      .channel(`dcq-${organizationId.slice(0, 8)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "driver_coaching_queue",
          filter: `organization_id=eq.${organizationId}`,
        },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, refresh]);

  const markCoached = async (id: string, notes?: string) => {
    const { data: u } = await supabase.auth.getUser();
    return supabase
      .from("driver_coaching_queue")
      .update({
        status: "coached",
        coached_by: u.user?.id ?? null,
        coached_at: new Date().toISOString(),
        coaching_notes: notes ?? null,
      })
      .eq("id", id);
  };

  const dismiss = async (id: string) => {
    const { data: u } = await supabase.auth.getUser();
    return supabase
      .from("driver_coaching_queue")
      .update({
        status: "dismissed",
        dismissed_by: u.user?.id ?? null,
        dismissed_at: new Date().toISOString(),
      })
      .eq("id", id);
  };

  const reopen = async (id: string) =>
    supabase
      .from("driver_coaching_queue")
      .update({
        status: "open",
        coached_at: null,
        coached_by: null,
        coaching_notes: null,
        dismissed_at: null,
        dismissed_by: null,
      })
      .eq("id", id);

  return { items, counts, loading, refresh, markCoached, dismiss, reopen };
};
