import { UAParser } from "ua-parser-js";
import { supabase } from "@/integrations/supabase/client";

export async function trackSession(userId: string) {
  try {
    const parser = new UAParser();
    const result = parser.getResult();

    const sessionData = {
      user_id: userId,
      device_type: result.device.type || "desktop",
      browser: `${result.browser.name || "Unknown"} ${result.browser.version || ""}`.trim(),
      os: `${result.os.name || "Unknown"} ${result.os.version || ""}`.trim(),
      ip_address: null as string | null,
      is_active: true,
      last_active_at: new Date().toISOString(),
    };

    await (supabase as any).from("user_sessions").insert(sessionData);
  } catch (error) {
    console.error("Error tracking session:", error);
  }
}

export async function updateSessionActivity() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await (supabase as any)
      .from("user_sessions")
      .update({ last_active_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("is_active", true);
  } catch (error) {
    console.error("Error updating session activity:", error);
  }
}
