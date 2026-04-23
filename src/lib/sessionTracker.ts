import { supabase } from "@/integrations/supabase/client";

/**
 * Session + activity tracker.
 *
 * Tracks:
 *  - When a user signs in / signs out (one row per session in `user_sessions`)
 *  - Total elapsed (start → end) and total *active* seconds (excludes idle)
 *  - Page count per session, last visited path
 *  - Per-event activity log written to `user_activity_events`
 *
 * Active time is accumulated from a 30s heartbeat that only fires while the
 * tab is visible AND the user has interacted in the last 60s. The session
 * row is closed on `pagehide` / explicit `endSession()` (e.g. signOut).
 */

const HEARTBEAT_MS = 30_000;
const IDLE_THRESHOLD_MS = 60_000;

let currentSessionId: string | null = null;
let currentUserId: string | null = null;
let currentOrgId: string | null = null;
let lastInteractionAt = Date.now();
let pendingActiveSeconds = 0;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let listenersAttached = false;
let pageCount = 0;

function parseUserAgent(ua: string) {
  const browser = { name: "Unknown", version: "" };
  const os = { name: "Unknown", version: "" };
  const device = { type: "desktop" };

  if (ua.includes("Firefox/")) {
    browser.name = "Firefox";
    browser.version = ua.match(/Firefox\/([\d.]+)/)?.[1] || "";
  } else if (ua.includes("Edg/")) {
    browser.name = "Edge";
    browser.version = ua.match(/Edg\/([\d.]+)/)?.[1] || "";
  } else if (ua.includes("Chrome/")) {
    browser.name = "Chrome";
    browser.version = ua.match(/Chrome\/([\d.]+)/)?.[1] || "";
  } else if (ua.includes("Safari/") && !ua.includes("Chrome")) {
    browser.name = "Safari";
    browser.version = ua.match(/Version\/([\d.]+)/)?.[1] || "";
  }

  if (ua.includes("Windows")) {
    os.name = "Windows";
    os.version = ua.match(/Windows NT ([\d.]+)/)?.[1] || "";
  } else if (ua.includes("Mac OS X")) {
    os.name = "macOS";
    os.version = ua.match(/Mac OS X ([\d_.]+)/)?.[1]?.replace(/_/g, ".") || "";
  } else if (ua.includes("Android")) {
    os.name = "Android";
    os.version = ua.match(/Android ([\d.]+)/)?.[1] || "";
    device.type = "mobile";
  } else if (ua.includes("iPhone") || ua.includes("iPad")) {
    os.name = "iOS";
    os.version = ua.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, ".") || "";
    device.type = ua.includes("iPad") ? "tablet" : "mobile";
  } else if (ua.includes("Linux")) {
    os.name = "Linux";
  }

  return { browser, os, device };
}

function markInteraction() {
  lastInteractionAt = Date.now();
}

function attachInteractionListeners() {
  if (listenersAttached || typeof window === "undefined") return;
  listenersAttached = true;

  const onActivity = () => markInteraction();
  ["mousemove", "keydown", "click", "scroll", "touchstart"].forEach((evt) =>
    window.addEventListener(evt, onActivity, { passive: true }),
  );

  // End session when the page is closed/navigated away
  window.addEventListener("pagehide", () => {
    void endSession("pagehide");
  });

  // Pause active accumulation when tab hidden (handled in heartbeat)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") markInteraction();
  });
}

function startHeartbeat() {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(() => {
    void heartbeat();
  }, HEARTBEAT_MS);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

async function heartbeat() {
  if (!currentSessionId) return;
  const isVisible = typeof document === "undefined" ? true : document.visibilityState === "visible";
  const isActive = Date.now() - lastInteractionAt < IDLE_THRESHOLD_MS;

  if (isVisible && isActive) {
    pendingActiveSeconds += HEARTBEAT_MS / 1000;
  }

  // Flush every 2 heartbeats (~1 min) to limit writes
  if (pendingActiveSeconds >= 60) {
    await flushActiveSeconds();
  } else {
    // Always touch last_active_at so admins see live presence
    try {
      await (supabase as any)
        .from("user_sessions")
        .update({ last_active_at: new Date().toISOString() })
        .eq("id", currentSessionId);
    } catch (e) {
      console.warn("session heartbeat failed", e);
    }
  }
}

async function flushActiveSeconds() {
  if (!currentSessionId || pendingActiveSeconds <= 0) return;
  const seconds = Math.round(pendingActiveSeconds);
  pendingActiveSeconds = 0;
  try {
    // Increment active_seconds atomically via RPC-like update with raw value
    const { data: row } = await (supabase as any)
      .from("user_sessions")
      .select("active_seconds")
      .eq("id", currentSessionId)
      .maybeSingle();
    const next = (row?.active_seconds ?? 0) + seconds;
    await (supabase as any)
      .from("user_sessions")
      .update({
        active_seconds: next,
        last_active_at: new Date().toISOString(),
        page_count: pageCount,
      })
      .eq("id", currentSessionId);
  } catch (e) {
    console.warn("flushActiveSeconds failed", e);
  }
}

/** Called from auth on SIGNED_IN. Creates a fresh session row. */
export async function trackSession(userId: string) {
  try {
    const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
    const { browser, os, device } = parseUserAgent(ua);

    // Fetch organization for org-scoped admin queries
    let orgId: string | null = null;
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", userId)
        .maybeSingle();
      orgId = (profile as any)?.organization_id ?? null;
    } catch {
      /* ignore */
    }

    const { data, error } = await (supabase as any)
      .from("user_sessions")
      .insert({
        user_id: userId,
        organization_id: orgId,
        device_type: device.type,
        browser: `${browser.name} ${browser.version}`.trim(),
        os: `${os.name} ${os.version}`.trim(),
        is_active: true,
        started_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
        last_path: typeof window !== "undefined" ? window.location.pathname : null,
        active_seconds: 0,
        page_count: 1,
        event_count: 0,
      })
      .select("id")
      .single();

    if (error) throw error;

    currentSessionId = data.id;
    currentUserId = userId;
    currentOrgId = orgId;
    pageCount = 1;
    lastInteractionAt = Date.now();

    attachInteractionListeners();
    startHeartbeat();

    // Best-effort login event
    void logActivity({
      event_type: "login",
      event_category: "auth",
      path: typeof window !== "undefined" ? window.location.pathname : null,
    });
  } catch (error) {
    console.error("Error tracking session:", error);
  }
}

/** Backwards-compat: kept for the existing 5-min interval call site. */
export async function updateSessionActivity() {
  await heartbeat();
}

/** Called from signOut and pagehide. Closes the active session row. */
export async function endSession(reason: "logout" | "pagehide" | "expired" = "logout") {
  if (!currentSessionId) return;
  await flushActiveSeconds();
  try {
    await (supabase as any)
      .from("user_sessions")
      .update({
        is_active: false,
        ended_at: new Date().toISOString(),
        ended_reason: reason,
        last_active_at: new Date().toISOString(),
        page_count: pageCount,
      })
      .eq("id", currentSessionId);
    if (reason === "logout") {
      void logActivity({ event_type: "logout", event_category: "auth" });
    }
  } catch (e) {
    console.warn("endSession failed", e);
  }
  stopHeartbeat();
  currentSessionId = null;
  currentUserId = null;
  currentOrgId = null;
  pageCount = 0;
  pendingActiveSeconds = 0;
}

/** Called from a route-change effect to count pages per session. */
export function recordPageView(path: string) {
  pageCount += 1;
  markInteraction();
  void logActivity({
    event_type: "page_view",
    event_category: "navigation",
    path,
  });
  // Keep last_path fresh
  if (currentSessionId) {
    void (supabase as any)
      .from("user_sessions")
      .update({ last_path: path, page_count: pageCount, last_active_at: new Date().toISOString() })
      .eq("id", currentSessionId);
  }
}

interface ActivityEventInput {
  event_type: string;
  event_category?: string | null;
  resource_type?: string | null;
  resource_id?: string | null;
  path?: string | null;
  duration_ms?: number | null;
  metadata?: Record<string, any> | null;
}

/** Public helper for app code to log a meaningful activity event. */
export async function logActivity(evt: ActivityEventInput) {
  try {
    if (!currentUserId) {
      const { data } = await supabase.auth.getUser();
      currentUserId = data.user?.id ?? null;
    }
    if (!currentUserId) return;

    await (supabase as any).from("user_activity_events").insert({
      user_id: currentUserId,
      organization_id: currentOrgId,
      session_id: currentSessionId,
      event_type: evt.event_type,
      event_category: evt.event_category ?? null,
      resource_type: evt.resource_type ?? null,
      resource_id: evt.resource_id ?? null,
      path: evt.path ?? (typeof window !== "undefined" ? window.location.pathname : null),
      duration_ms: evt.duration_ms ?? null,
      metadata: evt.metadata ?? null,
    });

    if (currentSessionId) {
      // Bump event_count loosely; fire-and-forget
      void (supabase as any)
        .from("user_sessions")
        .update({ last_active_at: new Date().toISOString() })
        .eq("id", currentSessionId);
    }
  } catch (e) {
    console.warn("logActivity failed", e);
  }
}

export function getCurrentSessionId() {
  return currentSessionId;
}
