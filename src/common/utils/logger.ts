import { env } from "@configs/env";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  data?: unknown;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[env.LOG_LEVEL];
}

function formatEntry(entry: LogEntry): string {
  if (env.NODE_ENV === "development") {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]${entry.context ? ` [${entry.context}]` : ""}`;
    const suffix = entry.data ? ` ${JSON.stringify(entry.data)}` : "";
    const errorSuffix = entry.error
      ? ` | Error: ${entry.error.message}${entry.error.stack ? `\n${entry.error.stack}` : ""}`
      : "";
    return `${prefix} ${entry.message}${suffix}${errorSuffix}`;
  }
  return JSON.stringify(entry);
}

function createEntry(
  level: LogLevel,
  message: string,
  data?: unknown,
  context?: string,
  error?: Error
): LogEntry {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(context && { context }),
    ...(data !== undefined && { data }),
  };

  if (error) {
    entry.error = {
      message: error.message,
      ...(error.stack && { stack: error.stack }),
      ...((error as NodeJS.ErrnoException).code && {
        code: (error as NodeJS.ErrnoException).code,
      }),
    };
  }

  return entry;
}

function log(level: LogLevel, message: string, data?: unknown, context?: string, error?: Error): void {
  if (!shouldLog(level)) return;

  const entry = createEntry(level, message, data, context, error);
  const formatted = formatEntry(entry);

  if (level === "error") {
    console.error(formatted);
  } else if (level === "warn") {
    console.warn(formatted);
  } else {
    console.warn(formatted);
  }
}

export const logger = {
  debug: (message: string, data?: unknown, context?: string) =>
    log("debug", message, data, context),
  info: (message: string, data?: unknown, context?: string) =>
    log("info", message, data, context),
  warn: (message: string, data?: unknown, context?: string) =>
    log("warn", message, data, context),
  error: (message: string, error?: Error, data?: unknown, context?: string) =>
    log("error", message, data, context, error),
  child: (context: string) => ({
    debug: (message: string, data?: unknown) => log("debug", message, data, context),
    info: (message: string, data?: unknown) => log("info", message, data, context),
    warn: (message: string, data?: unknown) => log("warn", message, data, context),
    error: (message: string, error?: Error, data?: unknown) =>
      log("error", message, data, context, error),
  }),
};
