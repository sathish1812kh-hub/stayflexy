import { initTracer } from '@stayflexi/shared-observability'
initTracer('revenue-management-service', { enabled: process.env['OTEL_ENABLED'] !== 'false' })
