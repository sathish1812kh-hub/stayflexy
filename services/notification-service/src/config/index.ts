import { z } from 'zod'
import { loadConfig, baseServiceConfigSchema } from '@stayflexi/shared-config'

const notificationConfigSchema = baseServiceConfigSchema.extend({
  PORT: z.string().default('3009').transform(Number),
  KAFKA_ENABLED: z.string().default('false').transform(v => v === 'true'),
  EMAIL_FROM: z.string().default('noreply@stayflexi.com'),
  RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('200').transform(Number),
})

export type NotificationConfig = z.infer<typeof notificationConfigSchema>
export function loadNotificationConfig(): NotificationConfig {
  return loadConfig(notificationConfigSchema as z.ZodSchema<NotificationConfig>, process.env as Record<string, string | undefined>)
}
