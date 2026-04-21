import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to a Postgres `public.<table>` for INSERT/UPDATE/DELETE events
 * and automatically invalidate the given TanStack Query keys so the table
 * (and any related views) refetch instantly.
 *
 * Usage:
 *   useRealtimeTable("vehicle_requests", ["vehicle-requests", "vehicle-requests-panel"]);
 *
 * Notes:
 *   - The target table MUST be in the `supabase_realtime` publication.
 *   - Pass stable keys (string or string[]). They are joined for channel name uniqueness.
 *   - Re-subscribes when `enabled` toggles or the table name changes.
 */
export function useRealtimeTable(
  table: string,
  queryKeys: Array<string | readonly unknown[]>,
  options: { enabled?: boolean; event?: "*" | "INSERT" | "UPDATE" | "DELETE" } = {}
) {
  const { enabled = true, event = "*" } = options;
  const queryClient = useQueryClient();

  // Stringify the keys for stable channel naming + dependency tracking.
  const keysSig = JSON.stringify(queryKeys);

  useEffect(() => {
    if (!enabled || !table) return;

    const channelName = `rt:${table}:${keysSig}:${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes" as any,
        { event, schema: "public", table },
        () => {
          for (const key of queryKeys) {
            const queryKey = Array.isArray(key) ? key : [key];
            queryClient.invalidateQueries({ queryKey });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, keysSig, enabled, event]);
}

export default useRealtimeTable;
