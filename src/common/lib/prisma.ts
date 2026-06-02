import { PrismaClient } from "@prisma/client";
import { env } from "@configs/env";

declare global {
  var __prisma: PrismaClient | undefined; // required for singleton pattern in dev hot-reload
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      env.NODE_ENV === "development"
        ? ["query", "info", "warn", "error"]
        : ["warn", "error"],
    errorFormat: env.NODE_ENV === "development" ? "pretty" : "minimal",
  });
}

export const prisma: PrismaClient =
  globalThis.__prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
