import type { NodeCategory } from "./types";

/**
 * Maps a node category (or specific nodeType) to a CSS variable token
 * already defined in index.css. Returned strings are inserted into inline
 * styles via `hsl(var(--token))` so light/dark/cyber themes all look right.
 */
export function accentTokenFor(category?: string, nodeType?: string): string {
  if (nodeType?.startsWith("trigger_")) return "--node-trigger";
  if (nodeType?.startsWith("condition_")) return "--node-condition";
  if (nodeType?.startsWith("ai_") || category === "ai_intelligence") return "--node-ai";
  if (nodeType?.startsWith("sensor_") || category === "sensors") return "--node-sensor";
  switch (category as NodeCategory) {
    case "triggers": return "--node-trigger";
    case "conditions": return "--node-condition";
    case "fleet": return "--node-fleet";
    case "notifications": return "--node-notification";
    case "data": return "--node-data";
    case "timing": return "--node-timing";
    case "ai_intelligence": return "--node-ai";
    case "sensors": return "--node-sensor";
    case "safety_hardware": return "--node-action";
    case "actions":
    default: return "--node-action";
  }
}

export function categoryLabel(category?: string): string {
  switch (category) {
    case "triggers": return "Trigger";
    case "conditions": return "Decision";
    case "fleet": return "Fleet";
    case "notifications": return "Notify";
    case "data": return "Data";
    case "timing": return "Wait";
    case "ai_intelligence": return "AI";
    case "sensors": return "Sensor";
    case "safety_hardware": return "Safety";
    default: return "Action";
  }
}

/** Status -> token for the running/done/failed dot. */
export function statusTokenFor(status?: string): string {
  switch (status) {
    case "running": return "--status-running";
    case "success": return "--status-done";
    case "error": return "--status-failed";
    default: return "--status-pending";
  }
}
