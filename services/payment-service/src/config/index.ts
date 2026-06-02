import { z } from 'zod'
import { loadConfig, baseServiceConfigSchema } from '@stayflexi/shared-config'

const paymentConfigSchema = baseServiceConfigSchema.extend({
  PORT: z.string().default('3006').transform(Number),
  KAFKA_ENABLED: z.string().default('false').transform(v => v === 'true'),
  KAFKA_GROUP_ID: z.string().default('payment-service'),
  IDEMPOTENCY_TTL_SECONDS: z.string().default('86400').transform(Number),
  PAYMENT_CACHE_TTL_SECONDS: z.string().default('300').transform(Number),
  INVOICE_CACHE_TTL_SECONDS: z.string().default('600').transform(Number),
  RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),
  MAX_REFUND_DAYS: z.string().default('30').transform(Number),
  DEFAULT_TAX_RATE: z.string().default('0.10').transform(Number),
  WEBHOOK_SECRET: z.string().default('change-this-webhook-secret-in-production'),
})

export type PaymentConfig = z.infer<typeof paymentConfigSchema>

export function loadPaymentConfig(): PaymentConfig {
  return loadConfig(paymentConfigSchema as z.ZodSchema<PaymentConfig>, process.env as Record<string, string | undefined>)
}
