// AI-powered vehicle type suggestion for the Vehicle Request form.
// Uses Lovable AI Gateway with tool-calling to return a structured pick from
// the eligible list, plus a short rationale shown to the requester.
import { buildCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

interface Body {
  purpose?: string;
  purpose_category?: string;
  destination?: string;
  departure_place?: string;
  passengers?: number | null;
  cargo_load?: "none" | "small" | "medium" | "large" | null;
  cargo_weight_kg?: number | null;
  terrain?: string | null;
  is_messenger?: boolean;
  rule_recommendation?: string | null;
  eligible_types: { value: string; label: string }[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: buildCorsHeaders(req) });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const body = (await req.json()) as Body;
    if (!Array.isArray(body.eligible_types) || body.eligible_types.length === 0) {
      return new Response(JSON.stringify({ error: "No eligible vehicle types provided" }), {
        status: 400,
        headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const allowedValues = body.eligible_types.map((t) => t.value);
    const optionsList = body.eligible_types
      .map((t) => `- ${t.value} (${t.label})`)
      .join("\n");

    const systemPrompt = `You are a fleet operations assistant for an Ethiopian telecom company.
Pick the SMALLEST sufficient vehicle class for the trip from the allowed list.
Prefer cheaper classes when capacity and cargo allow. Respect:
- passenger count (must fit)
- cargo size and weight (must fit)
- terrain/destination (suggest 4x4-capable like SUV / DoubleCab if rural / off-road / construction)
- messenger / courier service uses motorbike, scooter, or bicycle ONLY
Return your answer via the suggest_vehicle_type tool. The 'reason' must be one short sentence (max 25 words).`;

    const userPrompt = `Trip context:
- Purpose: ${body.purpose || "(not specified)"}
- Category: ${body.purpose_category || "(not specified)"}
- From: ${body.departure_place || "(not specified)"}
- To: ${body.destination || "(not specified)"}
- Passengers: ${body.passengers ?? 1}
- Cargo size: ${body.cargo_load || "none"}
- Cargo weight (kg): ${body.cargo_weight_kg ?? 0}
- Messenger service: ${body.is_messenger ? "yes" : "no"}
- Rule-based recommendation: ${body.rule_recommendation || "(none)"}

Allowed vehicle types (you MUST pick from these values):
${optionsList}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_vehicle_type",
              description: "Suggest the best vehicle type from the allowed list.",
              parameters: {
                type: "object",
                properties: {
                  vehicle_type: {
                    type: "string",
                    enum: allowedValues,
                    description: "The chosen vehicle type value (must match one of the allowed values).",
                  },
                  reason: {
                    type: "string",
                    description: "One short sentence (≤25 words) explaining why this class fits.",
                  },
                  confidence: {
                    type: "string",
                    enum: ["low", "medium", "high"],
                  },
                },
                required: ["vehicle_type", "reason", "confidence"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_vehicle_type" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded — please try again in a moment." }),
          { status: 429, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } },
        );
      }
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted — add funds to your Lovable workspace." }),
          { status: 402, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } },
        );
      }
      const txt = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, txt);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const json = await aiRes.json();
    const call = json?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) {
      return new Response(JSON.stringify({ error: "No suggestion produced" }), {
        status: 502,
        headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
      });
    }
    let parsed: { vehicle_type: string; reason: string; confidence: string };
    try {
      parsed = JSON.parse(call.function.arguments);
    } catch {
      return new Response(JSON.stringify({ error: "Malformed AI response" }), {
        status: 502,
        headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
      });
    }
    if (!allowedValues.includes(parsed.vehicle_type)) {
      // Defensive: fall back to the first eligible option if the model hallucinates.
      parsed.vehicle_type = allowedValues[0];
      parsed.confidence = "low";
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-vehicle-type error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" } },
    );
  }
});
