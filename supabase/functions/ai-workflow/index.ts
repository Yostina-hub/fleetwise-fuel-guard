import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse, getClientId } from "../_shared/rate-limiter.ts";
import { buildCorsHeaders, handleCorsPreflightRequest, secureJsonResponse } from "../_shared/cors.ts";
import { validateString, validateAll } from "../_shared/validation.ts";

const PALETTE_ITEMS = [
  { type: "trigger_schedule", label: "Scheduled Trigger", category: "triggers", icon: "⏰" },
  { type: "trigger_event", label: "Event Trigger", category: "triggers", icon: "⚡" },
  { type: "trigger_geofence", label: "Geofence Trigger", category: "triggers", icon: "📍" },
  { type: "trigger_alert", label: "Alert Trigger", category: "triggers", icon: "🚨" },
  { type: "trigger_sensor", label: "Sensor Trigger", category: "triggers", icon: "📡" },
  { type: "condition_if", label: "If / Else", category: "conditions", icon: "🔀" },
  { type: "condition_switch", label: "Switch Case", category: "conditions", icon: "🔃" },
  { type: "condition_threshold", label: "Threshold Check", category: "conditions", icon: "📊" },
  { type: "condition_filter", label: "Data Filter", category: "conditions", icon: "🔍" },
  { type: "fleet_assign_driver", label: "Assign Driver", category: "fleet", icon: "👤" },
  { type: "fleet_create_trip", label: "Create Trip", category: "fleet", icon: "🗺️" },
  { type: "fleet_update_vehicle", label: "Update Vehicle", category: "fleet", icon: "🚛" },
  { type: "fleet_maintenance", label: "Schedule Maintenance", category: "fleet", icon: "🔧" },
  { type: "fleet_fuel_check", label: "Fuel Level Check", category: "fleet", icon: "⛽" },
  { type: "fleet_speed_limit", label: "Speed Limit Action", category: "fleet", icon: "🏎️" },
  { type: "fleet_route_optimize", label: "Route Optimizer", category: "fleet", icon: "🛤️" },
  { type: "fleet_immobilize", label: "Immobilize Vehicle", category: "fleet", icon: "🔒" },
  { type: "fleet_request_approval", label: "Request Approval", category: "fleet", icon: "✅" },
  { type: "notify_email", label: "Send Email", category: "notifications", icon: "📧" },
  { type: "notify_sms", label: "Send SMS", category: "notifications", icon: "📱" },
  { type: "notify_push", label: "Push Notification", category: "notifications", icon: "🔔" },
  { type: "notify_escalation", label: "Escalation Chain", category: "notifications", icon: "📢" },
  { type: "data_transform", label: "Transform Data", category: "data", icon: "🔄" },
  { type: "data_aggregate", label: "Aggregate", category: "data", icon: "📈" },
  { type: "data_lookup", label: "Database Lookup", category: "data", icon: "🗄️" },
  { type: "data_api_call", label: "API Call", category: "data", icon: "🔗" },
  { type: "timing_delay", label: "Delay", category: "timing", icon: "⏳" },
  { type: "timing_debounce", label: "Debounce", category: "timing", icon: "🛑" },
  { type: "sensor_temperature", label: "Temperature Sensor", category: "sensors", icon: "🌡️" },
  { type: "sensor_fuel_level", label: "Fuel Level Sensor", category: "sensors", icon: "⛽" },
  { type: "hw_dashcam", label: "Dashcam Trigger", category: "safety_hardware", icon: "📹" },
  { type: "hw_panic_button", label: "Panic Button", category: "safety_hardware", icon: "🔴" },
  // AI-specific nodes
  { type: "ai_decision", label: "AI Smart Decision", category: "ai_intelligence", icon: "🧠" },
  { type: "ai_predict_maintenance", label: "AI Predictive Maintenance", category: "ai_intelligence", icon: "🔮" },
  { type: "ai_anomaly_detect", label: "AI Anomaly Detection", category: "ai_intelligence", icon: "🔍" },
  { type: "ai_route_optimize", label: "AI Route Optimizer", category: "ai_intelligence", icon: "🛣️" },
  { type: "ai_fuel_forecast", label: "AI Fuel Forecast", category: "ai_intelligence", icon: "📊" },
  { type: "ai_driver_scoring", label: "AI Driver Scoring", category: "ai_intelligence", icon: "⭐" },
];

function getNodeTypeForCategory(category: string) {
  if (category === "triggers") return "trigger";
  if (category === "conditions") return "condition";
  return "action";
}

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = buildCorsHeaders(req);

  try {
    const rl = checkRateLimit(getClientId(req), { maxRequests: 15, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return secureJsonResponse({ error: "Authorization required" }, req, 401);
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return secureJsonResponse({ error: "Invalid or expired token" }, req, 401);

    let body;
    try {
      body = await req.json();
    } catch {
      return secureJsonResponse({ error: "Invalid request body" }, req, 400);
    }

    const { prompt, action, currentNodes, currentEdges } = body;

    const validationError = validateAll(
      () => validateString(prompt, "prompt", { required: true, maxLength: 2000 }),
      () => validateString(action, "action", { required: true, maxLength: 50 }),
    );
    if (validationError) return secureJsonResponse({ error: validationError }, req, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const availableNodes = PALETTE_ITEMS.map(n => `${n.type} (${n.label}, category: ${n.category})`).join("\n");

    const systemPrompt = `You are a fleet workflow automation AI. You generate workflow nodes and edges for a visual workflow builder.

AVAILABLE NODE TYPES:
${availableNodes}

NODE STRUCTURE:
Each node has: id (string like "node_ai_1"), type ("trigger"|"condition"|"action"), position ({x,y}), data ({label, description, icon, category, nodeType, config:{}, status:"idle", isConfigured:true})

EDGE STRUCTURE:
Each edge has: id (string), source (node id), target (node id), type: "smoothstep", animated: true

ACTIONS:
- "generate": Create a complete workflow from a description. Return {nodes:[], edges:[]}
- "add_nodes": Add nodes to existing workflow. Return {nodes:[], edges:[]} (only new ones)
- "modify": Modify existing nodes/edges based on instructions. Return full {nodes:[], edges:[]}
- "delete": Remove specified nodes. Return {nodesToDelete:[], edgesToDelete:[]}
- "suggest": Return workflow suggestions as {suggestions: [{title, description, prompt}]}
- "auto_maintenance": Generate a predictive maintenance workflow. Return {nodes:[], edges:[]}
- "smart_decision": Generate an AI-powered decision workflow. Return {nodes:[], edges:[]}

POSITIONING: Space nodes 250px apart horizontally, 150px vertically. Start at x:100, y:100.

IMPORTANT:
- Use getNodeTypeForCategory to determine 'type': triggers->"trigger", conditions->"condition", everything else->"action"
- Always include realistic config values
- For auto_maintenance: include sensor triggers, threshold conditions, maintenance scheduling, and notifications
- For smart_decision: include data collection, AI decision nodes, conditional branches, and actions

RESPOND ONLY WITH VALID JSON. No markdown, no explanation.`;

    const userMessage = action === "modify" || action === "delete" || action === "add_nodes"
      ? `Current workflow:\nNodes: ${JSON.stringify(currentNodes || [])}\nEdges: ${JSON.stringify(currentEdges || [])}\n\nInstruction: ${prompt}`
      : prompt;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Action: ${action}\n\n${userMessage}` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return secureJsonResponse({ error: "Rate limit exceeded. Please try again later." }, req, 429);
      if (response.status === 402) return secureJsonResponse({ error: "AI credits exhausted. Please add credits to continue." }, req, 402);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("No response from AI");

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("Invalid AI response format");
    }

    // Post-process nodes to ensure correct type field
    if (parsed.nodes) {
      parsed.nodes = parsed.nodes.map((node: any) => ({
        ...node,
        type: getNodeTypeForCategory(node.data?.category || "actions"),
        data: {
          ...node.data,
          status: "idle",
          isConfigured: true,
        },
      }));
    }

    return secureJsonResponse({ result: parsed, action }, req, 200);
  } catch (error) {
    console.error("AI workflow error:", error);
    return secureJsonResponse({ error: "Internal server error" }, req, 500);
  }
});
