import { randomUUID } from 'crypto';

// ─── Core utilities ───────────────────────────────────────────────────────────

export function generateCorrelationId(): string {
  return randomUUID();
}

export function extractCorrelationId(
  headers: Record<string, string | string[] | undefined>,
): string {
  const raw = headers['x-correlation-id'];
  if (raw === undefined || raw === null) {
    return generateCorrelationId();
  }
  if (Array.isArray(raw)) {
    return raw[0] ?? generateCorrelationId();
  }
  return raw.length > 0 ? raw : generateCorrelationId();
}

// ─── Express-compatible middleware ────────────────────────────────────────────
// Deliberately avoids importing 'express' to keep this package dependency-free.

export function correlationMiddleware(
  req: { headers: Record<string, string | string[] | undefined> },
  res: { setHeader(k: string, v: string): void },
  next: () => void,
): void {
  const correlationId = extractCorrelationId(req.headers);
  res.setHeader('X-Correlation-Id', correlationId);
  // Attach to the request object so downstream handlers can read it
  Object.assign(req, { correlationId });
  next();
}
