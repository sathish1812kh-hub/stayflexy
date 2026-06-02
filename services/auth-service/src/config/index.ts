import { z } from 'zod'
import { loadConfig, baseServiceConfigSchema } from '@stayflexi/shared-config'

const authConfigSchema = baseServiceConfigSchema.extend({
  PORT: z.string().default('3001').transform(Number),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_ROUNDS: z.string().default('12').transform(Number),
  KAFKA_ENABLED: z.string().default('false').transform(v => v === 'true'),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),
  BRUTE_FORCE_MAX_ATTEMPTS: z.string().default('5').transform(Number),
  BRUTE_FORCE_WINDOW_SECONDS: z.string().default('900').transform(Number),
})

export type AuthConfig = z.infer<typeof authConfigSchema>

export function loadAuthConfig(): AuthConfig {
  return loadConfig(authConfigSchema as any, process.env as Record<string, string | undefined>)
}
