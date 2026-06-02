"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpanKind = exports.SpanStatusCode = exports.context = exports.trace = void 0;
exports.initTracer = initTracer;
exports.withSpan = withSpan;
const sdk_node_1 = require("@opentelemetry/sdk-node");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const exporter_jaeger_1 = require("@opentelemetry/exporter-jaeger");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const api_1 = require("@opentelemetry/api");
Object.defineProperty(exports, "trace", { enumerable: true, get: function () { return api_1.trace; } });
Object.defineProperty(exports, "context", { enumerable: true, get: function () { return api_1.context; } });
Object.defineProperty(exports, "SpanStatusCode", { enumerable: true, get: function () { return api_1.SpanStatusCode; } });
Object.defineProperty(exports, "SpanKind", { enumerable: true, get: function () { return api_1.SpanKind; } });
function initTracer(serviceName, options) {
    if (options?.enabled === false)
        return;
    const exporter = new exporter_jaeger_1.JaegerExporter({
        endpoint: options?.jaegerEndpoint ??
            process.env['JAEGER_ENDPOINT'] ??
            'http://jaeger:14268/api/traces',
    });
    const sdk = new sdk_node_1.NodeSDK({
        resource: new resources_1.Resource({
            [semantic_conventions_1.SEMRESATTRS_SERVICE_NAME]: serviceName,
            [semantic_conventions_1.SEMRESATTRS_SERVICE_VERSION]: '2.0.0',
        }),
        traceExporter: exporter,
        instrumentations: [
            (0, auto_instrumentations_node_1.getNodeAutoInstrumentations)({
                '@opentelemetry/instrumentation-http': { enabled: true },
                '@opentelemetry/instrumentation-express': { enabled: true },
                '@opentelemetry/instrumentation-pg': { enabled: true },
                '@opentelemetry/instrumentation-ioredis': { enabled: true },
            }),
        ],
    });
    sdk.start();
    process.on('SIGTERM', () => {
        void sdk.shutdown();
    });
}
async function withSpan(name, attributes, fn) {
    const tracer = api_1.trace.getTracer('stayflexi');
    return tracer.startActiveSpan(name, { attributes }, async (span) => {
        try {
            const result = await fn();
            span.setStatus({ code: api_1.SpanStatusCode.OK });
            return result;
        }
        catch (error) {
            span.setStatus({
                code: api_1.SpanStatusCode.ERROR,
                message: String(error),
            });
            span.recordException(error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
        finally {
            span.end();
        }
    });
}
