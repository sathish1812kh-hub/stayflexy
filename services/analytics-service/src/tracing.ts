import { initTracer } from '@stayflexi/shared-observability'
initTracer('analytics-service', { enabled: process.env['OTEL_ENABLED'] !== 'false' })
