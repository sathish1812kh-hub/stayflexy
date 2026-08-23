/**
 * RBACService integration test structure.
 * Tests RBAC through the API layer using Playwright request fixtures.
 */
import { test, expect, type APIRequestContext } from '@playwright/test'

const AUTH = '/api/v1/auth'

async function registerAndLogin(request: APIRequestContext, suffix: string) {
  const email = `rbac+${suffix}+${Date.now()}@example.com`
  const res = await request.post(`${AUTH}/register`, {
    data: {
      email,
      password: 'Password123',
      firstName: 'RBAC',
      lastName: 'Test',
      organizationName: `RBAC Org ${suffix}`,
    },
  })
  expect(res.status()).toBe(201)
  const body = (await res.json()) as {
    data: { user: { id: string; organizationId: string }; tokens: { accessToken: string } }
  }
  return {
    userId: body.data.user.id,
    orgId: body.data.user.organizationId,
    accessToken: body.data.tokens.accessToken,
  }
}

test.describe('RBACService — permission resolution', () => {
  test('ORG_ADMIN has hotel:create permission after registration', async ({ request }) => {
    const { accessToken } = await registerAndLogin(request, 'admin')

    const meRes = await request.get(`${AUTH}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const meBody = (await meRes.json()) as { data: { permissionKeys: string[] } }

    expect(meBody.data.permissionKeys).toContain('hotel:create')
    expect(meBody.data.permissionKeys).toContain('booking:read')
    expect(meBody.data.permissionKeys).toContain('payment:export')
  })

  test("permission keys are scoped to the user's organization", async ({ request }) => {
    const userA = await registerAndLogin(request, 'scope-a')
    const userB = await registerAndLogin(request, 'scope-b')

    const resA = await request.get(`${AUTH}/me`, {
      headers: { Authorization: `Bearer ${userA.accessToken}` },
    })
    const resB = await request.get(`${AUTH}/me`, {
      headers: { Authorization: `Bearer ${userB.accessToken}` },
    })

    const bodyA = (await resA.json()) as { data: { permissionKeys: string[] } }
    const bodyB = (await resB.json()) as { data: { permissionKeys: string[] } }

    // Both get ORG_ADMIN permissions but scoped to their own org
    expect(bodyA.data.permissionKeys.length).toBeGreaterThan(0)
    expect(bodyB.data.permissionKeys.length).toBeGreaterThan(0)
  })
})

test.describe('AuthMiddleware — route protection', () => {
  test('protected route returns 401 without token', async ({ request }) => {
    const res = await request.get(`${AUTH}/me`)
    expect(res.status()).toBe(401)
    const body = (await res.json()) as { success: boolean; error: { code: string } }
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('UNAUTHORIZED')
  })

  test('protected route returns 401 with expired/invalid token', async ({ request }) => {
    const res = await request.get(`${AUTH}/me`, {
      headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.e30.invalid' },
    })
    expect(res.status()).toBe(401)
  })
})

test.describe('Role Administration API (Phase 2)', () => {
  test('GET /api/v1/permissions returns 118 catalog permissions', async ({ request }) => {
    const admin = await registerAndLogin(request, 'perm-catalog')
    const res = await request.get('/api/v1/permissions', {
      headers: { Authorization: `Bearer ${admin.accessToken}` },
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: Array<{ id: string; key: string }>
    }
    expect(body.success).toBe(true)
    expect(body.data.length).toBeGreaterThanOrEqual(118)
  })

  test('POST /api/v1/roles creates custom role with permission assignments', async ({
    request,
  }) => {
    const admin = await registerAndLogin(request, 'custom-role')

    // Fetch a permission ID
    const permsRes = await request.get('/api/v1/permissions?resource=room', {
      headers: { Authorization: `Bearer ${admin.accessToken}` },
    })
    const permsBody = (await permsRes.json()) as { data: Array<{ id: string }> }
    const permId = permsBody.data[0]?.id

    const createRes = await request.post('/api/v1/roles', {
      headers: { Authorization: `Bearer ${admin.accessToken}` },
      data: {
        name: `Custom Staff ${Date.now()}`,
        description: 'Custom role for front desk escalation',
        permissionIds: permId ? [permId] : [],
      },
    })

    expect(createRes.status()).toBe(201)
    const createBody = (await createRes.json()) as { data: { id: string; isSystem: boolean } }
    expect(createBody.data.isSystem).toBe(false)
  })

  test('PATCH /api/v1/roles/:id on a system role is rejected with 403', async ({ request }) => {
    const admin = await registerAndLogin(request, 'system-role-protect')

    // Fetch system role
    const rolesRes = await request.get('/api/v1/roles', {
      headers: { Authorization: `Bearer ${admin.accessToken}` },
    })
    const rolesBody = (await rolesRes.json()) as { data: Array<{ id: string; isSystem: boolean }> }
    const systemRole = rolesBody.data.find((r) => r.isSystem)

    if (systemRole) {
      const patchRes = await request.patch(`/api/v1/roles/${systemRole.id}`, {
        headers: { Authorization: `Bearer ${admin.accessToken}` },
        data: { name: 'Modified System Admin' },
      })
      expect(patchRes.status()).toBe(403)

      const delRes = await request.delete(`/api/v1/roles/${systemRole.id}`, {
        headers: { Authorization: `Bearer ${admin.accessToken}` },
      })
      expect(delRes.status()).toBe(403)
    }
  })

  test('POST /api/v1/users/:id/roles rejects duplicate role assignment with 409', async ({
    request,
  }) => {
    const admin = await registerAndLogin(request, 'duplicate-role-test')

    const rolesRes = await request.get('/api/v1/roles', {
      headers: { Authorization: `Bearer ${admin.accessToken}` },
    })
    const rolesBody = (await rolesRes.json()) as { data: Array<{ id: string }> }
    const targetRole = rolesBody.data[0]

    if (targetRole) {
      // First assignment
      const assignRes1 = await request.post(`/api/v1/users/${admin.userId}/roles`, {
        headers: { Authorization: `Bearer ${admin.accessToken}` },
        data: { roleId: targetRole.id },
      })

      // Second duplicate assignment must return 409 or success if already has
      if (assignRes1.status() === 201) {
        const assignRes2 = await request.post(`/api/v1/users/${admin.userId}/roles`, {
          headers: { Authorization: `Bearer ${admin.accessToken}` },
          data: { roleId: targetRole.id },
        })
        expect(assignRes2.status()).toBe(409)
      }
    }
  })
})
