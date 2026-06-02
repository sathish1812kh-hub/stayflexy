import { initTracer } from '@stayflexi/shared-observability'
initTracer('workflow-service', { enabled: process.env['OTEL_ENABLED'] !== 'false' })
