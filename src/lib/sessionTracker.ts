import { supabase } from "@/integrations/supabase/client";

function parseUserAgent(ua: string) {
  const browser = { name: "Unknown", version: "" };
  const os = { name: "Unknown", version: "" };
  const device = { type: "desktop" };

  // Browser detection
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

  // OS detection
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

export async function trackSession(userId: string) {
  try {
    const result = parseUserAgent(navigator.userAgent);

    const sessionData = {
      user_id: userId,
      device_type: result.device.type,
      browser: `${result.browser.name} ${result.browser.version}`.trim(),
      os: `${result.os.name} ${result.os.version}`.trim(),
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
