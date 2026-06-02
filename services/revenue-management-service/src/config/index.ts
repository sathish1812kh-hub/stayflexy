import { z } from 'zod'
import { loadConfig, baseServiceConfigSchema } from '@stayflexi/shared-config'

const revenueManagementConfigSchema = baseServiceConfigSchema.extend({
  PORT: z.string().default('3012').transform(Number),
  KAFKA_ENABLED: z.string().default('false').transform(v => v === 'true'),
  KAFKA_CLIENT_ID: z.string().default('revenue-management-service'),
  KAFKA_GROUP_ID: z.string().default('revenue-management-service'),
  REVENUE_CACHE_TTL_SECONDS: z.string().default('600').transform(Number), // 10 min
  RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('300').transform(Number),
  FORECAST_HORIZON_DAYS: z.string().default('90').transform(Number),
  RECOMMENDATION_TTL_HOURS: z.string().default('24').transform(Number),
  SCHEDULER_INTERVAL_MS: z.string().default('3600000').transform(Number),
})

export type RevenueManagementConfig = z.infer<typeof revenueManagementConfigSchema>

export function loadRevenueManagementConfig(): RevenueManagementConfig {
  return loadConfig(revenueManagementConfigSchema as z.ZodSchema<RevenueManagementConfig>, process.env as Record<string, string | undefined>)
}
