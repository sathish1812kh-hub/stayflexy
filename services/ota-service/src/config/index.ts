import { z } from 'zod'
import { loadConfig, baseServiceConfigSchema } from '@stayflexi/shared-config'

const otaConfigSchema = baseServiceConfigSchema.extend({
  PORT: z.string().default('3007').transform(Number),
  KAFKA_ENABLED: z.string().default('false').transform(v => v === 'true'),
  OTA_SYNC_INTERVAL_MS: z.string().default('300000').transform(Number),
  RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('200').transform(Number),
})

export type OtaConfig = z.infer<typeof otaConfigSchema>
export function loadOtaConfig(): OtaConfig {
  return loadConfig(otaConfigSchema as z.ZodSchema<OtaConfig>, process.env as Record<string, string | undefined>)
}
