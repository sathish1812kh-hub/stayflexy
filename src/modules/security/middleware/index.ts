import type { NextRequest, NextResponse } from "next/server";

export function extractDeviceId(req: NextRequest): string {
  const ua = req.headers.get("user-agent") ?? "";
  const acceptLang = req.headers.get("accept-language") ?? "";
  const fingerprint = `${ua}:${acceptLang}`.slice(0, 200);
  let hash = 5381;
  for (let i = 0; i < fingerprint.length; i++) {
    hash = ((hash << 5) + hash + fingerprint.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

export function extractClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export function applySessionSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return response;
}
