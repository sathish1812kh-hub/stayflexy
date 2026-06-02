import { RegisterUser } from '../../application/use-cases/RegisterUser'
import type { IUserRepository } from '../../domain/repositories/IUserRepository'
import type { TokenService } from '../../application/services/TokenService'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'
import { User } from '../../domain/entities/User'
import { ConflictError, ValidationError } from '@stayflexi/shared-errors'

// Manual mocks — no mock library required for unit tests
const mockUserRepo: jest.Mocked<IUserRepository> = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
  create: jest.fn(),
  updateLastLogin: jest.fn(),
  updateStatus: jest.fn(),
}

const mockTokenService = {
  issueTokenPair: jest.fn().mockResolvedValue({
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    accessExpiresIn: 900,
  }),
} as unknown as TokenService

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

function makeUser(overrides: Partial<ConstructorParameters<typeof User>[0]> = {}): User {
  return new User({
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashed',
    firstName: 'John',
    lastName: 'Doe',
    phone: null,
    primaryRole: 'FRONT_DESK',
    status: 'PENDING_VERIFICATION',
    organizationId: null,
    lastLoginAt: null,
    emailVerifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  })
}

describe('RegisterUser', () => {
  let useCase: RegisterUser

  beforeEach(() => {
    jest.clearAllMocks()
    useCase = new RegisterUser(mockUserRepo, mockTokenService, mockPublisher, mockLogger, 10)
  })

  it('registers a new user successfully', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null)
    mockUserRepo.create.mockResolvedValue(makeUser())

    const result = await useCase.execute({
      email: 'test@example.com',
      password: 'SecurePass123',
      firstName: 'John',
      lastName: 'Doe',
    })

    expect(result.userId).toBe('user-123')
    expect(result.tokens.accessToken).toBe('mock-access-token')
    expect(mockUserRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'test@example.com' })
    )
  })

  it('throws ConflictError for duplicate email', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(makeUser())

    await expect(
      useCase.execute({
        email: 'test@example.com',
        password: 'SecurePass123',
        firstName: 'John',
        lastName: 'Doe',
      })
    ).rejects.toThrow(ConflictError)
  })

  it('throws ValidationError for weak password', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null)

    await expect(
      useCase.execute({
        email: 'test@example.com',
        password: 'weak',
        firstName: 'John',
        lastName: 'Doe',
      })
    ).rejects.toThrow(ValidationError)
  })

  it('does not create user when password is weak', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null)

    await expect(
      useCase.execute({
        email: 'test@example.com',
        password: 'short',
        firstName: 'John',
        lastName: 'Doe',
      })
    ).rejects.toThrow()

    expect(mockUserRepo.create).not.toHaveBeenCalled()
  })

  it('publishes user.created event after successful registration', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null)
    mockUserRepo.create.mockResolvedValue(makeUser())

    await useCase.execute({
      email: 'test@example.com',
      password: 'SecurePass123',
      firstName: 'John',
      lastName: 'Doe',
    })

    // Event is fire-and-forget (not awaited), so we flush the microtask queue
    await new Promise(resolve => setImmediate(resolve))
    expect(mockPublisher.publish).toHaveBeenCalledWith(
      'auth.events',
      expect.objectContaining({ eventType: 'auth.user.created' })
    )
  })

  it('still returns tokens even when event publish fails', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null)
    mockUserRepo.create.mockResolvedValue(makeUser())
    ;(mockPublisher.publish as jest.Mock).mockRejectedValueOnce(new Error('Kafka down'))

    const result = await useCase.execute({
      email: 'test@example.com',
      password: 'SecurePass123',
      firstName: 'John',
      lastName: 'Doe',
    })

    // Should still succeed despite event publish failure
    expect(result.userId).toBe('user-123')
  })
})
