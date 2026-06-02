import { test, expect } from "../../fixtures/base.fixture";
import { assertSuccess } from "../../helpers/apiAssert";

test.describe("GET /api/v1/health", () => {
  test("returns healthy status with database connected", async ({ apiContext }) => {
    const response = await apiContext.get("/api/v1/health");

    const data = await assertSuccess(response) as {
      status: string;
      version: string;
      environment: string;
      timestamp: string;
      services: { database: string };
    };

    expect(data.status).toBe("healthy");
    expect(data.services.database).toBe("connected");
    expect(data.version).toBeTruthy();
    expect(data.timestamp).toBeTruthy();
  });

  test("returns correct content-type header", async ({ apiContext }) => {
    const response = await apiContext.get("/api/v1/health");
    expect(response.headers()["content-type"]).toContain("application/json");
  });

  test("responds within acceptable time", async ({ apiContext }) => {
    const start = Date.now();
    await apiContext.get("/api/v1/health");
    expect(Date.now() - start).toBeLessThan(3000);
  });
});
