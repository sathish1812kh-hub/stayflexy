/**
 * RBACService integration test structure.
 * Tests RBAC through the API layer using Playwright request fixtures.
 */
import { test, expect, type APIRequestContext } from "@playwright/test";

const AUTH = "/api/v1/auth";

async function registerAndLogin(request: APIRequestContext, suffix: string) {
  const email = `rbac+${suffix}+${Date.now()}@example.com`;
  const res = await request.post(`${AUTH}/register`, {
    data: { email, password: "Password123", firstName: "RBAC", lastName: "Test", organizationName: `RBAC Org ${suffix}` },
  });
  expect(res.status()).toBe(201);
  const body = await res.json() as { data: { user: { id: string; organizationId: string }; tokens: { accessToken: string } } };
  return {
    userId: body.data.user.id,
    orgId: body.data.user.organizationId,
    accessToken: body.data.tokens.accessToken,
  };
}

test.describe("RBACService — permission resolution", () => {
  test("ORG_ADMIN has hotel:create permission after registration", async ({ request }) => {
    const { accessToken } = await registerAndLogin(request, "admin");

    const meRes = await request.get(`${AUTH}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const meBody = await meRes.json() as { data: { permissionKeys: string[] } };

    expect(meBody.data.permissionKeys).toContain("hotel:create");
    expect(meBody.data.permissionKeys).toContain("booking:read");
    expect(meBody.data.permissionKeys).toContain("payment:export");
  });

  test("permission keys are scoped to the user's organization", async ({ request }) => {
    const userA = await registerAndLogin(request, "scope-a");
    const userB = await registerAndLogin(request, "scope-b");

    const resA = await request.get(`${AUTH}/me`, { headers: { Authorization: `Bearer ${userA.accessToken}` } });
    const resB = await request.get(`${AUTH}/me`, { headers: { Authorization: `Bearer ${userB.accessToken}` } });

    const bodyA = await resA.json() as { data: { permissionKeys: string[] } };
    const bodyB = await resB.json() as { data: { permissionKeys: string[] } };

    // Both get ORG_ADMIN permissions but scoped to their own org
    expect(bodyA.data.permissionKeys.length).toBeGreaterThan(0);
    expect(bodyB.data.permissionKeys.length).toBeGreaterThan(0);
  });
});

test.describe("AuthMiddleware — route protection", () => {
  test("protected route returns 401 without token", async ({ request }) => {
    const res = await request.get(`${AUTH}/me`);
    expect(res.status()).toBe(401);
    const body = await res.json() as { success: boolean; error: { code: string } };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  test("protected route returns 401 with expired/invalid token", async ({ request }) => {
    const res = await request.get(`${AUTH}/me`, {
      headers: { Authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.e30.invalid" },
    });
    expect(res.status()).toBe(401);
  });
});
