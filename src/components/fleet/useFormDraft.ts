/**
 * useFormDraft
 * ------------
 * Persists form state to sessionStorage so users don't lose work if they
 * accidentally close a dialog or navigate away. Drafts are scoped per-key
 * (e.g. one draft per dialog) and per-org when an organization id is provided.
 *
 * Why sessionStorage (not localStorage):
 *   - Drafts survive accidental dialog close + page refresh within the tab
 *   - But are wiped when the tab/window closes — avoids stale data leaking
 *     across users on shared machines.
 */
import { useCallback, useEffect, useRef } from "react";

const PREFIX = "form-draft:";

function storageKey(key: string, scope?: string | null) {
  return `${PREFIX}${scope ?? "global"}:${key}`;
}

export function loadDraft<T>(key: string, scope?: string | null): T | null {
  try {
    const raw = sessionStorage.getItem(storageKey(key, scope));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveDraft<T>(key: string, value: T, scope?: string | null) {
  try {
    sessionStorage.setItem(storageKey(key, scope), JSON.stringify(value));
  } catch {
    /* quota or serialization error — ignore */
  }
}

export function clearDraft(key: string, scope?: string | null) {
  try {
    sessionStorage.removeItem(storageKey(key, scope));
  } catch {
    /* ignore */
  }
}

interface Options {
  /** Storage scope (typically organization id) so drafts don't bleed across orgs */
  scope?: string | null;
  /** Debounce window in ms before writing to storage (default 400) */
  debounceMs?: number;
  /** When false, draft writes are paused (e.g. dialog closed) */
  enabled?: boolean;
}

/**
 * Persist `value` under `key` while `enabled` is true.
 * Returns helpers to clear the draft (e.g. on successful submit).
 */
export function useFormDraft<T>(
  key: string,
  value: T,
  { scope, debounceMs = 400, enabled = true }: Options = {},
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      saveDraft(key, value, scope);
    }, debounceMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [key, scope, value, enabled, debounceMs]);

  const clear = useCallback(() => clearDraft(key, scope), [key, scope]);
  const load = useCallback(() => loadDraft<T>(key, scope), [key, scope]);

  return { clear, load };
}
