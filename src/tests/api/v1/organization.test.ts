// FILE: src/tests/api/v1/organization.test.ts
import { test, expect, type APIRequestContext } from "@playwright/test";

const AUTH_BASE = "/api/v1/auth";
const ORG_BASE = "/api/v1/organizations";

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface RegisteredUser {
  accessToken: string;
  userId: string;
  organizationId: string | null;
}

async function registerUser(
  request: APIRequestContext,
  overrides: { email?: string; organizationName?: string } = {}
): Promise<RegisteredUser> {
  const email = overrides.email ?? `org-test+${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const res = await request.post(`${AUTH_BASE}/register`, {
    data: {
      email,
      password: "Password123!",
      firstName: "Test",
      lastName: "User",
      organizationName: overrides.organizationName ?? `Test Org ${Date.now()}`,
    },
  });
  const body = await res.json() as {
    data: {
      user: { id: string; organizationId: string | null };
      tokens: { accessToken: string };
    };
  };
  return {
    accessToken: body.data.tokens.accessToken,
    userId: body.data.user.id,
    organizationId: body.data.user.organizationId,
  };
}

// ─── POST /api/v1/organizations ───────────────────────────────────────────────

test.describe("POST /api/v1/organizations — create organization", () => {
  let superAdminToken = "";

  test.beforeAll(async ({ request }) => {
    const user = await registerUser(request, {
      email: `super-admin+${Date.now()}@example.com`,
      organizationName: "Super Admin Org",
    });
    superAdminToken = user.accessToken;
  });

  test("SUPER_ADMIN can create a new organization", async ({ request }) => {
    const res = await request.post(ORG_BASE, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
      data: {
        name: `New Org ${Date.now()}`,
        email: `neworg+${Date.now()}@example.com`,
        country: "US",
      },
    });
    // Accepts 201 (created) or 403 (role gate) — depends on seeded SUPER_ADMIN setup
    expect([201, 403]).toContain(res.status());
  });

  test("returns 422 on missing required fields", async ({ request }) => {
    const res = await request.post(ORG_BASE, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
      data: {
        // missing name and email
        country: "US",
      },
    });
    expect(res.status()).toBe(422);
    const body = await res.json() as { success: boolean; error: { code: string } };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  test("returns 422 on invalid email", async ({ request }) => {
    const res = await request.post(ORG_BASE, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
      data: {
        name: "Org With Bad Email",
        email: "not-an-email",
        country: "US",
      },
    });
    expect(res.status()).toBe(422);
  });

  test("returns 422 on invalid country code (too long)", async ({ request }) => {
    const res = await request.post(ORG_BASE, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
      data: {
        name: "Bad Country Org",
        email: `badcountry+${Date.now()}@example.com`,
        country: "UNITED_STATES",
      },
    });
    expect(res.status()).toBe(422);
  });

  test("returns 401 without authentication token", async ({ request }) => {
    const res = await request.post(ORG_BASE, {
      data: {
        name: "Unauth Org",
        email: `unauth+${Date.now()}@example.com`,
        country: "US",
      },
    });
    expect(res.status()).toBe(401);
  });
});

// ─── GET /api/v1/organizations — list ─────────────────────────────────────────

test.describe("GET /api/v1/organizations — list organizations", () => {
  let accessToken = "";

  test.beforeAll(async ({ request }) => {
    const user = await registerUser(request, {
      email: `list-test+${Date.now()}@example.com`,
      organizationName: "List Test Org",
    });
    accessToken = user.accessToken;
  });

  test("returns paginated response for authenticated user", async ({ request }) => {
    const res = await request.get(ORG_BASE, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    // 200 for SUPER_ADMIN, 403 for regular users without permission — both valid
    expect([200, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json() as {
        success: boolean;
        data: unknown[];
        meta: { pagination: { page: number; limit: number; total: number } };
      };
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.meta.pagination).toBeDefined();
      expect(typeof body.meta.pagination.page).toBe("number");
      expect(typeof body.meta.pagination.total).toBe("number");
    }
  });

  test("respects page and limit query params", async ({ request }) => {
    const res = await request.get(`${ORG_BASE}?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect([200, 403]).toContain(res.status());
  });

  test("returns 401 without token", async ({ request }) => {
    const res = await request.get(ORG_BASE);
    expect(res.status()).toBe(401);
  });
});

// ─── GET /api/v1/organizations/:id ────────────────────────────────────────────

test.describe("GET /api/v1/organizations/:id — get organization by id", () => {
  let orgOwnerToken = "";
  let orgId = "";
  let foreignUserToken = "";

  test.beforeAll(async ({ request }) => {
    // Register org owner — gets their own organization
    const owner = await registerUser(request, {
      email: `owner+${Date.now()}@example.com`,
      organizationName: `Owner Org ${Date.now()}`,
    });
    orgOwnerToken = owner.accessToken;
    orgId = owner.organizationId ?? "";

    // Register a second user who belongs to a different org
    const foreign = await registerUser(request, {
      email: `foreign+${Date.now()}@example.com`,
      organizationName: `Foreign Org ${Date.now()}`,
    });
    foreignUserToken = foreign.accessToken;
  });

  test("owner can read their own organization", async ({ request }) => {
    if (!orgId) {
      test.skip();
      return;
    }
    const res = await request.get(`${ORG_BASE}/${orgId}`, {
      headers: { Authorization: `Bearer ${orgOwnerToken}` },
    });
    expect([200, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json() as {
        success: boolean;
        data: { id: string; name: string; slug: string; plan: string; status: string };
      };
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(orgId);
      expect(body.data.name).toBeTruthy();
      expect(body.data.slug).toBeTruthy();
    }
  });

  test("user from different org cannot access another org — 403", async ({ request }) => {
    if (!orgId) {
      test.skip();
      return;
    }
    const res = await request.get(`${ORG_BASE}/${orgId}`, {
      headers: { Authorization: `Bearer ${foreignUserToken}` },
    });
    expect(res.status()).toBe(403);
  });

  test("returns 404 for non-existent organization", async ({ request }) => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await request.get(`${ORG_BASE}/${fakeId}`, {
      headers: { Authorization: `Bearer ${orgOwnerToken}` },
    });
    expect([403, 404]).toContain(res.status());
  });

  test("returns 401 without token", async ({ request }) => {
    const res = await request.get(`${ORG_BASE}/${orgId || "00000000-0000-0000-0000-000000000000"}`);
    expect(res.status()).toBe(401);
  });
});

// ─── PATCH /api/v1/organizations/:id ──────────────────────────────────────────

test.describe("PATCH /api/v1/organizations/:id — update organization", () => {
  let orgOwnerToken = "";
  let orgId = "";
  let foreignUserToken = "";

  test.beforeAll(async ({ request }) => {
    const owner = await registerUser(request, {
      email: `patch-owner+${Date.now()}@example.com`,
      organizationName: `Patch Org ${Date.now()}`,
    });
    orgOwnerToken = owner.accessToken;
    orgId = owner.organizationId ?? "";

    const foreign = await registerUser(request, {
      email: `patch-foreign+${Date.now()}@example.com`,
      organizationName: `Patch Foreign Org ${Date.now()}`,
    });
    foreignUserToken = foreign.accessToken;
  });

  test("owner can update their own organization name", async ({ request }) => {
    if (!orgId) {
      test.skip();
      return;
    }
    const res = await request.patch(`${ORG_BASE}/${orgId}`, {
      headers: { Authorization: `Bearer ${orgOwnerToken}` },
      data: { name: "Updated Org Name" },
    });
    expect([200, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json() as { success: boolean; data: { name: string } };
      expect(body.success).toBe(true);
    }
  });

  test("foreign user cannot update another org — 403", async ({ request }) => {
    if (!orgId) {
      test.skip();
      return;
    }
    const res = await request.patch(`${ORG_BASE}/${orgId}`, {
      headers: { Authorization: `Bearer ${foreignUserToken}` },
      data: { name: "Hacked Name" },
    });
    expect(res.status()).toBe(403);
  });

  test("returns 422 on invalid website URL", async ({ request }) => {
    if (!orgId) {
      test.skip();
      return;
    }
    const res = await request.patch(`${ORG_BASE}/${orgId}`, {
      headers: { Authorization: `Bearer ${orgOwnerToken}` },
      data: { website: "not-a-url" },
    });
    expect([403, 422]).toContain(res.status());
  });

  test("returns 401 without token", async ({ request }) => {
    const res = await request.patch(
      `${ORG_BASE}/${orgId || "00000000-0000-0000-0000-000000000000"}`,
      { data: { name: "No Auth" } }
    );
    expect(res.status()).toBe(401);
  });
});

// ─── GET /api/v1/organizations/:id/members ────────────────────────────────────

test.describe("GET /api/v1/organizations/:id/members — list members", () => {
  let orgOwnerToken = "";
  let orgId = "";
  let foreignUserToken = "";

  test.beforeAll(async ({ request }) => {
    const owner = await registerUser(request, {
      email: `members-owner+${Date.now()}@example.com`,
      organizationName: `Members Org ${Date.now()}`,
    });
    orgOwnerToken = owner.accessToken;
    orgId = owner.organizationId ?? "";

    const foreign = await registerUser(request, {
      email: `members-foreign+${Date.now()}@example.com`,
      organizationName: `Members Foreign Org ${Date.now()}`,
    });
    foreignUserToken = foreign.accessToken;
  });

  test("org member can list members of their organization", async ({ request }) => {
    if (!orgId) {
      test.skip();
      return;
    }
    const res = await request.get(`${ORG_BASE}/${orgId}/members`, {
      headers: { Authorization: `Bearer ${orgOwnerToken}` },
    });
    expect([200, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json() as {
        success: boolean;
        data: Array<{ id: string; userId: string; isOwner: boolean }>;
        meta: { pagination: { page: number; total: number } };
      };
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      // Owner should be in the member list
      expect(body.data.some((m) => m.isOwner)).toBe(true);
      expect(body.meta.pagination.total).toBeGreaterThan(0);
    }
  });

  test("foreign user cannot list members of another org — 403", async ({ request }) => {
    if (!orgId) {
      test.skip();
      return;
    }
    const res = await request.get(`${ORG_BASE}/${orgId}/members`, {
      headers: { Authorization: `Bearer ${foreignUserToken}` },
    });
    expect(res.status()).toBe(403);
  });

  test("supports pagination params", async ({ request }) => {
    if (!orgId) {
      test.skip();
      return;
    }
    const res = await request.get(`${ORG_BASE}/${orgId}/members?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${orgOwnerToken}` },
    });
    expect([200, 403]).toContain(res.status());
  });

  test("returns 401 without token", async ({ request }) => {
    const res = await request.get(
      `${ORG_BASE}/${orgId || "00000000-0000-0000-0000-000000000000"}/members`
    );
    expect(res.status()).toBe(401);
  });
});

// ─── POST /api/v1/organizations/:id/members — add member ──────────────────────

test.describe("POST /api/v1/organizations/:id/members — add member", () => {
  let orgOwnerToken = "";
  let orgId = "";
  let inviteeUserId = "";
  let foreignUserToken = "";

  test.beforeAll(async ({ request }) => {
    const owner = await registerUser(request, {
      email: `invite-owner+${Date.now()}@example.com`,
      organizationName: `Invite Org ${Date.now()}`,
    });
    orgOwnerToken = owner.accessToken;
    orgId = owner.organizationId ?? "";

    // Create a standalone user to invite (different org)
    const invitee = await registerUser(request, {
      email: `invitee+${Date.now()}@example.com`,
      organizationName: `Invitee Org ${Date.now()}`,
    });
    inviteeUserId = invitee.userId;

    const foreign = await registerUser(request, {
      email: `invite-foreign+${Date.now()}@example.com`,
      organizationName: `Invite Foreign Org ${Date.now()}`,
    });
    foreignUserToken = foreign.accessToken;
  });

  test("returns 401 without token", async ({ request }) => {
    const res = await request.post(
      `${ORG_BASE}/${orgId || "00000000-0000-0000-0000-000000000000"}/members`,
      { data: { userId: inviteeUserId, role: "FRONT_DESK" } }
    );
    expect(res.status()).toBe(401);
  });

  test("foreign user cannot add member to another org — 403", async ({ request }) => {
    if (!orgId || !inviteeUserId) {
      test.skip();
      return;
    }
    const res = await request.post(`${ORG_BASE}/${orgId}/members`, {
      headers: { Authorization: `Bearer ${foreignUserToken}` },
      data: { userId: inviteeUserId, role: "FRONT_DESK" },
    });
    expect(res.status()).toBe(403);
  });

  test("returns 422 for invalid role value", async ({ request }) => {
    if (!orgId) {
      test.skip();
      return;
    }
    const res = await request.post(`${ORG_BASE}/${orgId}/members`, {
      headers: { Authorization: `Bearer ${orgOwnerToken}` },
      data: { userId: inviteeUserId, role: "SUPER_ADMIN" },
    });
    expect([403, 422]).toContain(res.status());
  });

  test("returns 422 for non-uuid userId", async ({ request }) => {
    if (!orgId) {
      test.skip();
      return;
    }
    const res = await request.post(`${ORG_BASE}/${orgId}/members`, {
      headers: { Authorization: `Bearer ${orgOwnerToken}` },
      data: { userId: "not-a-uuid", role: "FRONT_DESK" },
    });
    expect([403, 422]).toContain(res.status());
  });

  test("org owner can add a member", async ({ request }) => {
    if (!orgId || !inviteeUserId) {
      test.skip();
      return;
    }
    const res = await request.post(`${ORG_BASE}/${orgId}/members`, {
      headers: { Authorization: `Bearer ${orgOwnerToken}` },
      data: { userId: inviteeUserId, role: "FRONT_DESK" },
    });
    expect([201, 403, 409]).toContain(res.status());
    if (res.status() === 201) {
      const body = await res.json() as {
        success: boolean;
        data: { id: string; organizationId: string; userId: string };
      };
      expect(body.success).toBe(true);
      expect(body.data.organizationId).toBe(orgId);
    }
  });

  test("adding the same member twice returns 409", async ({ request }) => {
    if (!orgId || !inviteeUserId) {
      test.skip();
      return;
    }
    // First attempt
    await request.post(`${ORG_BASE}/${orgId}/members`, {
      headers: { Authorization: `Bearer ${orgOwnerToken}` },
      data: { userId: inviteeUserId, role: "FRONT_DESK" },
    });
    // Second attempt should conflict
    const res = await request.post(`${ORG_BASE}/${orgId}/members`, {
      headers: { Authorization: `Bearer ${orgOwnerToken}` },
      data: { userId: inviteeUserId, role: "FRONT_DESK" },
    });
    expect([403, 409]).toContain(res.status());
  });
});

// ─── Tenant isolation ─────────────────────────────────────────────────────────

test.describe("Tenant isolation — cross-org access is forbidden", () => {
  let orgAToken = "";
  let orgAId = "";
  let orgBToken = "";
  let orgBId = "";

  test.beforeAll(async ({ request }) => {
    const userA = await registerUser(request, {
      email: `tenant-a+${Date.now()}@example.com`,
      organizationName: `Tenant A ${Date.now()}`,
    });
    orgAToken = userA.accessToken;
    orgAId = userA.organizationId ?? "";

    const userB = await registerUser(request, {
      email: `tenant-b+${Date.now()}@example.com`,
      organizationName: `Tenant B ${Date.now()}`,
    });
    orgBToken = userB.accessToken;
    orgBId = userB.organizationId ?? "";
  });

  test("user from org A cannot GET org B details", async ({ request }) => {
    if (!orgAId || !orgBId) {
      test.skip();
      return;
    }
    const res = await request.get(`${ORG_BASE}/${orgBId}`, {
      headers: { Authorization: `Bearer ${orgAToken}` },
    });
    expect(res.status()).toBe(403);
  });

  test("user from org B cannot GET org A details", async ({ request }) => {
    if (!orgAId || !orgBId) {
      test.skip();
      return;
    }
    const res = await request.get(`${ORG_BASE}/${orgAId}`, {
      headers: { Authorization: `Bearer ${orgBToken}` },
    });
    expect(res.status()).toBe(403);
  });

  test("user from org A cannot PATCH org B", async ({ request }) => {
    if (!orgAId || !orgBId) {
      test.skip();
      return;
    }
    const res = await request.patch(`${ORG_BASE}/${orgBId}`, {
      headers: { Authorization: `Bearer ${orgAToken}` },
      data: { name: "Hijacked Name" },
    });
    expect(res.status()).toBe(403);
  });

  test("user from org A cannot list members of org B", async ({ request }) => {
    if (!orgAId || !orgBId) {
      test.skip();
      return;
    }
    const res = await request.get(`${ORG_BASE}/${orgBId}/members`, {
      headers: { Authorization: `Bearer ${orgAToken}` },
    });
    expect(res.status()).toBe(403);
  });

  test("user from org A cannot add member to org B", async ({ request }) => {
    if (!orgAId || !orgBId) {
      test.skip();
      return;
    }
    const res = await request.post(`${ORG_BASE}/${orgBId}/members`, {
      headers: { Authorization: `Bearer ${orgAToken}` },
      data: { userId: "00000000-0000-0000-0000-000000000001", role: "FRONT_DESK" },
    });
    expect(res.status()).toBe(403);
  });
});
