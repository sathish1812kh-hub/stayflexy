import { initTracer } from '@stayflexi/shared-observability'
initTracer('organization-service', { enabled: process.env['OTEL_ENABLED'] !== 'false' })
