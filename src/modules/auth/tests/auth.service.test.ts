/**
 * AuthService unit test structure.
 * Run with: npm test -- --project=api (requires dev server)
 * Replace with Jest/Vitest for true unit tests.
 */
import { test, expect } from "@playwright/test";

const BASE = "/api/v1/auth";

test.describe("AuthService — register", () => {
  const validPayload = {
    email: `test+${Date.now()}@example.com`,
    password: "Password123",
    firstName: "Test",
    lastName: "User",
    organizationName: "Test Organization",
  };

  test("registers new org owner and returns tokens", async ({ request }) => {
    const res = await request.post(`${BASE}/register`, { data: validPayload });
    expect(res.status()).toBe(201);
    const body = await res.json() as { success: boolean; data: { user: unknown; tokens: { accessToken: string; refreshToken: string; expiresIn: number } } };
    expect(body.success).toBe(true);
    expect(body.data.tokens.accessToken).toBeTruthy();
    expect(body.data.tokens.refreshToken).toBeTruthy();
    expect(body.data.tokens.expiresIn).toBeGreaterThan(0);
  });

  test("rejects duplicate email with 409", async ({ request }) => {
    await request.post(`${BASE}/register`, { data: validPayload });
    const res = await request.post(`${BASE}/register`, { data: validPayload });
    expect(res.status()).toBe(409);
    const body = await res.json() as { success: boolean; error: { code: string } };
    expect(body.error.code).toBe("CONFLICT");
  });

  test("rejects weak password with 422", async ({ request }) => {
    const res = await request.post(`${BASE}/register`, {
      data: { ...validPayload, email: `weak+${Date.now()}@example.com`, password: "weak" },
    });
    expect(res.status()).toBe(422);
  });

  test("rejects invalid email with 422", async ({ request }) => {
    const res = await request.post(`${BASE}/register`, {
      data: { ...validPayload, email: "not-an-email" },
    });
    expect(res.status()).toBe(422);
  });

  test("rejects missing organizationName with 422", async ({ request }) => {
    const { organizationName: _, ...payload } = validPayload;
    void _;
    const res = await request.post(`${BASE}/register`, { data: payload });
    expect(res.status()).toBe(422);
  });
});

test.describe("AuthService — login", () => {
  const email = `login+${Date.now()}@example.com`;
  const password = "Password123";

  test.beforeAll(async ({ request }) => {
    await request.post(`${BASE}/register`, {
      data: { email, password, firstName: "Login", lastName: "Test", organizationName: "Login Org" },
    });
  });

  test("returns tokens on valid credentials", async ({ request }) => {
    const res = await request.post(`${BASE}/login`, { data: { email, password } });
    expect(res.status()).toBe(200);
    const body = await res.json() as { data: { tokens: { accessToken: string } } };
    expect(body.data.tokens.accessToken).toBeTruthy();
  });

  test("rejects wrong password with 401", async ({ request }) => {
    const res = await request.post(`${BASE}/login`, { data: { email, password: "WrongPass1" } });
    expect(res.status()).toBe(401);
  });

  test("rejects unknown email with 401", async ({ request }) => {
    const res = await request.post(`${BASE}/login`, {
      data: { email: "nobody@example.com", password },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("AuthService — token rotation", () => {
  let refreshToken = "";
  const email = `refresh+${Date.now()}@example.com`;

  test.beforeAll(async ({ request }) => {
    const reg = await request.post(`${BASE}/register`, {
      data: { email, password: "Password123", firstName: "R", lastName: "T", organizationName: "Refresh Org" },
    });
    const body = await reg.json() as { data: { tokens: { refreshToken: string } } };
    refreshToken = body.data.tokens.refreshToken;
  });

  test("issues new token pair on valid refresh", async ({ request }) => {
    const res = await request.post(`${BASE}/refresh`, { data: { refreshToken } });
    expect(res.status()).toBe(200);
    const body = await res.json() as { data: { tokens: { refreshToken: string } } };
    expect(body.data.tokens.refreshToken).toBeTruthy();
    expect(body.data.tokens.refreshToken).not.toBe(refreshToken);
  });

  test("rejects reused refresh token with 401", async ({ request }) => {
    await request.post(`${BASE}/refresh`, { data: { refreshToken } });
    const res = await request.post(`${BASE}/refresh`, { data: { refreshToken } });
    expect(res.status()).toBe(401);
  });

  test("rejects invalid refresh token with 401", async ({ request }) => {
    const res = await request.post(`${BASE}/refresh`, { data: { refreshToken: "invalid" } });
    expect(res.status()).toBe(401);
  });
});

test.describe("AuthService — /me", () => {
  let accessToken = "";

  test.beforeAll(async ({ request }) => {
    const reg = await request.post(`${BASE}/register`, {
      data: {
        email: `me+${Date.now()}@example.com`,
        password: "Password123",
        firstName: "Me",
        lastName: "Test",
        organizationName: "Me Org",
      },
    });
    const body = await reg.json() as { data: { tokens: { accessToken: string } } };
    accessToken = body.data.tokens.accessToken;
  });

  test("returns authenticated user profile", async ({ request }) => {
    const res = await request.get(`${BASE}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as { data: { email: string; permissionKeys: string[] } };
    expect(body.data.email).toBeTruthy();
    expect(Array.isArray(body.data.permissionKeys)).toBe(true);
  });

  test("rejects request without token with 401", async ({ request }) => {
    const res = await request.get(`${BASE}/me`);
    expect(res.status()).toBe(401);
  });

  test("rejects malformed token with 401", async ({ request }) => {
    const res = await request.get(`${BASE}/me`, {
      headers: { Authorization: "Bearer not.a.jwt" },
    });
    expect(res.status()).toBe(401);
  });
});
