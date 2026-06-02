// Centralized, validated configuration for production deployment.
// All env vars accessed through this singleton — never via process.env directly in modules.

interface DatabaseConfig {
  url: string;
  maxConnections: number;
  connectionTimeout: number;
}

interface JwtConfig {
  secret: string;
  expiresIn: string;
  refreshExpiresIn: string;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests: boolean;
}

interface AppConfigShape {
  env: "development" | "test" | "production";
  port: number;
  database: DatabaseConfig;
  jwt: JwtConfig;
  rateLimit: RateLimitConfig;
  corsOrigins: string[];
  logLevel: "debug" | "info" | "warn" | "error";
}

function getEnv(key: string, fallback?: string): string {
  const val = process.env[key] ?? fallback;
  if (val === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return val;
}

function getEnvInt(key: string, fallback: number): number {
  const val = process.env[key];
  if (val === undefined) return fallback;
  const n = parseInt(val, 10);
  if (isNaN(n)) throw new Error(`Environment variable ${key} must be an integer`);
  return n;
}

function buildConfig(): AppConfigShape {
  const env = (process.env["NODE_ENV"] ?? "development") as AppConfigShape["env"];

  return {
    env,
    port: getEnvInt("PORT", 3000),
    database: {
      url: getEnv("DATABASE_URL"),
      maxConnections: getEnvInt("DB_MAX_CONNECTIONS", 10),
      connectionTimeout: getEnvInt("DB_CONNECTION_TIMEOUT", 5000),
    },
    jwt: {
      secret: getEnv("JWT_SECRET"),
      expiresIn: getEnv("JWT_EXPIRES_IN", "15m"),
      refreshExpiresIn: getEnv("JWT_REFRESH_EXPIRES_IN", "7d"),
    },
    rateLimit: {
      windowMs: getEnvInt("RATE_LIMIT_WINDOW_MS", 60_000),
      maxRequests: getEnvInt("RATE_LIMIT_MAX_REQUESTS", 100),
      skipSuccessfulRequests: process.env["RATE_LIMIT_SKIP_SUCCESS"] === "true",
    },
    corsOrigins: (process.env["CORS_ORIGINS"] ?? "http://localhost:3000").split(","),
    logLevel: (process.env["LOG_LEVEL"] ?? (env === "production" ? "info" : "debug")) as AppConfigShape["logLevel"],
  };
}

// Lazy singleton — only validated once at first access.
let _config: AppConfigShape | null = null;

export function getAppConfig(): AppConfigShape {
  if (!_config) {
    _config = buildConfig();
  }
  return _config;
}

export type { AppConfigShape, DatabaseConfig, JwtConfig, RateLimitConfig };
