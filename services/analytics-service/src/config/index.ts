import { z } from 'zod'
import { loadConfig, baseServiceConfigSchema } from '@stayflexi/shared-config'

const analyticsConfigSchema = baseServiceConfigSchema.extend({
  PORT: z.string().default('3008').transform(Number),
  KAFKA_ENABLED: z.string().default('false').transform(v => v === 'true'),
  ANALYTICS_CACHE_TTL_SECONDS: z.string().default('300').transform(Number),
  RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('300').transform(Number),
})

export type AnalyticsConfig = z.infer<typeof analyticsConfigSchema>
export function loadAnalyticsConfig(): AnalyticsConfig {
  return loadConfig(analyticsConfigSchema as z.ZodSchema<AnalyticsConfig>, process.env as Record<string, string | undefined>)
}
