import { useEffect, useRef, useState, useCallback } from "react";

/**
 * useFormDraft
 * ------------
 * Persists in-progress form values to localStorage so the user can resume
 * exactly where they left off when they re-open the same task / workflow
 * instance / SOP intake.
 *
 * - Keyed by a stable string (e.g. `task:<id>` or `wf:<instance>:<action>`).
 *   When `key` is falsy, the hook is a no-op pass-through.
 * - Debounces writes (default 400ms) to avoid storage thrash.
 * - `restoredAt` is set the first time we hydrate a saved value, so the UI
 *   can show a "Draft restored" badge.
 * - `clear()` removes the persisted entry (call after successful submit).
 *
 * Storage format (per key):
 *   { values: Record<string, any>, savedAt: ISO8601 }
 */

const PREFIX = "lov-form-draft:";
const DEBOUNCE_MS = 400;

interface DraftRecord {
  values: Record<string, any>;
  savedAt: string;
}

function readDraft(key: string): DraftRecord | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.values) return parsed as DraftRecord;
  } catch {
    /* ignore */
  }
  return null;
}

function writeDraft(key: string, values: Record<string, any>) {
  try {
    const rec: DraftRecord = { values, savedAt: new Date().toISOString() };
    localStorage.setItem(PREFIX + key, JSON.stringify(rec));
  } catch {
    /* storage full or unavailable */
  }
}

function removeDraft(key: string) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

export interface UseFormDraftResult<T extends Record<string, any>> {
  /** Current values (initial = restored draft || initialValues). */
  values: T;
  /** Replace all values (e.g. when switching context). */
  setValues: React.Dispatch<React.SetStateAction<T>>;
  /** Update a single field. */
  setField: (key: string, value: any) => void;
  /** ISO timestamp of the restored draft, or null if nothing was restored. */
  restoredAt: string | null;
  /** ISO timestamp of the most recent save. */
  savedAt: string | null;
  /** Manually clear the persisted draft (call after successful submit). */
  clear: () => void;
}

export function useFormDraft<T extends Record<string, any>>(
  key: string | null | undefined,
  initialValues: T,
): UseFormDraftResult<T> {
  // Lazily hydrate from storage so the first render already shows the draft.
  const [values, setValues] = useState<T>(() => {
    if (!key) return initialValues;
    const draft = readDraft(key);
    return (draft?.values as T) ?? initialValues;
  });
  const [restoredAt, setRestoredAt] = useState<string | null>(() => {
    if (!key) return null;
    return readDraft(key)?.savedAt ?? null;
  });
  const [savedAt, setSavedAt] = useState<string | null>(restoredAt);

  // Re-hydrate when the key changes (e.g. user picks a different task).
  const lastKeyRef = useRef<string | null | undefined>(key);
  useEffect(() => {
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;
    if (!key) {
      setValues(initialValues);
      setRestoredAt(null);
      setSavedAt(null);
      return;
    }
    const draft = readDraft(key);
    if (draft) {
      setValues(draft.values as T);
      setRestoredAt(draft.savedAt);
      setSavedAt(draft.savedAt);
    } else {
      setValues(initialValues);
      setRestoredAt(null);
      setSavedAt(null);
    }
    // initialValues intentionally excluded — caller controls reset via key change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Debounced persistence.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!key) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      // Don't persist completely empty drafts.
      const hasContent = Object.values(values).some(
        (v) => v !== "" && v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0),
      );
      if (!hasContent) return;
      writeDraft(key, values);
      setSavedAt(new Date().toISOString());
    }, DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [key, values]);

  const setField = useCallback((field: string, value: any) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const clear = useCallback(() => {
    if (key) removeDraft(key);
    setRestoredAt(null);
    setSavedAt(null);
  }, [key]);

  return { values, setValues, setField, restoredAt, savedAt, clear };
}

/** Imperative helper — clear a draft from outside a component. */
export function clearFormDraft(key: string) {
  removeDraft(key);
}
