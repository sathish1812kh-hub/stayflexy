import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

// ─── Async-local-storage context ──────────────────────────────────────────────

interface CorrelationContext {
  correlationId: string;
}

const storage = new AsyncLocalStorage<CorrelationContext>();

export function getCorrelationId(): string {
  return storage.getStore()?.correlationId ?? 'no-context';
}

// ─── Express-compatible middleware ────────────────────────────────────────────
// Uses inline interface definitions to avoid adding 'express' as a runtime dep.

export function correlationMiddleware(
  req: { headers: Record<string, string | string[] | undefined> } & Record<string, unknown>,
  res: { setHeader(k: string, v: string): void },
  next: () => void,
): void {
  const raw = req['headers']['x-correlation-id'];
  const correlationId: string =
    (Array.isArray(raw) ? raw[0] : raw) ?? randomUUID();

  res.setHeader('x-correlation-id', correlationId);

  storage.run({ correlationId }, () => {
    // Attach to the request object for downstream handler access
    (req as Record<string, unknown>)['correlationId'] = correlationId;
    next();
  });
}
