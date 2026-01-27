const ALLOWED_ORIGINS = [
  "https://theswitchison.org",
  "https://www.theswitchison.org",
  "https://bidsmart.theswitchison.org",
  "http://localhost:5173",
  "http://localhost:3000",
];

export function getCorsHeaders(origin?: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
  };
}

export const corsHeaders = getCorsHeaders();

export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    const origin = req.headers.get("Origin");
    return new Response(null, {
      status: 200,
      headers: getCorsHeaders(origin),
    });
  }
  return null;
}

export function jsonResponse(data: unknown, status = 200, req?: Request): Response {
  const origin = req?.headers.get("Origin");
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...getCorsHeaders(origin),
      "Content-Type": "application/json",
    },
  });
}

export function errorResponse(message: string, status = 400, req?: Request): Response {
  return jsonResponse({ error: message }, status, req);
}
