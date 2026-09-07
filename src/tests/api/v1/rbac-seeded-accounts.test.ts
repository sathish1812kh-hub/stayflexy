import { test, expect, type APIRequestContext } from '@playwright/test'

const AUTH = '/api/v1/auth'
const DEMO_PASSWORD = 'Stayflexi@2026!'

async function loginAs(request: APIRequestContext, email: string) {
  const res = await request.post(`${AUTH}/login`, {
    data: {
      email,
      password: DEMO_PASSWORD,
      force: true,
    },
  })
  if (res.status() !== 200) {
    console.error(`[loginAs error] ${email} -> ${res.status()}:`, await res.text())
  }
  expect(res.status()).toBe(200)
  const body = (await res.json()) as {
    data: {
      user: { id: string; email: string; role: string; organizationId: string | null }
      tokens: { accessToken: string }
    }
  }
  return {
    user: body.data.user,
    accessToken: body.data.tokens.accessToken,
  }
}

test.describe('Phase 4 — Seeded Role Accounts Verification', () => {
  test('1. Super Admin: full access across all permissions and unrestricted scoping', async ({
    request,
  }) => {
    const { user, accessToken } = await loginAs(request, 'super-admin@stayflexi.dev')
    expect(user.role).toBe('SUPER_ADMIN')

    const meRes = await request.get(`${AUTH}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(meRes.status()).toBe(200)
    const meBody = (await meRes.json()) as { data: { permissionKeys: string[] } }

    expect(meBody.data.permissionKeys).toContain('compliance:read')
    expect(meBody.data.permissionKeys).toContain('security:revoke')
    expect(meBody.data.permissionKeys).toContain('role:create')
    expect(meBody.data.permissionKeys).toContain('hotel:create')
  })

  test('2. Organization Admin: full organization management & role administration', async ({
    request,
  }) => {
    const { user, accessToken } = await loginAs(request, 'org-admin@stayflexi.dev')
    expect(user.role).toBe('ORG_ADMIN')

    const meRes = await request.get(`${AUTH}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(meRes.status()).toBe(200)
    const meBody = (await meRes.json()) as { data: { permissionKeys: string[] } }

    expect(meBody.data.permissionKeys).toContain('role:create')
    expect(meBody.data.permissionKeys).toContain('user:create')
    expect(meBody.data.permissionKeys).toContain('user_role:assign')
    expect(meBody.data.permissionKeys).toContain('hotel:create')

    // Can access live staff directory
    const usersRes = await request.get('/api/v1/users', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(usersRes.status()).toBe(200)
  })

  test('3. Hotel Manager: daily hotel operations and room management', async ({ request }) => {
    const { user, accessToken } = await loginAs(request, 'manager@stayflexi.dev')
    expect(user.role).toBe('HOTEL_MANAGER')

    const meRes = await request.get(`${AUTH}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(meRes.status()).toBe(200)
    const meBody = (await meRes.json()) as { data: { permissionKeys: string[] } }

    expect(meBody.data.permissionKeys).toContain('room:create')
    expect(meBody.data.permissionKeys).toContain('booking:create')
    expect(meBody.data.permissionKeys).toContain('rate_plan:create')
    // Lacks role management permissions
    expect(meBody.data.permissionKeys).not.toContain('role:create')

    // Negative Probes: Hotel Manager cannot create or delete roles
    const forbiddenCreateRes = await request.post('/api/v1/roles', {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { name: 'Manager Custom Role' },
    })
    expect(forbiddenCreateRes.status()).toBe(403)
    const forbiddenCreateBody = (await forbiddenCreateRes.json()) as { error?: { code?: string } }
    expect(forbiddenCreateBody.error?.code).toBe('FORBIDDEN')

    const forbiddenDeleteRes = await request.delete(
      '/api/v1/roles/00000000-0000-0000-0000-000000000000',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    )
    expect(forbiddenDeleteRes.status()).toBe(403)
  })

  test('4. Front Desk: guest-facing check-in/out and room views', async ({ request }) => {
    const { user, accessToken } = await loginAs(request, 'front-desk@stayflexi.dev')
    expect(user.role).toBe('FRONT_DESK')

    const meRes = await request.get(`${AUTH}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(meRes.status()).toBe(200)
    const meBody = (await meRes.json()) as { data: { permissionKeys: string[] } }

    expect(meBody.data.permissionKeys).toContain('room:read')
    expect(meBody.data.permissionKeys).toContain('booking:create')
    expect(meBody.data.permissionKeys).toContain('booking:read')
    // Cannot delete roles
    expect(meBody.data.permissionKeys).not.toContain('role:delete')

    // Negative Probes: Front Desk cannot modify roles or create hotels
    const forbiddenPatchRes = await request.patch(
      '/api/v1/roles/00000000-0000-0000-0000-000000000000',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        data: { name: 'Front Desk Modified Role' },
      },
    )
    expect(forbiddenPatchRes.status()).toBe(403)
    const forbiddenPatchBody = (await forbiddenPatchRes.json()) as { error?: { code?: string } }
    expect(forbiddenPatchBody.error?.code).toBe('FORBIDDEN')

    const forbiddenHotelRes = await request.post('/api/v1/hotels', {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { name: 'Front Desk Hotel', code: 'FDH01' },
    })
    expect(forbiddenHotelRes.status()).toBe(403)
  })

  test('5. Housekeeping: room status and housekeeping tasks only', async ({ request }) => {
    const { user, accessToken } = await loginAs(request, 'housekeeping@stayflexi.dev')
    expect(user.role).toBe('HOUSEKEEPING')

    const meRes = await request.get(`${AUTH}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(meRes.status()).toBe(200)
    const meBody = (await meRes.json()) as { data: { permissionKeys: string[] } }

    expect(meBody.data.permissionKeys).toContain('housekeeping_task:read')
    expect(meBody.data.permissionKeys).toContain('housekeeping_task:update')
    expect(meBody.data.permissionKeys).not.toContain('payment:export')
    expect(meBody.data.permissionKeys).not.toContain('role:create')

    // Negative Probes: Housekeeping cannot create roles or hotels
    const forbiddenRes = await request.post('/api/v1/roles', {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { name: 'Unauthorized Role' },
    })
    expect(forbiddenRes.status()).toBe(403)
    const forbiddenBody = (await forbiddenRes.json()) as { error?: { code?: string } }
    expect(forbiddenBody.error?.code).toBe('FORBIDDEN')

    const forbiddenHotelRes = await request.post('/api/v1/hotels', {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { name: 'Housekeeping Hotel', code: 'HKH01' },
    })
    expect(forbiddenHotelRes.status()).toBe(403)
  })

  test('6. Accountant: financial reporting, invoices, and payment exports', async ({ request }) => {
    const { user, accessToken } = await loginAs(request, 'accountant@stayflexi.dev')
    expect(user.role).toBe('ACCOUNTANT')

    const meRes = await request.get(`${AUTH}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(meRes.status()).toBe(200)
    const meBody = (await meRes.json()) as { data: { permissionKeys: string[] } }

    expect(meBody.data.permissionKeys).toContain('invoice:read')
    expect(meBody.data.permissionKeys).toContain('invoice:export')
    expect(meBody.data.permissionKeys).toContain('payment:export')
    expect(meBody.data.permissionKeys).toContain('payment:read')
    expect(meBody.data.permissionKeys).not.toContain('housekeeping_task:create')
    expect(meBody.data.permissionKeys).not.toContain('role:create')

    // Negative Probes: Accountant cannot create roles or hotels
    const forbiddenRoleRes = await request.post('/api/v1/roles', {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { name: 'Accountant Custom Role' },
    })
    expect(forbiddenRoleRes.status()).toBe(403)
    const forbiddenRoleBody = (await forbiddenRoleRes.json()) as { error?: { code?: string } }
    expect(forbiddenRoleBody.error?.code).toBe('FORBIDDEN')

    const forbiddenHotelRes = await request.post('/api/v1/hotels', {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { name: 'Accountant Hotel', code: 'ACCH01' },
    })
    expect(forbiddenHotelRes.status()).toBe(403)
  })
})
