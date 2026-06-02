import { initTracer } from '@stayflexi/shared-observability'
initTracer('notification-service', { enabled: process.env['OTEL_ENABLED'] !== 'false' })
