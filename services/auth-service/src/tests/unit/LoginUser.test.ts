import { LoginUser } from '../../application/use-cases/LoginUser'
import { User } from '../../domain/entities/User'
import { UnauthorizedError, ForbiddenError } from '@stayflexi/shared-errors'
import type { IUserRepository } from '../../domain/repositories/IUserRepository'
import type { TokenService } from '../../application/services/TokenService'
import type { BruteForceProtector } from '../../application/services/BruteForceProtector'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'
import * as sharedAuth from '@stayflexi/shared-auth'

jest.mock('@stayflexi/shared-auth', () => ({
  ...jest.requireActual('@stayflexi/shared-auth'),
  verifyPassword: jest.fn(),
}))

const mockUserRepo: jest.Mocked<IUserRepository> = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
  create: jest.fn(),
  updateLastLogin: jest.fn(),
  updateStatus: jest.fn(),
}

const mockTokenService = {
  issueTokenPair: jest.fn().mockResolvedValue({
    accessToken: 'at',
    refreshToken: 'rt',
    accessExpiresIn: 900,
  }),
} as unknown as TokenService

const mockBruteForce: jest.Mocked<BruteForceProtector> = {
  isBlocked: jest.fn().mockResolvedValue(false),
  recordFailure: jest.fn().mockResolvedValue(undefined),
  clearFailures: jest.fn().mockResolvedValue(undefined),
  getAttempts: jest.fn().mockResolvedValue(0),
} as unknown as jest.Mocked<BruteForceProtector>

const mockPublisher: IEventPublisher = {
  publish: jest.fn().mockResolvedValue(undefined),
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  isConnected: () => false,
}

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger

function makeActiveUser(overrides: Partial<ConstructorParameters<typeof User>[0]> = {}): User {
  return new User({
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashed',
    firstName: 'John',
    lastName: 'Doe',
    phone: null,
    primaryRole: 'FRONT_DESK',
    status: 'ACTIVE',
    organizationId: null,
    lastLoginAt: null,
    emailVerifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  })
}

describe('LoginUser', () => {
  let useCase: LoginUser

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new LoginUser(mockUserRepo, mockTokenService, mockBruteForce, mockPublisher, mockLogger)
  })

  it('logs in successfully with valid credentials', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(makeActiveUser())
    jest.mocked(sharedAuth.verifyPassword).mockResolvedValue(true)

    const result = await useCase.execute(
      { email: 'test@example.com', password: 'correct' },
      '127.0.0.1',
      'Mozilla'
    )

    expect(result.accessToken).toBe('at')
    expect(result.user.userId).toBe('user-123')
    expect(mockBruteForce.clearFailures).toHaveBeenCalled()
    expect(mockUserRepo.updateLastLogin).toHaveBeenCalledWith('user-123')
  })

  it('throws UnauthorizedError for wrong password', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(makeActiveUser())
    jest.mocked(sharedAuth.verifyPassword).mockResolvedValue(false)

    await expect(
      useCase.execute({ email: 'test@example.com', password: 'wrong' }, '127.0.0.1', 'Mozilla')
    ).rejects.toThrow(UnauthorizedError)

    expect(mockBruteForce.recordFailure).toHaveBeenCalled()
    expect(mockUserRepo.updateLastLogin).not.toHaveBeenCalled()
  })

  it('throws UnauthorizedError when user not found', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null)

    await expect(
      useCase.execute({ email: 'no@example.com', password: 'pass' }, '127.0.0.1', 'Mozilla')
    ).rejects.toThrow(UnauthorizedError)

    expect(mockBruteForce.recordFailure).toHaveBeenCalled()
  })

  it('throws ForbiddenError when rate limited', async () => {
    mockBruteForce.isBlocked.mockResolvedValue(true)

    await expect(
      useCase.execute({ email: 'test@example.com', password: 'pass' }, '127.0.0.1', 'Mozilla')
    ).rejects.toThrow(ForbiddenError)

    // Should not even query the DB when blocked
    expect(mockUserRepo.findByEmail).not.toHaveBeenCalled()
  })

  it('throws ForbiddenError for suspended account', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(makeActiveUser({ status: 'SUSPENDED' }))
    jest.mocked(sharedAuth.verifyPassword).mockResolvedValue(true)

    await expect(
      useCase.execute({ email: 'test@example.com', password: 'correct' }, '127.0.0.1', 'Mozilla')
    ).rejects.toThrow(ForbiddenError)
  })

  it('throws UnauthorizedError for deleted user', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(makeActiveUser({ deletedAt: new Date() }))

    await expect(
      useCase.execute({ email: 'test@example.com', password: 'pass' }, '127.0.0.1', 'Mozilla')
    ).rejects.toThrow(UnauthorizedError)
  })

  it('includes user profile in login response', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(makeActiveUser())
    jest.mocked(sharedAuth.verifyPassword).mockResolvedValue(true)

    const result = await useCase.execute(
      { email: 'test@example.com', password: 'correct' },
      '127.0.0.1',
      'Mozilla'
    )

    expect(result.user).toMatchObject({
      userId: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      primaryRole: 'FRONT_DESK',
    })
    expect(result.tokenType).toBe('Bearer')
  })
})
