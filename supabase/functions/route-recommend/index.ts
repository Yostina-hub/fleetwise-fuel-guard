/**
 * route-recommend
 * ---------------
 * Asks Lovable AI (Gemini) to pick the best route among 2-3 OSRM-computed
 * candidates given trip context (passengers, time window, pool, stop count).
 *
 * The AI does NOT invent measurements. Distance and duration come from OSRM
 * and are passed in verbatim. The model only weighs trade-offs: e.g. shortest
 * vs fewest turns, route via congested corridors near rush hour, etc., and
 * returns:
 *   { best_index: number, reasoning: string, runner_up_index?: number }
 *
 * Request:
 *   POST {
 *     candidates: [{ label, distance_km, duration_min, sample_coords?: [[lng,lat], ...] }, ...],
 *     context: {
 *       pool_name?: string,
 *       passengers?: number,
 *       stop_count?: number,
 *       needed_from?: string,   // ISO
 *       needed_until?: string,  // ISO
 *       city?: string,
 *     }
 *   }
 *
 * Response:
 *   { ok: true, best_index, reasoning, runner_up_index?, model }
 *   { ok: false, error }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  handleCorsPreflightRequest,
  secureJsonResponse,
} from "../_shared/cors.ts";

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

interface FenceHit {
  name: string;
  policy?: "prefer" | "avoid" | "neutral";
  priority?: number;
}

interface Candidate {
  label?: string;
  distance_km: number;
  duration_min: number;
  sample_coords?: [number, number][];
  /**
   * Geofences this route passes through. Each entry is either a bare name
   * (legacy) or an object with the effective dispatch policy. The effective
   * policy already reflects the per-trip override applied client-side.
   */
  geofences?: Array<string | FenceHit>;
}

const isCandidate = (c: unknown): c is Candidate =>
  typeof c === "object" &&
  c !== null &&
  typeof (c as any).distance_km === "number" &&
  typeof (c as any).duration_min === "number" &&
  Number.isFinite((c as any).distance_km) &&
  Number.isFinite((c as any).duration_min);

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return secureJsonResponse({ ok: false, error: "method_not_allowed" }, req, 405);
  }

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    return secureJsonResponse(
      { ok: false, error: "ai_not_configured" },
      req,
      500,
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return secureJsonResponse({ ok: false, error: "invalid_json" }, req, 400);
  }

  const candidates = body?.candidates;
  if (!Array.isArray(candidates) || candidates.length < 2 || candidates.length > 5) {
    return secureJsonResponse(
      { ok: false, error: "candidates must be an array of 2-5 entries" },
      req,
      400,
    );
  }
  if (!candidates.every(isCandidate)) {
    return secureJsonResponse(
      { ok: false, error: "each candidate needs numeric distance_km and duration_min" },
      req,
      400,
    );
  }

  const ctx = (body?.context && typeof body.context === "object") ? body.context : {};

  // Build a compact, factual prompt. We deliberately pass the OSRM numbers as
  // ground truth — the model is only being asked to weigh trade-offs.
  const candidateLines = candidates
    .map((c: Candidate, i: number) => {
      const sample = Array.isArray(c.sample_coords) && c.sample_coords.length > 0
        ? ` first=[${c.sample_coords[0].map((n) => n.toFixed(4)).join(",")}] mid=[${
          c.sample_coords[Math.floor(c.sample_coords.length / 2)].map((n) => n.toFixed(4)).join(",")
        }]`
        : "";
      const fences = Array.isArray(c.geofences) && c.geofences.length > 0
        ? ` geofences=[${c.geofences.map((g) => `"${g}"`).join(", ")}]`
        : " geofences=[none]";
      return `${i}: ${c.label ?? `Route ${i + 1}`} — ${c.duration_min.toFixed(1)} min, ${c.distance_km.toFixed(1)} km${sample}${fences}`;
    })
    .join("\n");

  const knownFences = Array.isArray(ctx.known_geofences) ? ctx.known_geofences : [];

  const ctxLines = [
    ctx.pool_name && `Pool: ${ctx.pool_name}`,
    typeof ctx.passengers === "number" && `Passengers: ${ctx.passengers}`,
    typeof ctx.stop_count === "number" && `Stops: ${ctx.stop_count}`,
    ctx.needed_from && `Departure: ${ctx.needed_from}`,
    ctx.needed_until && `Latest arrival: ${ctx.needed_until}`,
    ctx.city && `City: ${ctx.city}`,
    knownFences.length > 0 &&
      `Known organisation geofences (zones to be aware of): ${knownFences.join(", ")}`,
  ].filter(Boolean).join("\n");

  const systemPrompt = `You are a fleet dispatch assistant choosing between road routes for a shared vehicle trip.
You receive 2-5 candidate routes that all visit the same stops in the same order — only the road path differs.
Pick the BEST route considering, in priority order:
  1. Geofence policy: STRONGLY prefer routes that pass through authorised operational zones (depots, service areas) AND avoid routes that cross restricted/penalty zones. Use the geofence names as hints — words like "restricted", "no-go", "penalty", "ቅጣት" suggest avoid; "depot", "HQ", "service", "pool" suggest authorised.
  2. Duration (lower is usually better)
  3. Distance (lower is better when duration is similar)
  4. Reliability for shared rides (avoid much-longer detours unless time saving is significant)
  5. Trip context (passenger count, time window, pool type)
A route can win on geofence compliance even if it is slightly slower; explain that trade-off when it happens.
Return your choice via the 'choose_route' tool. Keep reasoning to 1-2 short sentences and reference both the actual numbers AND any decisive geofence(s).`;

  const userPrompt = `Candidates:\n${candidateLines}\n\nTrip context:\n${ctxLines || "(none provided)"}`;

  try {
    const aiRes = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "choose_route",
              description: "Select the best candidate route and explain why.",
              parameters: {
                type: "object",
                properties: {
                  best_index: {
                    type: "integer",
                    minimum: 0,
                    maximum: candidates.length - 1,
                    description: "Zero-based index of the chosen route in the candidates list.",
                  },
                  runner_up_index: {
                    type: "integer",
                    minimum: 0,
                    maximum: candidates.length - 1,
                    description: "Optional second-best route index, or omit if there is no clear runner-up.",
                  },
                  reasoning: {
                    type: "string",
                    description: "1-2 short sentences justifying the pick using the actual duration/distance numbers.",
                  },
                },
                required: ["best_index", "reasoning"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "choose_route" } },
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!aiRes.ok) {
      const status = aiRes.status;
      const errBody = await aiRes.text().catch(() => "");
      console.error("ai-gateway error", status, errBody);
      if (status === 429) {
        return secureJsonResponse(
          { ok: false, error: "rate_limited", message: "AI rate limit reached, please retry shortly." },
          req,
          429,
        );
      }
      if (status === 402) {
        return secureJsonResponse(
          { ok: false, error: "payment_required", message: "AI credits exhausted — top up at Settings → Workspace → Usage." },
          req,
          402,
        );
      }
      return secureJsonResponse({ ok: false, error: "ai_gateway_error" }, req, 502);
    }

    const json = await aiRes.json();
    const toolCall = json?.choices?.[0]?.message?.tool_calls?.[0];
    const argsRaw = toolCall?.function?.arguments;
    if (!argsRaw) {
      return secureJsonResponse({ ok: false, error: "ai_no_choice" }, req, 502);
    }
    let args: any;
    try {
      args = typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw;
    } catch {
      return secureJsonResponse({ ok: false, error: "ai_invalid_args" }, req, 502);
    }
    const bestIndex = Number(args?.best_index);
    if (!Number.isInteger(bestIndex) || bestIndex < 0 || bestIndex >= candidates.length) {
      return secureJsonResponse({ ok: false, error: "ai_index_out_of_range" }, req, 502);
    }
    const runnerUp = Number.isInteger(args?.runner_up_index) ? Number(args.runner_up_index) : undefined;

    return secureJsonResponse(
      {
        ok: true,
        model: MODEL,
        best_index: bestIndex,
        runner_up_index:
          runnerUp !== undefined && runnerUp >= 0 && runnerUp < candidates.length && runnerUp !== bestIndex
            ? runnerUp
            : undefined,
        reasoning: typeof args?.reasoning === "string" ? args.reasoning.slice(0, 500) : "",
      },
      req,
    );
  } catch (err) {
    console.error("route-recommend error:", err);
    return secureJsonResponse({ ok: false, error: "upstream_unavailable" }, req, 502);
  }
});
