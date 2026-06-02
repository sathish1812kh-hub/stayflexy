import { type NextRequest } from "next/server";
import { prisma } from "@lib/prisma";
import { successResponse } from "@utils/apiResponse";
import { handleRouteError } from "@middleware/errorHandler";
import { appConfig } from "@configs/app";

export async function GET(_req: NextRequest) {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return successResponse({
      status: "healthy",
      version: appConfig.version,
      environment: process.env["NODE_ENV"],
      timestamp: new Date().toISOString(),
      services: {
        database: "connected",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
