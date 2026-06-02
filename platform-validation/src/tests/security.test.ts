import { RbacValidator } from '../security/RbacValidator'
import { JwtSecurityValidator } from '../security/JwtSecurityValidator'
import { TenantIsolationValidator } from '../security/TenantIsolationValidator'
import { AuditLogValidator } from '../security/AuditLogValidator'
import type { AuditLogEntry } from '../security/AuditLogValidator'

describe('RbacValidator', () => {
  let rbac: RbacValidator

  beforeEach(() => {
    rbac = new RbacValidator()
  })

  it('role hierarchy validation passes for correct permission model', () => {
    const result = rbac.validateRoleHierarchy()
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('READ_ONLY role cannot create bookings', () => {
    expect(rbac.hasPermission('READ_ONLY', 'bookings', 'create')).toBe(false)
    expect(rbac.hasPermission('READ_ONLY', 'bookings', 'delete')).toBe(false)
    expect(rbac.hasPermission('READ_ONLY', 'bookings', 'read')).toBe(true)
  })

  it('SUPER_ADMIN can perform all CRUD operations on any resource', () => {
    expect(rbac.hasPermission('SUPER_ADMIN', 'bookings', 'create')).toBe(true)
    expect(rbac.hasPermission('SUPER_ADMIN', 'bookings', 'read')).toBe(true)
    expect(rbac.hasPermission('SUPER_ADMIN', 'bookings', 'update')).toBe(true)
    expect(rbac.hasPermission('SUPER_ADMIN', 'bookings', 'delete')).toBe(true)
    expect(rbac.hasPermission('SUPER_ADMIN', 'payments', 'delete')).toBe(true)
  })

  it('HOUSEKEEPING cannot access payments', () => {
    expect(rbac.hasPermission('HOUSEKEEPING', 'payments', 'read')).toBe(false)
  })

  it('FRONT_DESK cannot delete bookings', () => {
    expect(rbac.hasPermission('FRONT_DESK', 'bookings', 'delete')).toBe(false)
    expect(rbac.hasPermission('FRONT_DESK', 'bookings', 'create')).toBe(true)
  })
})

describe('JwtSecurityValidator', () => {
  let jwtValidator: JwtSecurityValidator

  beforeEach(() => {
    jwtValidator = new JwtSecurityValidator()
  })

  it('weak JWT secret (too short) fails validation', () => {
    const result = jwtValidator.validateSecretStrength('short')
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.includes('short'))).toBe(true)
  })

  it('strong JWT secret (long, varied characters) passes validation', () => {
    const result = jwtValidator.validateSecretStrength(
      'Xy7!mQ9#kR2$vN8@pL4%wS6^aB3&tF1(uG5)hJ0*cD',
    )
    expect(result.passed).toBe(true)
  })

  it('short expiry (900s) passes JWT config validation', () => {
    const result = jwtValidator.validateJwtConfig({
      algorithm: 'HS256',
      expiresInSeconds: 900,
      minimumSecretLength: 32,
    })
    expect(result.passed).toBe(true)
  })

  it('too-long expiry (> 86400s) fails JWT config validation', () => {
    const result = jwtValidator.validateJwtConfig({
      algorithm: 'HS256',
      expiresInSeconds: 90000,
      minimumSecretLength: 32,
    })
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.includes('expiry'))).toBe(true)
  })

  it('unknown algorithm fails JWT config validation', () => {
    const result = jwtValidator.validateJwtConfig({
      algorithm: 'NONE',
      expiresInSeconds: 900,
      minimumSecretLength: 32,
    })
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.includes('algorithm'))).toBe(true)
  })

  it('valid JWT token structure passes validation', () => {
    // Build a minimal valid JWT: header.payload.signature (base64url encoded)
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
    const now = Math.floor(Date.now() / 1000)
    const payload = Buffer.from(
      JSON.stringify({ sub: 'user-001', iat: now, exp: now + 900, jti: 'jwt-id-001' }),
    ).toString('base64url')
    const signature = 'fakesignature'
    const token = `${header}.${payload}.${signature}`

    const result = jwtValidator.validateTokenStructure(token)
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('JWT token missing jti claim fails structure validation', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
    const now = Math.floor(Date.now() / 1000)
    // Missing jti
    const payload = Buffer.from(
      JSON.stringify({ sub: 'user-001', iat: now, exp: now + 900 }),
    ).toString('base64url')
    const token = `${header}.${payload}.fakesig`

    const result = jwtValidator.validateTokenStructure(token)
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.includes('jti'))).toBe(true)
  })
})

describe('TenantIsolationValidator', () => {
  let tenantValidator: TenantIsolationValidator

  beforeEach(() => {
    tenantValidator = new TenantIsolationValidator()
  })

  it('query with organizationId filter passes tenant filter presence check', () => {
    const result = tenantValidator.validateTenantFilterPresence({
      organizationId: 'org-abc',
      status: 'confirmed',
    })
    expect(result.passed).toBe(true)
  })

  it('query without organizationId filter fails tenant filter presence check', () => {
    const result = tenantValidator.validateTenantFilterPresence({ status: 'confirmed' })
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.includes('organizationId'))).toBe(true)
  })

  it('cross-org access: same org passes', () => {
    const result = tenantValidator.validateCrossOrgIsolation('org-A', 'org-A', 'Booking')
    expect(result.passed).toBe(true)
  })

  it('cross-org access: different org fails', () => {
    const result = tenantValidator.validateCrossOrgIsolation('org-A', 'org-B', 'Booking')
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.includes('org-A') && e.includes('org-B'))).toBe(true)
  })
})

describe('AuditLogValidator', () => {
  let auditValidator: AuditLogValidator

  beforeEach(() => {
    auditValidator = new AuditLogValidator()
  })

  it('valid audit log entry passes validation', () => {
    const entry = {
      id: 'audit-001',
      action: 'booking.created',
      actorId: 'user-001',
      actorRole: 'FRONT_DESK',
      resourceType: 'Booking',
      resourceId: 'booking-001',
      organizationId: 'org-001',
      timestamp: new Date().toISOString(),
    }
    const result = auditValidator.validateAuditLogEntry(entry)
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('audit log entry missing required field fails', () => {
    const entry = {
      id: 'audit-002',
      action: 'booking.created',
      // actorId missing
      actorRole: 'FRONT_DESK',
      resourceType: 'Booking',
      resourceId: 'booking-001',
      organizationId: 'org-001',
      timestamp: new Date().toISOString(),
    }
    const result = auditValidator.validateAuditLogEntry(entry)
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.includes('actorId'))).toBe(true)
  })

  it('audit coverage: all required actions covered passes', () => {
    const allRequiredActions = [
      'booking.created',
      'booking.cancelled',
      'payment.initiated',
      'payment.confirmed',
      'user.login',
      'user.logout',
      'user.created',
      'organization.created',
      'organization.updated',
      'hotel.created',
      'hotel.updated',
    ]
    const result = auditValidator.validateAuditCoverage(allRequiredActions)
    expect(result.passed).toBe(true)
  })

  it('audit coverage: missing actions causes failure', () => {
    const result = auditValidator.validateAuditCoverage(['booking.created'])
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.includes('booking.cancelled'))).toBe(true)
  })

  it('audit entry without sensitive data passes sensitive data check', () => {
    const entry: AuditLogEntry = {
      id: 'audit-003',
      action: 'payment.confirmed',
      actorId: 'user-001',
      actorRole: 'ACCOUNTANT',
      resourceType: 'Payment',
      resourceId: 'payment-001',
      organizationId: 'org-001',
      timestamp: new Date().toISOString(),
      metadata: { amount: 299.99, currency: 'USD' },
    }
    const result = auditValidator.validateNoSensitiveDataInAudit(entry)
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('audit entry with sensitive data in metadata fails', () => {
    const entry: AuditLogEntry = {
      id: 'audit-004',
      action: 'payment.confirmed',
      actorId: 'user-001',
      actorRole: 'ACCOUNTANT',
      resourceType: 'Payment',
      resourceId: 'payment-001',
      organizationId: 'org-001',
      timestamp: new Date().toISOString(),
      metadata: { cardNumber: '4111111111111111', amount: 299.99 },
    }
    const result = auditValidator.validateNoSensitiveDataInAudit(entry)
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.includes('cardNumber'))).toBe(true)
  })
})
