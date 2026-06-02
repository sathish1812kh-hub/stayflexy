import { z, ZodSchema } from 'zod';
export declare function requireEnv(key: string): string;
export declare function optionalEnv(key: string, defaultValue: string): string;
export declare function loadConfig<T>(schema: ZodSchema<T>, env?: Record<string, string | undefined>): T;
export declare const baseServiceConfigSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "staging", "production"]>>;
    PORT: z.ZodEffects<z.ZodDefault<z.ZodString>, number, string | undefined>;
    DATABASE_URL: z.ZodString;
    REDIS_URL: z.ZodDefault<z.ZodString>;
    SERVICE_KEY: z.ZodString;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["debug", "info", "warn", "error"]>>;
    KAFKA_BROKERS: z.ZodDefault<z.ZodString>;
    KAFKA_CLIENT_ID: z.ZodOptional<z.ZodString>;
    JAEGER_ENDPOINT: z.ZodOptional<z.ZodString>;
    JAEGER_ENABLED: z.ZodEffects<z.ZodDefault<z.ZodString>, boolean, string | undefined>;
}, "strip", z.ZodTypeAny, {
    NODE_ENV: "development" | "staging" | "production";
    PORT: number;
    DATABASE_URL: string;
    REDIS_URL: string;
    SERVICE_KEY: string;
    LOG_LEVEL: "debug" | "info" | "warn" | "error";
    KAFKA_BROKERS: string;
    JAEGER_ENABLED: boolean;
    KAFKA_CLIENT_ID?: string | undefined;
    JAEGER_ENDPOINT?: string | undefined;
}, {
    DATABASE_URL: string;
    SERVICE_KEY: string;
    NODE_ENV?: "development" | "staging" | "production" | undefined;
    PORT?: string | undefined;
    REDIS_URL?: string | undefined;
    LOG_LEVEL?: "debug" | "info" | "warn" | "error" | undefined;
    KAFKA_BROKERS?: string | undefined;
    KAFKA_CLIENT_ID?: string | undefined;
    JAEGER_ENDPOINT?: string | undefined;
    JAEGER_ENABLED?: string | undefined;
}>;
export type BaseServiceConfig = z.infer<typeof baseServiceConfigSchema>;
