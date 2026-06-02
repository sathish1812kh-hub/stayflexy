import { prisma } from "../../common/lib/prisma";

async function globalTeardown(): Promise<void> {
  if (process.env["BYPASS_DB_CHECK"] === "true") {
    console.warn("[teardown] Bypassing cleanup as BYPASS_DB_CHECK=true.");
    return;
  }
  await cleanTestData();
  await prisma.$disconnect();
  console.warn("[teardown] Test cleanup complete.");
}

async function cleanTestData(): Promise<void> {
  // Register cleanup logic here as modules are added
}

export default globalTeardown;
