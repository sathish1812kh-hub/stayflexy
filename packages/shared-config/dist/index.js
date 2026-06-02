"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseServiceConfigSchema = void 0;
exports.requireEnv = requireEnv;
exports.optionalEnv = optionalEnv;
exports.loadConfig = loadConfig;
const zod_1 = require("zod");
function requireEnv(key) {
    const value = process.env[key];
    if (value === undefined || value === '')
        throw new Error(`Required environment variable "${key}" is missing or empty`);
    return value;
}
function optionalEnv(key, defaultValue) {
    return process.env[key] ?? defaultValue;
}
function loadConfig(schema, env = process.env) {
    try {
        return schema.parse(env);
    }
    catch (err) {
        if (err instanceof zod_1.ZodError) {
            const missing = err.errors
                .map((e) => `${e.path.join('.')}: ${e.message}`)
                .join(', ');
            throw new Error(`Configuration validation failed: ${missing}`);
        }
        throw err;
    }
}
// Base service config schema (extend in each service)
exports.baseServiceConfigSchema = zod_1.z.object({
    NODE_ENV: zod_1.z
        .enum(['development', 'staging', 'production'])
        .default('development'),
    PORT: zod_1.z.string().default('3000').transform(Number),
    DATABASE_URL: zod_1.z.string().min(1, 'DATABASE_URL is required'),
    REDIS_URL: zod_1.z.string().default('redis://localhost:6379'),
    SERVICE_KEY: zod_1.z.string().min(1, 'SERVICE_KEY is required'),
    LOG_LEVEL: zod_1.z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    KAFKA_BROKERS: zod_1.z.string().default('localhost:9092'),
    KAFKA_CLIENT_ID: zod_1.z.string().optional(),
    JAEGER_ENDPOINT: zod_1.z.string().optional(),
    JAEGER_ENABLED: zod_1.z
        .string()
        .default('false')
        .transform((v) => v === 'true'),
});
