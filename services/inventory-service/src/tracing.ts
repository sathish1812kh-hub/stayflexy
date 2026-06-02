import { initTracer } from '@stayflexi/shared-observability'
initTracer('inventory-service', { enabled: process.env['OTEL_ENABLED'] !== 'false' })
