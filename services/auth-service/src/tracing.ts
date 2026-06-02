import { initTracer } from '@stayflexi/shared-observability'
initTracer('auth-service', { enabled: process.env['OTEL_ENABLED'] !== 'false' })
