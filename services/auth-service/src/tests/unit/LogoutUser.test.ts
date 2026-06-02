import { LogoutUser } from '../../application/use-cases/LogoutUser'
import type { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository'
import type { SessionCache } from '../../application/services/SessionCache'
import type { Logger } from '@stayflexi/shared-logger'
import { RefreshToken } from '../../domain/entities/RefreshToken'
import * as sharedAuth from '@stayflexi/shared-auth'

jest.mock('@stayflexi/shared-auth', () => ({
  ...jest.requireActual('@stayflexi/shared-auth'),
  compareToken: jest.fn(),
}))

function makeRefreshToken(overrides: Partial<ConstructorParameters<typeof RefreshToken>[0]> = {}): RefreshToken {
  return new RefreshToken({
    id: 'tok-1',
    userId: 'user-1',
    tokenHash: '$2a$10$hashedvalue',
    ipAddress: null,
    userAgent: null,
    expiresAt: new Date(Date.now() + 86400000),
    revokedAt: null,
    createdAt: new Date(),
    ...overrides,
  })
}

const mockTokenRepo: jest.Mocked<IRefreshTokenRepository> = {
  findActiveByUserId: jest.fn(),
  findActiveTokens: jest.fn(),
  create: jest.fn(),
  revoke: jest.fn().mockResolvedValue(undefined),
  revokeAllByUserId: jest.fn(),
}

const mockSessionCache: jest.Mocked<SessionCache> = {
  setSession: jest.fn().mockResolvedValue(undefined),
  getSession: jest.fn().mockResolvedValue(null),
  deleteSession: jest.fn().mockResolvedValue(undefined),
  blacklistToken: jest.fn().mockResolvedValue(undefined),
  isTokenBlacklisted: jest.fn().mockResolvedValue(false),
} as unknown as jest.Mocked<SessionCache>

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger

describe('LogoutUser', () => {
  let useCase: LogoutUser

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new LogoutUser(mockTokenRepo, mockSessionCache, mockLogger)
  })

  it('revokes matching refresh token and clears session cache', async () => {
    const token = makeRefreshToken()
    mockTokenRepo.findActiveTokens.mockResolvedValue([token])
    jest.mocked(sharedAuth.compareToken).mockResolvedValue(true)

    await useCase.execute({ refreshToken: 'raw-token' }, 'user-1')

    expect(mockTokenRepo.revoke).toHaveBeenCalledWith('tok-1')
    expect(mockSessionCache.deleteSession).toHaveBeenCalledWith('user-1')
  })

  it('still clears session cache when no matching token is found', async () => {
    mockTokenRepo.findActiveTokens.mockResolvedValue([makeRefreshToken()])
    jest.mocked(sharedAuth.compareToken).mockResolvedValue(false)

    await useCase.execute({ refreshToken: 'wrong-token' }, 'user-1')

    expect(mockTokenRepo.revoke).not.toHaveBeenCalled()
    expect(mockSessionCache.deleteSession).toHaveBeenCalledWith('user-1')
  })

  it('handles empty active tokens list gracefully', async () => {
    mockTokenRepo.findActiveTokens.mockResolvedValue([])

    await expect(
      useCase.execute({ refreshToken: 'any-token' }, 'user-1'),
    ).resolves.not.toThrow()

    expect(mockTokenRepo.revoke).not.toHaveBeenCalled()
    expect(mockSessionCache.deleteSession).toHaveBeenCalledWith('user-1')
  })

  it('passes correlationId to logger', async () => {
    mockTokenRepo.findActiveTokens.mockResolvedValue([])

    await useCase.execute({ refreshToken: 'any-token' }, 'user-1', 'corr-id-123')

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({ correlationId: 'corr-id-123' }),
      expect.any(String),
    )
  })
})
