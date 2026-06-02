import { initTracer } from '@stayflexi/shared-observability'
initTracer('booking-service', { enabled: process.env['OTEL_ENABLED'] !== 'false' })
