import { initTracer } from '@stayflexi/shared-observability'
initTracer('hotel-service', { enabled: process.env['OTEL_ENABLED'] !== 'false' })
