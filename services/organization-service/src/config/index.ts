import { z } from 'zod'
import { loadConfig, baseServiceConfigSchema } from '@stayflexi/shared-config'

const orgConfigSchema = baseServiceConfigSchema.extend({
  PORT: z.string().default('3002').transform(Number),
  KAFKA_ENABLED: z.string().default('false').transform((v) => v === 'true'),
  ORGANIZATION_CACHE_TTL: z.string().default('300').transform(Number),
  MAX_MEMBERS_PER_ORG: z.string().default('500').transform(Number),
})

export type OrgConfig = z.infer<typeof orgConfigSchema>

export function loadOrgConfig(): OrgConfig {
  return loadConfig(orgConfigSchema as z.ZodSchema<OrgConfig>, process.env as Record<string, string | undefined>)
}
