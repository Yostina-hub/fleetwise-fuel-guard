import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, rateLimitResponse, getClientId } from "../_shared/rate-limiter.ts";
import { buildCorsHeaders, handleCorsPreflightRequest, secureJsonResponse, secureStreamResponse } from "../_shared/cors.ts";
import { validateArray, validateString, validateAll } from "../_shared/validation.ts";

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = buildCorsHeaders(req);

  try {
    const rl = checkRateLimit(getClientId(req), { maxRequests: 20, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);
    let body;
    try {
      body = await req.json();
    } catch {
      return secureJsonResponse({ error: 'Invalid or missing request body' }, req, 400);
    }
    const { messages, context } = body;

    // Input validation
    const validationError = validateAll(
      () => validateArray(messages, "messages", { minLength: 1, maxLength: 50 }),
      () => validateString(context?.page, "context.page", { required: false, maxLength: 200 }),
    );
    if (validationError) return secureJsonResponse({ error: validationError }, req, 400);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build system prompt based on context
    const systemPrompt = `You are FleetAI, an intelligent assistant for a fleet management system. 

Current page context: ${context?.page || 'Dashboard'}

You help users with:
- Understanding fleet data and metrics
- Navigating the system
- Getting insights on vehicles, routes, fuel consumption, and maintenance
- Making data-driven decisions
- Answering questions about alerts, incidents, and scheduling

Be concise, helpful, and focus on fleet management tasks. When discussing data, use realistic examples relevant to fleet operations.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return secureJsonResponse({ error: 'Rate limit exceeded. Please try again later.' }, req, 429);
      }
      if (response.status === 402) {
        return secureJsonResponse({ error: 'AI credits exhausted. Please add credits to continue.' }, req, 402);
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    return secureStreamResponse(response.body, req);
  } catch (error) {
    console.error('AI chat error:', error);
    return secureJsonResponse({ error: 'Internal server error' }, req, 500);
  }
});
