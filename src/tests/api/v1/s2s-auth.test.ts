import { test, expect } from '@playwright/test'
import { signServiceToken, verifyServiceToken, extractAuthUser } from '@stayflexi/shared-types'

test.describe('Workstream 4 — Scoped S2S Mutual Trust & Audience Validation Suite', () => {
  const SECRET = 'super-secret-s2s-key-min-32-chars-long-12345'

  test('1. signServiceToken mints valid JWT with coarse claims', () => {
    const token = signServiceToken(
      {
        iss: 'stayflexi/booking-service',
        aud: 'stayflexi/payment-service',
        orgId: 'org-123',
      },
      SECRET,
      300,
    )

    expect(typeof token).toBe('string')
    expect(token.split('.').length).toBe(3)

    const payload = verifyServiceToken(token, SECRET, 'stayflexi/payment-service')
    expect(payload).not.toBeNull()
    expect(payload?.iss).toBe('stayflexi/booking-service')
    expect(payload?.aud).toBe('stayflexi/payment-service')
    expect(payload?.role).toBe('SERVICE')
    expect(payload?.orgId).toBe('org-123')
  })

  test('2. Audience mismatch is rejected by verifyServiceToken', () => {
    const token = signServiceToken(
      {
        iss: 'stayflexi/booking-service',
        aud: 'stayflexi/payment-service',
      },
      SECRET,
    )

    // Verify against incorrect audience
    const payload = verifyServiceToken(token, SECRET, 'stayflexi/hotel-service')
    expect(payload).toBeNull()
  })

  test('3. Wildcard audience is accepted across services', () => {
    const token = signServiceToken(
      {
        iss: 'stayflexi/gateway',
        aud: '*',
      },
      SECRET,
    )

    const payload = verifyServiceToken(token, SECRET, 'stayflexi/inventory-service')
    expect(payload).not.toBeNull()
    expect(payload?.aud).toBe('*')
  })

  test('4. Tampered token signature is rejected', () => {
    const token = signServiceToken(
      {
        iss: 'stayflexi/booking-service',
        aud: 'stayflexi/payment-service',
      },
      SECRET,
    )

    const tampered = token.slice(0, -4) + 'abcd'
    const payload = verifyServiceToken(tampered, SECRET, 'stayflexi/payment-service')
    expect(payload).toBeNull()
  })

  test('5. extractAuthUser parses x-service-token with tenant scoping', () => {
    const token = signServiceToken(
      {
        iss: 'stayflexi/booking-service',
        aud: 'stayflexi/payment-service',
        orgId: 'org-tenant-999',
      },
      SECRET,
    )

    const authUser = extractAuthUser(
      {
        'x-service-token': token,
        'x-correlation-id': 'corr-abc-123',
      },
      SECRET,
      'stayflexi/payment-service',
    )

    expect(authUser).not.toBeNull()
    expect(authUser?.userId).toBe('stayflexi/booking-service')
    expect(authUser?.primaryRole).toBe('SERVICE')
    expect(authUser?.isServiceCall).toBe(true)
    expect(authUser?.organizationId).toBe('org-tenant-999')
    expect(authUser?.correlationId).toBe('corr-abc-123')
  })

  test('6. extractAuthUser falls back to legacy x-service-key gracefully', () => {
    const authUser = extractAuthUser(
      {
        'x-service-key': SECRET,
        'x-organization-id': 'org-legacy-456',
        'x-correlation-id': 'corr-legacy',
      },
      SECRET,
      'stayflexi/payment-service',
    )

    expect(authUser).not.toBeNull()
    expect(authUser?.userId).toBe('service')
    expect(authUser?.primaryRole).toBe('SERVICE')
    expect(authUser?.isServiceCall).toBe(true)
    expect(authUser?.organizationId).toBe('org-legacy-456')
  })
})
