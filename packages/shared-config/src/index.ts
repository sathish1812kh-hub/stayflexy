import { z, ZodSchema, ZodError } from 'zod'

export function requireEnv(key: string): string {
  const value = process.env[key]
  if (value === undefined || value === '')
    throw new Error(
      `Required environment variable "${key}" is missing or empty`
    )
  return value
}

export function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue
}

export function loadConfig<T>(
  schema: ZodSchema<T>,
  env: Record<string, string | undefined> = process.env as Record<
    string,
    string | undefined
  >
): T {
  try {
    return schema.parse(env)
  } catch (err) {
    if (err instanceof ZodError) {
      const missing = err.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ')
      throw new Error(`Configuration validation failed: ${missing}`)
    }
    throw err
  }
}

// Base service config schema (extend in each service)
export const baseServiceConfigSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'staging', 'production'])
    .default('development'),
  PORT: z.string().default('3000').transform(Number),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  SERVICE_KEY: z.string().min(1, 'SERVICE_KEY is required'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  KAFKA_BROKERS: z.string().default('localhost:9092'),
  KAFKA_CLIENT_ID: z.string().optional(),
  JAEGER_ENDPOINT: z.string().optional(),
  JAEGER_ENABLED: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
})

export type BaseServiceConfig = z.infer<typeof baseServiceConfigSchema>
