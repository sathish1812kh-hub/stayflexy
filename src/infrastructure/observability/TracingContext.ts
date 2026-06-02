// Distributed tracing context — lightweight AsyncLocalStorage-based span tracking.
// Production: swap with OpenTelemetry SDK (otel SDK is API-compatible with this shape).
import { AsyncLocalStorage } from "node:async_hooks";

export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startedAt: number;
  attributes: Record<string, string | number | boolean>;
  status: "ok" | "error";
}

export interface TraceContext {
  traceId: string;
  spanId: string;
  correlationId: string;
  organizationId?: string;
  userId?: string;
}

function generateId(prefix = ""): string {
  return `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

const storage = new AsyncLocalStorage<TraceContext>();

export const tracing = {
  // Run a function within a trace context
  run<T>(context: Partial<TraceContext>, fn: () => T): T {
    const ctx: TraceContext = {
      traceId: context.traceId ?? generateId("tr-"),
      spanId: context.spanId ?? generateId("sp-"),
      correlationId: context.correlationId ?? generateId(),
      organizationId: context.organizationId,
      userId: context.userId,
    };
    return storage.run(ctx, fn);
  },

  // Get current context (null if no active trace)
  current(): TraceContext | null {
    return storage.getStore() ?? null;
  },

  // Extract from HTTP headers (W3C Traceparent format preparation)
  fromHeaders(headers: Headers): Partial<TraceContext> {
    return {
      correlationId: headers.get("x-correlation-id") ?? undefined,
      traceId: headers.get("x-trace-id") ?? undefined,
      organizationId: headers.get("x-organization-id") ?? undefined,
    };
  },

  // Create a child span context
  childSpan(operationName: string): TraceSpan {
    const ctx = storage.getStore();
    return {
      traceId: ctx?.traceId ?? generateId("tr-"),
      spanId: generateId("sp-"),
      parentSpanId: ctx?.spanId,
      operationName,
      startedAt: Date.now(),
      attributes: {},
      status: "ok",
    };
  },
};
