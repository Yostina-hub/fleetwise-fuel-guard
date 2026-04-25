import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = [
  "https://fleet.goffice.et",
  "https://fleetwise-fuel-guard.lovable.app",
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (origin.endsWith(".lovableproject.com")) return true;
  if (origin.endsWith(".lovable.app")) return true;
  return false;
}

function corsHeaders(origin: string | null) {
  const allowedOrigin = isAllowedOrigin(origin) ? (origin || "*") : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

const LEMAT_ORIGIN = "https://lemat.goffice.et";

/**
 * Build the absolute proxy URL for a given Lemat path.
 * Preserves MapLibre template tokens like {z}/{x}/{y}.
 */
function buildProxyUrl(reqUrl: URL, path: string): string {
  // path may be absolute (https://lemat.goffice.et/...) or relative
  let cleanPath = path;
  if (cleanPath.startsWith(LEMAT_ORIGIN)) {
    cleanPath = cleanPath.slice(LEMAT_ORIGIN.length);
  }
  cleanPath = cleanPath.replace(/^\/+/, "");
  // origin of THIS edge function (so the rewritten URL is absolute & stable)
  const base = `${reqUrl.origin}${reqUrl.pathname}`;
  return `${base}?path=${cleanPath}`;
}

/** Recursively rewrite any string fields in a JSON value that look like Lemat URLs. */
function rewriteJsonUrls(value: any, reqUrl: URL): any {
  if (typeof value === "string") {
    // Absolute Lemat URL
    if (value.startsWith(LEMAT_ORIGIN)) {
      return buildProxyUrl(reqUrl, value);
    }
    // Relative path that looks like a tile/glyph/sprite resource (contains template tokens
    // or .pbf / .json / .png / sprite extensions). We can't reliably rewrite arbitrary
    // strings, so only rewrite when it looks like a tile-ish path.
    if (
      /\{z\}|\{x\}|\{y\}|\.pbf$|\.pbf\?/.test(value) ||
      /^api\/v1\/.+\.(json|png|pbf)$/.test(value)
    ) {
      return buildProxyUrl(reqUrl, value);
    }
  }
  if (Array.isArray(value)) {
    return value.map((v) => rewriteJsonUrls(v, reqUrl));
  }
  if (value && typeof value === "object") {
    const out: any = {};
    for (const k of Object.keys(value)) {
      out[k] = rewriteJsonUrls(value[k], reqUrl);
    }
    return out;
  }
  return value;
}

serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  try {
    const url = new URL(req.url);
    const tilePath = url.searchParams.get("path");

    if (!tilePath) {
      return new Response(JSON.stringify({ error: "Missing path parameter" }), {
        status: 400,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    const tileUrl = `${LEMAT_ORIGIN}/${tilePath}`;
    const tileResp = await fetch(tileUrl);

    if (!tileResp.ok) {
      return new Response(null, {
        status: tileResp.status,
        headers: corsHeaders(origin),
      });
    }

    const contentType = tileResp.headers.get("content-type") || "application/x-protobuf";

    // If the upstream is JSON (TileJSON / style / sprite manifest), rewrite any
    // Lemat URLs inside it so that they go back through this proxy. Otherwise
    // MapLibre resolves relative tile paths against the proxy URL itself,
    // producing 404s like /functions/v1/8192-8447.pbf.
    if (contentType.includes("application/json") || contentType.includes("text/json")) {
      const text = await tileResp.text();
      try {
        const json = JSON.parse(text);
        const rewritten = rewriteJsonUrls(json, url);
        return new Response(JSON.stringify(rewritten), {
          status: 200,
          headers: {
            ...corsHeaders(origin),
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=3600",
          },
        });
      } catch {
        // Not valid JSON, fall through to raw passthrough
        return new Response(text, {
          status: 200,
          headers: {
            ...corsHeaders(origin),
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=3600",
          },
        });
      }
    }

    const body = await tileResp.arrayBuffer();
    return new Response(body, {
      status: 200,
      headers: {
        ...corsHeaders(origin),
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Proxy error" }), {
      status: 500,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }
});
