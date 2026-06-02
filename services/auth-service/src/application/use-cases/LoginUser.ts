import { UnauthorizedError, ForbiddenError } from '@stayflexi/shared-errors'
import { verifyPassword } from '@stayflexi/shared-auth'
import { AUTH_EVENTS } from '@stayflexi/shared-events'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'
import type { IUserRepository } from '../../domain/repositories/IUserRepository'
import type { LoginDto, LoginResponse } from '../dtos/auth.dto'
import type { TokenService } from '../services/TokenService'
import type { BruteForceProtector } from '../services/BruteForceProtector'

export class LoginUser {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly tokenService: TokenService,
    private readonly bruteForce: BruteForceProtector,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger
  ) {}

  async execute(
    dto: LoginDto,
    ipAddress: string,
    userAgent: string,
    correlationId?: string
  ): Promise<LoginResponse> {
    // Check brute force before any DB query (attacker gets same response time)
    const blocked = await this.bruteForce.isBlocked(ipAddress, dto.email)
    if (blocked) {
      throw new ForbiddenError(
        'Too many failed login attempts. Please try again later.',
        'RATE_LIMITED'
      )
    }

    const user = await this.userRepo.findByEmail(dto.email)
    if (!user || user.isDeleted) {
      await this.bruteForce.recordFailure(ipAddress, dto.email)
      throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS')
    }

    const passwordValid = await verifyPassword(dto.password, user.passwordHash)
    if (!passwordValid) {
      await this.bruteForce.recordFailure(ipAddress, dto.email)
      throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS')
    }

    if (!user.canLogin()) {
      throw new ForbiddenError(
        `Account is ${user.status.toLowerCase()}`,
        'ACCOUNT_INACTIVE'
      )
    }

    // Clear brute force counter on success
    await this.bruteForce.clearFailures(ipAddress, dto.email)

    // Update last login
    await this.userRepo.updateLastLogin(user.id)

    // Issue token pair
    const tokens = await this.tokenService.issueTokenPair(
      user.id,
      user.organizationId,
      user.primaryRole,
      { ipAddress, userAgent },
      correlationId
    )

    // Publish event
    this.eventPublisher
      .publish('auth.events', {
        eventType: AUTH_EVENTS.USER_LOGGED_IN,
        aggregateId: user.id,
        aggregateType: 'User',
        organizationId: user.organizationId ?? 'unassigned',
        correlationId,
        payload: { userId: user.id, email: user.email, ipAddress },
      })
      .catch(err => {
        this.logger.warn({ err }, 'Failed to publish user.logged_in event')
      })

    this.logger.info({ userId: user.id, correlationId }, 'User logged in')

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessExpiresIn: tokens.accessExpiresIn,
      tokenType: 'Bearer',
      user: {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        primaryRole: user.primaryRole,
        organizationId: user.organizationId,
        status: user.status,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
      },
    }
  }
}
