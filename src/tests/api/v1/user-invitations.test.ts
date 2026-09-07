import { test, expect, type APIRequestContext } from '@playwright/test'

const AUTH = '/api/v1/auth'
const USERS = '/api/v1/users'
const DEMO_PASSWORD = 'Stayflexi@2026!'

async function loginAs(request: APIRequestContext, email: string) {
  const res = await request.post(`${AUTH}/login`, {
    data: { email, password: DEMO_PASSWORD, force: true },
  })
  expect(res.status()).toBe(200)
  const body = (await res.json()) as {
    data: {
      user: { id: string; email: string; role: string; organizationId: string | null }
      tokens: { accessToken: string }
    }
  }
  return { user: body.data.user, accessToken: body.data.tokens.accessToken }
}

test.describe('Workstream 1 — Tokenized User Invitations & Acceptance Lifecycle', () => {
  let orgAdminToken: string
  let orgAdminUser: { id: string; email: string; organizationId: string | null }

  test.beforeAll(async ({ playwright }) => {
    const request = await playwright.request.newContext()
    const login = await loginAs(request, 'org-admin@stayflexi.dev')
    orgAdminToken = login.accessToken
    orgAdminUser = login.user
    await request.dispose()
  })

  test('1. Org Admin can invite new staff user with 48h secure token', async ({ request }) => {
    const inviteeEmail = `invited.staff+${Date.now()}@stayflexi.dev`
    const res = await request.post(USERS, {
      headers: { Authorization: `Bearer ${orgAdminToken}` },
      data: {
        email: inviteeEmail,
        firstName: 'Jane',
        lastName: 'Doe',
        roleType: 'FRONT_DESK',
      },
    })

    expect(res.status()).toBe(201)
    const body = (await res.json()) as {
      data: {
        id: string
        email: string
        invitationToken: string
        organizationId: string
        expiresAt: string
      }
    }

    expect(body.data.email).toBe(inviteeEmail)
    expect(body.data.invitationToken).toBeDefined()
    expect(body.data.invitationToken.length).toBe(64) // 32 bytes hex
    expect(body.data.organizationId).toBe(orgAdminUser.organizationId)
  })

  test('2. Complete invitation acceptance lifecycle with atomic single-use consumption', async ({
    request,
  }) => {
    const inviteeEmail = `accept.test+${Date.now()}@stayflexi.dev`
    const newPassword = 'SecureUserPassword@2026!'

    // Step A: Admin sends invitation
    const inviteRes = await request.post(USERS, {
      headers: { Authorization: `Bearer ${orgAdminToken}` },
      data: {
        email: inviteeEmail,
        firstName: 'Alex',
        lastName: 'Smith',
        roleType: 'FRONT_DESK',
      },
    })
    expect(inviteRes.status()).toBe(201)
    const inviteBody = (await inviteRes.json()) as { data: { invitationToken: string } }
    const rawToken = inviteBody.data.invitationToken

    // Step B: Invitee accepts invitation & sets password
    const acceptRes = await request.post(`${AUTH}/accept-invite`, {
      data: {
        token: rawToken,
        password: newPassword,
        phone: '+15551234567',
      },
    })
    expect(acceptRes.status()).toBe(200)
    const acceptBody = (await acceptRes.json()) as {
      data: {
        user: { id: string; email: string; role: string }
        tokens: { accessToken: string }
      }
    }

    expect(acceptBody.data.user.email).toBe(inviteeEmail)
    expect(acceptBody.data.user.role).toBe('FRONT_DESK')
    expect(acceptBody.data.tokens.accessToken).toBeDefined()

    // Step C: Double acceptance race prevention (token consumed atomically)
    const secondAcceptRes = await request.post(`${AUTH}/accept-invite`, {
      data: {
        token: rawToken,
        password: newPassword,
      },
    })
    expect(secondAcceptRes.status()).toBe(400)

    // Step D: Invitee can log in directly with their new password
    const loginRes = await request.post(`${AUTH}/login`, {
      data: {
        email: inviteeEmail,
        password: newPassword,
      },
    })
    expect(loginRes.status()).toBe(200)
  })

  test('3. Invalid or tampered token is rejected with 400', async ({ request }) => {
    const res = await request.post(`${AUTH}/accept-invite`, {
      data: {
        token: 'invalid-non-existent-token-12345',
        password: 'SecureUserPassword@2026!',
      },
    })
    expect(res.status()).toBe(400)
  })

  test('4. Duplicate invitation for an existing active user is rejected with 409', async ({
    request,
  }) => {
    const res = await request.post(USERS, {
      headers: { Authorization: `Bearer ${orgAdminToken}` },
      data: {
        email: 'front-desk@stayflexi.dev', // seeded active user
        firstName: 'Duplicate',
        lastName: 'User',
        roleType: 'FRONT_DESK',
      },
    })
    expect(res.status()).toBe(409)
  })
})
