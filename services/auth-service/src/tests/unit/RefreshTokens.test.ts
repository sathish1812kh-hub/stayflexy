import { RefreshTokens } from '../../application/use-cases/RefreshTokens'
import type { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository'
import type { IUserRepository } from '../../domain/repositories/IUserRepository'
import type { TokenService } from '../../application/services/TokenService'
import type { Logger } from '@stayflexi/shared-logger'
import { RefreshToken } from '../../domain/entities/RefreshToken'
import { User } from '../../domain/entities/User'
import { UnauthorizedError } from '@stayflexi/shared-errors'
import * as sharedAuth from '@stayflexi/shared-auth'

// Mock compareToken at module level
jest.mock('@stayflexi/shared-auth', () => ({
  ...jest.requireActual('@stayflexi/shared-auth'),
  compareToken: jest.fn(),
}))

function makeUser(overrides: Partial<ConstructorParameters<typeof User>[0]> = {}): User {
  return new User({
    id: 'user-abc',
    email: 'user@test.com',
    passwordHash: 'hashed',
    firstName: 'Jane',
    lastName: 'Doe',
    phone: null,
    primaryRole: 'FRONT_DESK',
    status: 'ACTIVE',
    organizationId: 'org-1',
    lastLoginAt: null,
    emailVerifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  })
}

function makeRefreshToken(overrides: Partial<ConstructorParameters<typeof RefreshToken>[0]> = {}): RefreshToken {
  return new RefreshToken({
    id: 'token-id-1',
    userId: 'user-abc',
    tokenHash: '$2a$10$hashvalue',
    ipAddress: '127.0.0.1',
    userAgent: 'Jest/test',
    expiresAt: new Date(Date.now() + 86400000), // valid: 1 day from now
    revokedAt: null,
    createdAt: new Date(),
    ...overrides,
  })
}

const mockTokenRepo: jest.Mocked<IRefreshTokenRepository> = {
  findActiveByUserId: jest.fn(),
  findActiveTokens: jest.fn(),
  create: jest.fn(),
  revoke: jest.fn(),
  revokeAllByUserId: jest.fn(),
}

const mockUserRepo: jest.Mocked<IUserRepository> = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
  create: jest.fn(),
  updateLastLogin: jest.fn(),
  updateStatus: jest.fn(),
}

const mockTokenService = {
  issueTokenPair: jest.fn().mockResolvedValue({
    accessToken: 'new-access-token',
    refreshToken: 'new-refresh-token',
    accessExpiresIn: 900,
  }),
} as unknown as TokenService

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger

describe('RefreshTokens', () => {
  let useCase: RefreshTokens

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new RefreshTokens(mockTokenRepo, mockUserRepo, mockTokenService, mockLogger)
  })

  it('issues new token pair on valid refresh token', async () => {
    const token = makeRefreshToken()
    mockTokenRepo.findActiveTokens.mockResolvedValue([token])
    jest.mocked(sharedAuth.compareToken).mockResolvedValue(true)
    mockUserRepo.findById.mockResolvedValue(makeUser())

    const result = await useCase.execute(
      { refreshToken: 'user-abc:some-random-part' },
      '127.0.0.1',
      'Jest',
    )

    expect(result.accessToken).toBe('new-access-token')
    expect(result.refreshToken).toBe('new-refresh-token')
    expect(mockTokenRepo.revoke).toHaveBeenCalledWith('token-id-1')
    expect(mockTokenService.issueTokenPair).toHaveBeenCalledTimes(1)
  })

  it('throws UnauthorizedError when refresh token has invalid format (no colon)', async () => {
    await expect(
      useCase.execute({ refreshToken: 'nocolon' }, '127.0.0.1', 'Jest'),
    ).rejects.toThrow(UnauthorizedError)

    expect(mockTokenRepo.findActiveTokens).not.toHaveBeenCalled()
  })

  it('throws UnauthorizedError when no matching token found in DB', async () => {
    mockTokenRepo.findActiveTokens.mockResolvedValue([makeRefreshToken()])
    jest.mocked(sharedAuth.compareToken).mockResolvedValue(false)

    await expect(
      useCase.execute({ refreshToken: 'user-abc:wrong-value' }, '127.0.0.1', 'Jest'),
    ).rejects.toThrow(UnauthorizedError)
  })

  it('throws UnauthorizedError when token is revoked', async () => {
    const revoked = makeRefreshToken({ revokedAt: new Date() })
    mockTokenRepo.findActiveTokens.mockResolvedValue([revoked])
    jest.mocked(sharedAuth.compareToken).mockResolvedValue(true)

    await expect(
      useCase.execute({ refreshToken: 'user-abc:valid-token' }, '127.0.0.1', 'Jest'),
    ).rejects.toThrow(UnauthorizedError)
  })

  it('throws UnauthorizedError when token is expired', async () => {
    const expired = makeRefreshToken({ expiresAt: new Date(Date.now() - 1000) })
    mockTokenRepo.findActiveTokens.mockResolvedValue([expired])
    jest.mocked(sharedAuth.compareToken).mockResolvedValue(true)

    await expect(
      useCase.execute({ refreshToken: 'user-abc:valid-token' }, '127.0.0.1', 'Jest'),
    ).rejects.toThrow(UnauthorizedError)
  })

  it('throws UnauthorizedError when user is not found after token validation', async () => {
    mockTokenRepo.findActiveTokens.mockResolvedValue([makeRefreshToken()])
    jest.mocked(sharedAuth.compareToken).mockResolvedValue(true)
    mockUserRepo.findById.mockResolvedValue(null)

    await expect(
      useCase.execute({ refreshToken: 'user-abc:valid-token' }, '127.0.0.1', 'Jest'),
    ).rejects.toThrow(UnauthorizedError)
  })

  it('throws UnauthorizedError when user is suspended', async () => {
    mockTokenRepo.findActiveTokens.mockResolvedValue([makeRefreshToken()])
    jest.mocked(sharedAuth.compareToken).mockResolvedValue(true)
    mockUserRepo.findById.mockResolvedValue(makeUser({ status: 'SUSPENDED' }))

    await expect(
      useCase.execute({ refreshToken: 'user-abc:valid-token' }, '127.0.0.1', 'Jest'),
    ).rejects.toThrow(UnauthorizedError)
  })

  it('revokes old token before issuing new pair (rotation)', async () => {
    mockTokenRepo.findActiveTokens.mockResolvedValue([makeRefreshToken()])
    jest.mocked(sharedAuth.compareToken).mockResolvedValue(true)
    mockUserRepo.findById.mockResolvedValue(makeUser())

    await useCase.execute({ refreshToken: 'user-abc:valid' }, '127.0.0.1', 'Jest')

    // Revoke must happen before issue
    const revokeOrder = mockTokenRepo.revoke.mock.invocationCallOrder[0]
    const issueOrder = mockTokenService.issueTokenPair.mock.invocationCallOrder[0]
    expect(revokeOrder).toBeDefined()
    expect(issueOrder).toBeDefined()
    if (revokeOrder !== undefined && issueOrder !== undefined) {
      expect(revokeOrder).toBeLessThan(issueOrder)
    }
  })
})
