/**
 * Client-side submission guard to prevent batch/rapid-fire form submissions.
 * Defense-in-depth: complements server-side rate limiting and DB triggers.
 */

const submissionTimestamps = new Map<string, number>();
const DEFAULT_COOLDOWN_MS = 5000; // 5 seconds between identical submissions

/**
 * Check if a submission should be allowed based on a cooldown period.
 * Returns true if the submission is allowed, false if it should be blocked.
 */
export function canSubmit(
  category: string,
  cooldownMs: number = DEFAULT_COOLDOWN_MS
): boolean {
  const now = Date.now();
  const lastSubmit = submissionTimestamps.get(category);
  
  if (lastSubmit && now - lastSubmit < cooldownMs) {
    return false;
  }
  
  submissionTimestamps.set(category, now);
  
  // Cleanup old entries periodically
  if (submissionTimestamps.size > 100) {
    for (const [key, ts] of submissionTimestamps) {
      if (now - ts > 300000) submissionTimestamps.delete(key);
    }
  }
  
  return true;
}

/**
 * Create a keyed submission guard for a specific resource type.
 * Returns a function that checks if a submission with the given payload fingerprint is allowed.
 */
export function createSubmissionGuard(resourceType: string, cooldownMs: number = DEFAULT_COOLDOWN_MS) {
  return (payloadFingerprint?: string): boolean => {
    const key = payloadFingerprint 
      ? `${resourceType}:${payloadFingerprint}` 
      : resourceType;
    return canSubmit(key, cooldownMs);
  };
}

/**
 * Generate a simple fingerprint from an object for dedup checks.
 */
export function fingerprint(obj: Record<string, unknown>): string {
  return JSON.stringify(obj, Object.keys(obj).sort());
}
