import { supabase } from "@/integrations/supabase/client";

interface LoginHistoryEntry {
  user_id: string;
  organization_id: string;
  status: "success" | "failed" | "blocked" | "mfa_required";
  failure_reason?: string;
  device_type?: string;
  user_agent?: string;
}

function detectDeviceType(ua: string): string {
  if (/mobile|android|iphone|ipad/i.test(ua)) return "mobile";
  if (/tablet/i.test(ua)) return "tablet";
  return "desktop";
}

export async function recordLoginEvent(entry: LoginHistoryEntry) {
  try {
    const userAgent = navigator.userAgent;
    const deviceType = entry.device_type || detectDeviceType(userAgent);

    await supabase.from("login_history").insert({
      user_id: entry.user_id || null,
      organization_id: entry.organization_id || null,
      status: entry.status,
      failure_reason: entry.failure_reason || null,
      device_type: deviceType,
      user_agent: userAgent,
      login_time: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Failed to record login event:", e);
  }
}
