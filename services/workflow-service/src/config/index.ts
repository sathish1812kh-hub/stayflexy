import { z } from 'zod'
import { loadConfig, baseServiceConfigSchema } from '@stayflexi/shared-config'

const workflowConfigSchema = baseServiceConfigSchema.extend({
  PORT: z.string().default('3010').transform(Number),
  KAFKA_ENABLED: z.string().default('false').transform(v => v === 'true'),
  RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('200').transform(Number),
})

export type WorkflowConfig = z.infer<typeof workflowConfigSchema>
export function loadWorkflowConfig(): WorkflowConfig {
  return loadConfig(workflowConfigSchema as z.ZodSchema<WorkflowConfig>, process.env as Record<string, string | undefined>)
}
