import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Listens for two kinds of "registry changed" signals so list hooks that don't
 * use TanStack Query state directly (e.g. the paginated hooks built on plain
 * useState) can still refresh instantly after a create/update/delete:
 *
 *   1. TanStack Query cache invalidations on a matching root key
 *      (e.g. queryClient.invalidateQueries({ queryKey: ["drivers"] }))
 *   2. A custom window event "registry:refresh" with detail.key === <key>
 *      (fired manually from places that don't go through TanStack Query)
 *
 * The callback is debounced lightly (60ms) to coalesce bursts of invalidations.
 */
export function useRegistryRefresh(key: string, refetch: () => void | Promise<void>) {
  const queryClient = useQueryClient();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const trigger = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          refetch();
        } catch (err) {
          console.error(`[useRegistryRefresh:${key}] refetch failed`, err);
        }
      }, 60);
    };

    // 1. Subscribe to TanStack Query cache events that match this key.
    const cache = queryClient.getQueryCache();
    const unsub = cache.subscribe((event) => {
      // Fire on invalidation OR on a query being added/removed that matches.
      const queryKey = (event as any)?.query?.queryKey;
      if (!Array.isArray(queryKey) || queryKey[0] !== key) return;
      const type = (event as any)?.type;
      // "updated" covers status transitions including invalidate -> stale.
      if (type === "updated" || type === "added" || type === "removed") {
        const state = (event as any)?.query?.state;
        if (state?.isInvalidated || type === "added" || type === "removed") {
          trigger();
        }
      }
    });

    // 2. Subscribe to window-level custom events.
    const onWindowEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ key?: string }>).detail;
      if (!detail || detail.key === key || detail.key === "*") trigger();
    };
    window.addEventListener("registry:refresh", onWindowEvent);

    return () => {
      if (timer) clearTimeout(timer);
      unsub();
      window.removeEventListener("registry:refresh", onWindowEvent);
    };
  }, [key, queryClient, refetch]);
}

/**
 * Manually broadcast a registry change (use when not going through TanStack
 * Query, or when you want to refresh hooks across many tables at once).
 */
export function broadcastRegistryRefresh(key: string | "*" = "*") {
  window.dispatchEvent(new CustomEvent("registry:refresh", { detail: { key } }));
}
