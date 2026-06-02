import { initTracer } from '@stayflexi/shared-observability'
initTracer('pricing-engine-service', { enabled: process.env['OTEL_ENABLED'] !== 'false' })
