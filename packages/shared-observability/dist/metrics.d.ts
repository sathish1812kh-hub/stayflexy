export interface Counter {
    inc(labels?: Record<string, string>): void;
    get(labels?: Record<string, string>): number;
}
export interface Histogram {
    observe(value: number, labels?: Record<string, string>): void;
    percentile(p: number, labels?: Record<string, string>): number;
}
export interface Gauge {
    set(value: number, labels?: Record<string, string>): void;
    inc(labels?: Record<string, string>): void;
    dec(labels?: Record<string, string>): void;
    get(labels?: Record<string, string>): number;
}
export declare class MetricsRegistry {
    private readonly counters;
    private readonly histograms;
    private readonly gauges;
    counter(name: string, help: string): Counter;
    histogram(name: string, help: string, buckets?: number[]): Histogram;
    gauge(name: string, help: string): Gauge;
    toPrometheusText(): string;
}
export declare function createMetricsHandler(registry: MetricsRegistry): (req: unknown, res: {
    setHeader(k: string, v: string): void;
    end(body: string): void;
    statusCode: number;
}) => void;
export declare function createHttpMetricsMiddleware(registry: MetricsRegistry): (req: Record<string, unknown>, res: {
    statusCode: number;
    on(event: string, fn: () => void): void;
}, next: () => void) => void;
