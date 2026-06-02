import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';
export { trace, context, SpanStatusCode, SpanKind };
export interface TracerOptions {
    jaegerEndpoint?: string;
    enabled?: boolean;
}
export declare function initTracer(serviceName: string, options?: TracerOptions): void;
export declare function withSpan<T>(name: string, attributes: Record<string, string | number | boolean>, fn: () => Promise<T>): Promise<T>;
