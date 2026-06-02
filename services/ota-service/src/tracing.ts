import { initTracer } from '@stayflexi/shared-observability'
initTracer('ota-service', { enabled: process.env['OTEL_ENABLED'] !== 'false' })
