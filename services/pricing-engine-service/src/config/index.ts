import { z } from 'zod'
import { loadConfig, baseServiceConfigSchema } from '@stayflexi/shared-config'

const pricingEngineConfigSchema = baseServiceConfigSchema.extend({
  PORT: z.string().default('3011').transform(Number),
  KAFKA_ENABLED: z.string().default('false').transform(v => v === 'true'),
  KAFKA_CLIENT_ID: z.string().default('pricing-engine-service'),
  KAFKA_GROUP_ID: z.string().default('pricing-engine-service'),
  PRICING_CACHE_TTL_SECONDS: z.string().default('300').transform(Number),
  PRICING_LOCK_TTL_MS: z.string().default('30000').transform(Number),
  PRICING_LOCK_RETRY_COUNT: z.string().default('5').transform(Number),
  RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('500').transform(Number),
  MAX_SURGE_MULTIPLIER: z.string().default('3.0').transform(Number),
  SCHEDULER_INTERVAL_MS: z.string().default('3600000').transform(Number), // 1 hour
  OTA_SYNC_ENABLED: z.string().default('false').transform(v => v === 'true'),
})

export type PricingEngineConfig = z.infer<typeof pricingEngineConfigSchema>

export function loadPricingEngineConfig(): PricingEngineConfig {
  return loadConfig(pricingEngineConfigSchema as z.ZodSchema<PricingEngineConfig>, process.env as Record<string, string | undefined>)
}
