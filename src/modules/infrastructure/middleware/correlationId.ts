// Attaches a correlation ID to every request for distributed tracing.
// The ID is read from X-Correlation-ID header if present, otherwise generated.
import type { NextRequest, NextResponse } from "next/server";

function generateCorrelationId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function withCorrelationId(
  handler: (req: NextRequest, correlationId: string) => Promise<NextResponse>
) {
  return async function (req: NextRequest): Promise<NextResponse> {
    const correlationId =
      req.headers.get("x-correlation-id") ?? generateCorrelationId();

    const response = await handler(req, correlationId);
    response.headers.set("X-Correlation-ID", correlationId);
    return response;
  };
}
