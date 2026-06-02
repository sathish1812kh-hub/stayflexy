import { z } from 'zod'
import { loadConfig, baseServiceConfigSchema } from '@stayflexi/shared-config'

const inventoryConfigSchema = baseServiceConfigSchema.extend({
  PORT: z.string().default('3004').transform(Number),
  KAFKA_ENABLED: z.string().default('false').transform((v) => v === 'true'),
  INVENTORY_CACHE_TTL_SECONDS: z.string().default('60').transform(Number),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('500').transform(Number),
  LOCK_TTL_MS: z.string().default('30000').transform(Number),
  LOCK_RETRY_ATTEMPTS: z.string().default('3').transform(Number),
})

export type InventoryConfig = z.infer<typeof inventoryConfigSchema>
export function loadInventoryConfig(): InventoryConfig {
  return loadConfig(inventoryConfigSchema as z.ZodSchema<InventoryConfig>, process.env as Record<string, string | undefined>)
}
