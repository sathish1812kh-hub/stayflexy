import { z } from 'zod';

// ─── Service name union ───────────────────────────────────────────────────────

export type ServiceName =
  | 'auth-service'
  | 'organization-service'
  | 'hotel-service'
  | 'inventory-service'
  | 'booking-service'
  | 'payment-service'
  | 'ota-service'
  | 'analytics-service'
  | 'notification-service'
  | 'workflow-service'
  | 'api-gateway';

// ─── Service ports ────────────────────────────────────────────────────────────

export const SERVICE_PORTS: Record<ServiceName, number> = {
  'api-gateway': 8080,
  'auth-service': 3001,
  'organization-service': 3002,
  'hotel-service': 3003,
  'inventory-service': 3004,
  'booking-service': 3005,
  'payment-service': 3006,
  'ota-service': 3007,
  'analytics-service': 3008,
  'notification-service': 3009,
  'workflow-service': 3010,
};

// ─── Service configuration ────────────────────────────────────────────────────

export interface ServiceConfig {
  port: number;
  serviceName: ServiceName;
  environment: 'development' | 'staging' | 'production';
  databaseUrl: string;
  redisUrl: string;
  jwtSecret: string;
  /** Secret used for service-to-service authentication */
  serviceKey: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  tracingEnabled: boolean;
  jaegerEndpoint?: string;
}

// ─── Auth context ─────────────────────────────────────────────────────────────

export interface AuthContext {
  userId: string;
  organizationId?: string;
  primaryRole: string;
  correlationId: string;
  /** True when the caller is another internal service using the service key */
  isServiceCall: boolean;
}

// ─── Header extraction ────────────────────────────────────────────────────────

function getFirstHeaderValue(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const value = headers[name];
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return value[0];
  return value;
}

export function extractAuthContext(
  headers: Record<string, string | string[] | undefined>,
): AuthContext | null {
  const userId = getFirstHeaderValue(headers, 'x-user-id');
  const serviceKey = getFirstHeaderValue(headers, 'x-service-key');
  const correlationId =
    getFirstHeaderValue(headers, 'x-correlation-id') ?? 'unknown';

  // A valid service-to-service call must carry x-service-key
  const isServiceCall =
    serviceKey !== undefined && serviceKey.length > 0 && userId === undefined;

  if (userId === undefined && !isServiceCall) {
    return null;
  }

  return {
    userId: userId ?? 'service',
    organizationId: getFirstHeaderValue(headers, 'x-organization-id'),
    primaryRole: getFirstHeaderValue(headers, 'x-user-role') ?? 'service',
    correlationId,
    isServiceCall,
  };
}

// ─── Zod schema for env-based config loading ──────────────────────────────────

const ServiceConfigEnvSchema = z.object({
  PORT: z.string().optional(),
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  SERVICE_KEY: z.string().min(1, 'SERVICE_KEY is required'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  TRACING_ENABLED: z.string().optional(),
  JAEGER_ENDPOINT: z.string().optional(),
});

export function loadServiceConfig(serviceName: ServiceName): ServiceConfig {
  const parsed = ServiceConfigEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.message).join('; ');
    throw new Error(`Service configuration validation failed: ${missing}`);
  }

  const env = parsed.data;
  const defaultPort = SERVICE_PORTS[serviceName];
  const port = env['PORT'] !== undefined ? parseInt(env['PORT'], 10) : defaultPort;

  return {
    port,
    serviceName,
    environment: env['NODE_ENV'],
    databaseUrl: env['DATABASE_URL'],
    redisUrl: env['REDIS_URL'],
    jwtSecret: env['JWT_SECRET'],
    serviceKey: env['SERVICE_KEY'],
    logLevel: env['LOG_LEVEL'],
    tracingEnabled: env['TRACING_ENABLED'] === 'true',
    ...(env['JAEGER_ENDPOINT'] !== undefined
      ? { jaegerEndpoint: env['JAEGER_ENDPOINT'] }
      : {}),
  };
}
