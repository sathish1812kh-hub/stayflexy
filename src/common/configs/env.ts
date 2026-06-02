import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.preprocess(
    (val) => (val === "dev" ? "development" : val),
    z.enum(["development", "test", "production"])
  ).default("development"),
  APP_NAME: z.string().min(1),
  APP_VERSION: z.string().min(1),
  APP_PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().url(),
  DATABASE_POOL_SIZE: z.coerce.number().int().positive().default(10),
  DATABASE_CONNECTION_TIMEOUT: z.coerce.number().int().positive().default(30000),

  JWT_SECRET: z.string().min(64),
  JWT_ACCESS_TOKEN_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),

  API_BASE_URL: z.string().url(),
  API_VERSION: z.string().default("v1"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),

  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.errors
      .map((e) => `  ${e.path.join(".")}: ${e.message}`)
      .join("\n");
    throw new Error(`Environment validation failed:\n${formatted}`);
  }

  return result.data;
}

export const env = validateEnv();
