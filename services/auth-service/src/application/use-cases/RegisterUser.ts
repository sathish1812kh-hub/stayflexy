import { ConflictError, ValidationError } from '@stayflexi/shared-errors'
import { hashPassword, validatePasswordStrength } from '@stayflexi/shared-auth'
import { AUTH_EVENTS } from '@stayflexi/shared-events'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'
import type { IUserRepository } from '../../domain/repositories/IUserRepository'
import type { RegisterDto } from '../dtos/auth.dto'
import type { TokenService } from '../services/TokenService'
import type { TokenPair } from '@stayflexi/shared-auth'

export class RegisterUser {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly tokenService: TokenService,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger,
    private readonly bcryptRounds: number = 12
  ) {}

  async execute(
    dto: RegisterDto,
    correlationId?: string
  ): Promise<{ tokens: TokenPair; userId: string }> {
    // Validate password strength
    const strength = validatePasswordStrength(dto.password)
    if (!strength.valid) {
      throw new ValidationError(
        'Password does not meet requirements',
        strength.errors.map(e => ({ field: 'password', message: e }))
      )
    }

    // Check email uniqueness
    const existing = await this.userRepo.findByEmail(dto.email)
    if (existing) {
      throw new ConflictError(
        'An account with this email already exists',
        'EMAIL_ALREADY_EXISTS'
      )
    }

    // Hash password
    const passwordHash = await hashPassword(dto.password, this.bcryptRounds)

    // Create user
    const user = await this.userRepo.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      primaryRole: 'FRONT_DESK',
    })

    // Generate tokens
    const tokens = await this.tokenService.issueTokenPair(
      user.id,
      user.organizationId,
      user.primaryRole,
      {},
      correlationId
    )

    // Publish event (fire and forget — don't fail registration if Kafka is down)
    this.eventPublisher
      .publish('auth.events', {
        eventType: AUTH_EVENTS.USER_CREATED,
        aggregateId: user.id,
        aggregateType: 'User',
        organizationId: user.organizationId ?? 'unassigned',
        correlationId,
        payload: { userId: user.id, email: user.email, primaryRole: user.primaryRole },
      })
      .catch(err => {
        this.logger.warn({ err }, 'Failed to publish user.created event')
      })

    this.logger.info({ userId: user.id, correlationId }, 'User registered successfully')
    return { tokens, userId: user.id }
  }
}
