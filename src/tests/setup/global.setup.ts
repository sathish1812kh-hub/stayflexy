import { chromium, type FullConfig } from "@playwright/test";
import { prisma } from "../../common/lib/prisma";

async function globalSetup(_config: FullConfig): Promise<void> {
  if (process.env["BYPASS_DB_CHECK"] === "true") {
    console.warn("[setup] Bypassing database connection check as BYPASS_DB_CHECK=true.");
    return;
  }
  await verifyDatabaseConnection();
  await seedTestData();
  await warmupServer(_config.projects[0]?.use.baseURL ?? "http://localhost:3000");
}

async function verifyDatabaseConnection(): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.warn("[setup] Database connection verified.");
  } catch (error) {
    console.error("[setup] Database connection failed:", error);
    throw new Error("Test database is not reachable. Ensure PostgreSQL is running.");
  }
}

async function seedTestData(): Promise<void> {
  // Register test seeders here as modules are added
  console.warn("[setup] Test data seeded.");
}

async function warmupServer(baseURL: string): Promise<void> {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const response = await page.request.get(`${baseURL}/api/v1/health`);
    if (!response.ok()) {
      throw new Error(`Server warmup failed: ${response.status()}`);
    }
    console.warn("[setup] Server is ready.");
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;
