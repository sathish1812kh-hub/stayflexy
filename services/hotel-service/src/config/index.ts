import { z } from 'zod'
import { loadConfig, baseServiceConfigSchema } from '@stayflexi/shared-config'

const hotelConfigSchema = baseServiceConfigSchema.extend({
  PORT: z.string().default('3003').transform(Number),
  KAFKA_ENABLED: z.string().default('false').transform(v => v === 'true'),
  HOTEL_CACHE_TTL_SECONDS: z.string().default('300').transform(Number),
  RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('200').transform(Number),
})

export type HotelConfig = z.infer<typeof hotelConfigSchema>
export function loadHotelConfig(): HotelConfig {
  return loadConfig(hotelConfigSchema as z.ZodSchema<HotelConfig>, process.env as Record<string, string | undefined>)
}
