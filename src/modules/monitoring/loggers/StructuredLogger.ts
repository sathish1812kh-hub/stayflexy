// Structured JSON logger with correlation ID support.
// In production this output is consumed by log aggregators (DataDog, CloudWatch, etc.)

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  correlationId?: string;
  module?: string;
  organizationId?: string;
  hotelId?: string;
  userId?: string;
  durationMs?: number;
  error?: { name: string; message: string; stack?: string };
  meta?: Record<string, unknown>;
}

class StructuredLoggerImpl {
  private format(level: LogLevel, message: string, meta?: Partial<LogEntry>): string {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta,
    };
    return JSON.stringify(entry);
  }

  debug(message: string, meta?: Partial<LogEntry>): void {
    if (process.env["NODE_ENV"] !== "production") {
      process.stdout.write(this.format("debug", message, meta) + "\n");
    }
  }

  info(message: string, meta?: Partial<LogEntry>): void {
    process.stdout.write(this.format("info", message, meta) + "\n");
  }

  warn(message: string, meta?: Partial<LogEntry>): void {
    process.stderr.write(this.format("warn", message, meta) + "\n");
  }

  error(message: string, error?: unknown, meta?: Partial<LogEntry>): void {
    const errorMeta =
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : undefined;
    process.stderr.write(
      this.format("error", message, { ...meta, ...(errorMeta ? { error: errorMeta } : {}) }) + "\n"
    );
  }

  child(meta: Partial<LogEntry>): ChildLogger {
    return new ChildLogger(this, meta);
  }
}

class ChildLogger {
  constructor(
    private readonly parent: StructuredLoggerImpl,
    private readonly baseMeta: Partial<LogEntry>
  ) {}

  debug(message: string, meta?: Partial<LogEntry>): void {
    this.parent.debug(message, { ...this.baseMeta, ...meta });
  }
  info(message: string, meta?: Partial<LogEntry>): void {
    this.parent.info(message, { ...this.baseMeta, ...meta });
  }
  warn(message: string, meta?: Partial<LogEntry>): void {
    this.parent.warn(message, { ...this.baseMeta, ...meta });
  }
  error(message: string, error?: unknown, meta?: Partial<LogEntry>): void {
    this.parent.error(message, error, { ...this.baseMeta, ...meta });
  }
}

export const logger = new StructuredLoggerImpl();
export type { ChildLogger };
