import { env } from "./env";

export const appConfig = {
  name: env.APP_NAME,
  version: env.APP_VERSION,
  port: env.APP_PORT,
  isDevelopment: env.NODE_ENV === "development",
  isProduction: env.NODE_ENV === "production",
  isTest: env.NODE_ENV === "test",
  api: {
    baseUrl: env.API_BASE_URL,
    version: env.API_VERSION,
    rateLimit: {
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    },
  },
  auth: {
    jwtSecret: env.JWT_SECRET,
    accessTokenExpiresIn: env.JWT_ACCESS_TOKEN_EXPIRES_IN,
    refreshTokenExpiresIn: env.JWT_REFRESH_TOKEN_EXPIRES_IN,
  },
  logging: {
    level: env.LOG_LEVEL,
  },
} as const;
