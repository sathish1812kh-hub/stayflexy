// ─── Metric interfaces ────────────────────────────────────────────────────────

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

// ─── Internal helpers ─────────────────────────────────────────────────────────

function labelKey(labels?: Record<string, string>): string {
  if (labels === undefined || Object.keys(labels).length === 0) return '__default__';
  return JSON.stringify(
    Object.entries(labels).sort(([a], [b]) => a.localeCompare(b)),
  );
}

function formatLabels(labels?: Record<string, string>): string {
  if (labels === undefined || Object.keys(labels).length === 0) return '';
  const pairs = Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}="${v}"`)
    .join(',');
  return `{${pairs}}`;
}

// ─── MetricsRegistry ─────────────────────────────────────────────────────────

interface CounterEntry {
  help: string;
  values: Map<string, number>;
  rawLabels: Map<string, Record<string, string>>;
}

interface HistogramEntry {
  help: string;
  buckets: number[];
  observations: Map<string, number[]>;
  rawLabels: Map<string, Record<string, string>>;
}

interface GaugeEntry {
  help: string;
  values: Map<string, number>;
  rawLabels: Map<string, Record<string, string>>;
}

export class MetricsRegistry {
  private readonly counters = new Map<string, CounterEntry>();
  private readonly histograms = new Map<string, HistogramEntry>();
  private readonly gauges = new Map<string, GaugeEntry>();

  // ── counter ────────────────────────────────────────────────────────────────

  counter(name: string, help: string): Counter {
    if (!this.counters.has(name)) {
      this.counters.set(name, {
        help,
        values: new Map<string, number>(),
        rawLabels: new Map<string, Record<string, string>>(),
      });
    }
    const entry = this.counters.get(name) as CounterEntry;

    return {
      inc(labels?: Record<string, string>): void {
        const key = labelKey(labels);
        entry.values.set(key, (entry.values.get(key) ?? 0) + 1);
        if (labels !== undefined) {
          entry.rawLabels.set(key, labels);
        }
      },
      get(labels?: Record<string, string>): number {
        return entry.values.get(labelKey(labels)) ?? 0;
      },
    };
  }

  // ── histogram ──────────────────────────────────────────────────────────────

  histogram(
    name: string,
    help: string,
    buckets: number[] = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  ): Histogram {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, {
        help,
        buckets,
        observations: new Map<string, number[]>(),
        rawLabels: new Map<string, Record<string, string>>(),
      });
    }
    const entry = this.histograms.get(name) as HistogramEntry;

    return {
      observe(value: number, labels?: Record<string, string>): void {
        const key = labelKey(labels);
        const obs = entry.observations.get(key) ?? [];
        obs.push(value);
        entry.observations.set(key, obs);
        if (labels !== undefined) {
          entry.rawLabels.set(key, labels);
        }
      },
      percentile(p: number, labels?: Record<string, string>): number {
        const key = labelKey(labels);
        const obs = entry.observations.get(key) ?? [];
        if (obs.length === 0) return 0;
        const sorted = [...obs].sort((a, b) => a - b);
        const idx = Math.ceil((p / 100) * sorted.length) - 1;
        return sorted[Math.max(0, idx)] ?? 0;
      },
    };
  }

  // ── gauge ──────────────────────────────────────────────────────────────────

  gauge(name: string, help: string): Gauge {
    if (!this.gauges.has(name)) {
      this.gauges.set(name, {
        help,
        values: new Map<string, number>(),
        rawLabels: new Map<string, Record<string, string>>(),
      });
    }
    const entry = this.gauges.get(name) as GaugeEntry;

    return {
      set(value: number, labels?: Record<string, string>): void {
        const key = labelKey(labels);
        entry.values.set(key, value);
        if (labels !== undefined) {
          entry.rawLabels.set(key, labels);
        }
      },
      inc(labels?: Record<string, string>): void {
        const key = labelKey(labels);
        entry.values.set(key, (entry.values.get(key) ?? 0) + 1);
        if (labels !== undefined) {
          entry.rawLabels.set(key, labels);
        }
      },
      dec(labels?: Record<string, string>): void {
        const key = labelKey(labels);
        entry.values.set(key, (entry.values.get(key) ?? 0) - 1);
        if (labels !== undefined) {
          entry.rawLabels.set(key, labels);
        }
      },
      get(labels?: Record<string, string>): number {
        return entry.values.get(labelKey(labels)) ?? 0;
      },
    };
  }

  // ── toPrometheusText ───────────────────────────────────────────────────────

  toPrometheusText(): string {
    const lines: string[] = [];

    for (const [name, entry] of this.counters) {
      lines.push(`# HELP ${name} ${entry.help}`);
      lines.push(`# TYPE ${name} counter`);
      for (const [key, value] of entry.values) {
        const labels = key === '__default__' ? undefined : entry.rawLabels.get(key);
        lines.push(`${name}${formatLabels(labels)} ${value}`);
      }
    }

    for (const [name, entry] of this.histograms) {
      lines.push(`# HELP ${name} ${entry.help}`);
      lines.push(`# TYPE ${name} histogram`);
      for (const [key, obs] of entry.observations) {
        const labels = key === '__default__' ? undefined : entry.rawLabels.get(key);
        const labelStr = formatLabels(labels);
        const baseLabelStr = labels !== undefined
          ? `{${Object.entries(labels)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, v]) => `${k}="${v}"`)
              .join(',')},le=`
          : '{le=';

        let cumulative = 0;
        for (const bucket of entry.buckets) {
          const count = obs.filter((v) => v <= bucket).length;
          cumulative = count;
          lines.push(`${name}_bucket${baseLabelStr}"${bucket}"} ${cumulative}`);
        }
        lines.push(`${name}_bucket${baseLabelStr}"+Inf"} ${obs.length}`);
        const sum = obs.reduce((a, b) => a + b, 0);
        lines.push(`${name}_sum${labelStr} ${sum}`);
        lines.push(`${name}_count${labelStr} ${obs.length}`);
      }
    }

    for (const [name, entry] of this.gauges) {
      lines.push(`# HELP ${name} ${entry.help}`);
      lines.push(`# TYPE ${name} gauge`);
      for (const [key, value] of entry.values) {
        const labels = key === '__default__' ? undefined : entry.rawLabels.get(key);
        lines.push(`${name}${formatLabels(labels)} ${value}`);
      }
    }

    return lines.join('\n') + '\n';
  }
}

// ─── Metrics HTTP handler ─────────────────────────────────────────────────────

export function createMetricsHandler(
  registry: MetricsRegistry,
): (
  req: unknown,
  res: {
    setHeader(k: string, v: string): void;
    end(body: string): void;
    statusCode: number;
  },
) => void {
  return (_req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain; version=0.0.4');
    res.end(registry.toPrometheusText());
  };
}

// ─── HTTP metrics middleware ──────────────────────────────────────────────────

export function createHttpMetricsMiddleware(registry: MetricsRegistry): (
  req: Record<string, unknown>,
  res: {
    statusCode: number;
    on(event: string, fn: () => void): void;
  },
  next: () => void,
) => void {
  const requestDuration = registry.histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
  );
  const requestTotal = registry.counter(
    'http_requests_total',
    'Total number of HTTP requests',
  );

  return (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
      const durationS = (Date.now() - start) / 1000;
      const labels = {
        method: String(req['method'] ?? 'GET'),
        status: String(res.statusCode),
        path: String(req['path'] ?? '/'),
      };
      requestDuration.observe(durationS, labels);
      requestTotal.inc(labels);
    });

    next();
  };
}
