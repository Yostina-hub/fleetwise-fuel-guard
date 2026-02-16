import { useRef, useCallback } from "react";

/**
 * Prevents rapid-fire form submissions (batch attacks).
 * Returns a guard function that returns true if submission is allowed.
 * Default cooldown: 2 seconds between submissions.
 */
export function useSubmitThrottle(cooldownMs = 2000) {
  const lastSubmitRef = useRef(0);

  const canSubmit = useCallback(() => {
    const now = Date.now();
    if (now - lastSubmitRef.current < cooldownMs) {
      return false;
    }
    lastSubmitRef.current = now;
    return true;
  }, [cooldownMs]);

  return canSubmit;
}
