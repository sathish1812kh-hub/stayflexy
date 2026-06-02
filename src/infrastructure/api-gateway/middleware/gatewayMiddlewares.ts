// Standard gateway middlewares composed by the pipeline.
import type { MiddlewareFn } from "../types";

function generateCorrelationId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

// Attaches correlation ID to request and propagates to response
export const correlationIdMiddleware: MiddlewareFn = async (req, next) => {
  const correlationId = req.headers.get("x-correlation-id") ?? generateCorrelationId();
  const response = await next();
  response.headers.set("X-Correlation-ID", correlationId);
  return response;
};

// Structured request logging
export const requestLoggingMiddleware: MiddlewareFn = async (req, next) => {
  const start = Date.now();
  const correlationId = req.headers.get("x-correlation-id") ?? "unknown";
  const response = await next();
  const duration = Date.now() - start;
  process.stdout.write(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "info",
      message: "HTTP request",
      method: req.method,
      path: req.nextUrl.pathname,
      status: response.status,
      durationMs: duration,
      correlationId,
    }) + "\n"
  );
  return response;
};

// Security headers
export const securityHeadersMiddleware: MiddlewareFn = async (req, next) => {
  const response = await next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  if (process.env["NODE_ENV"] === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  }
  return response;
};
