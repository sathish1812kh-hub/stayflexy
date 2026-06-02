// In-process metrics collector — aggregates counters, gauges, and histograms.
// Production: push to Prometheus (prom-client) or DataDog (dd-trace).

export interface MetricPoint {
  name: string;
  value: number;
  labels: Record<string, string>;
  timestamp: number;
}

class MetricsCollector {
  private readonly counters = new Map<string, number>();
  private readonly gauges = new Map<string, number>();
  private readonly histograms = new Map<string, number[]>();

  private key(name: string, labels: Record<string, string>): string {
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(",");
    return labelStr ? `${name}{${labelStr}}` : name;
  }

  increment(name: string, labels: Record<string, string> = {}, by = 1): void {
    const k = this.key(name, labels);
    this.counters.set(k, (this.counters.get(k) ?? 0) + by);
  }

  gauge(name: string, value: number, labels: Record<string, string> = {}): void {
    this.gauges.set(this.key(name, labels), value);
  }

  observe(name: string, value: number, labels: Record<string, string> = {}): void {
    const k = this.key(name, labels);
    const bucket = this.histograms.get(k) ?? [];
    bucket.push(value);
    // Keep last 1000 observations per metric
    if (bucket.length > 1000) bucket.shift();
    this.histograms.set(k, bucket);
  }

  // Returns p50/p95/p99 for a histogram metric
  percentiles(name: string, labels: Record<string, string> = {}): { p50: number; p95: number; p99: number } | null {
    const bucket = this.histograms.get(this.key(name, labels));
    if (!bucket || bucket.length === 0) return null;
    const sorted = [...bucket].sort((a, b) => a - b);
    const pct = (p: number) => sorted[Math.floor(sorted.length * p)] ?? 0;
    return { p50: pct(0.5), p95: pct(0.95), p99: pct(0.99) };
  }

  snapshot(): { counters: Record<string, number>; gauges: Record<string, number> } {
    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
    };
  }

  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }
}

export const metrics = new MetricsCollector();
