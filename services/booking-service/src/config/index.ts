import { z } from 'zod'
import { loadConfig, baseServiceConfigSchema } from '@stayflexi/shared-config'

const bookingConfigSchema = baseServiceConfigSchema.extend({
  PORT: z.string().default('3005').transform(Number),
  KAFKA_ENABLED: z.string().default('false').transform(v => v === 'true'),
  KAFKA_GROUP_ID: z.string().default('booking-service'),
  BOOKING_LOCK_TTL_MS: z.string().default('30000').transform(Number),
  BOOKING_LOCK_RETRY_COUNT: z.string().default('5').transform(Number),
  BOOKING_LOCK_RETRY_DELAY_MS: z.string().default('200').transform(Number),
  IDEMPOTENCY_TTL_SECONDS: z.string().default('86400').transform(Number),
  BOOKING_CACHE_TTL_SECONDS: z.string().default('300').transform(Number),
  RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('200').transform(Number),
  MAX_ROOMS_PER_BOOKING: z.string().default('10').transform(Number),
  MAX_ADVANCE_BOOKING_DAYS: z.string().default('365').transform(Number),
  GEMINI_API_KEY: z.string().optional(),
})

export type BookingConfig = z.infer<typeof bookingConfigSchema>

export function loadBookingConfig(): BookingConfig {
  return loadConfig(bookingConfigSchema as z.ZodSchema<BookingConfig>, process.env as Record<string, string | undefined>)
}
