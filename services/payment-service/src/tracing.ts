import { initTracer } from '@stayflexi/shared-observability'
initTracer('payment-service', { enabled: process.env['OTEL_ENABLED'] !== 'false' })
