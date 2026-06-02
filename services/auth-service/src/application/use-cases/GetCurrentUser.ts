import { UnauthorizedError } from '@stayflexi/shared-errors'
import type { IUserRepository } from '../../domain/repositories/IUserRepository'
import type { SessionCache } from '../services/SessionCache'
import type { AuthUserResponse } from '../dtos/auth.dto'

export class GetCurrentUser {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly sessionCache: SessionCache
  ) {}

  async execute(userId: string): Promise<AuthUserResponse> {
    // Try session cache first
    const cached = await this.sessionCache.getSession(userId)
    if (cached) return cached

    // Load from DB
    const user = await this.userRepo.findById(userId)
    if (!user || user.isDeleted) {
      throw new UnauthorizedError('User not found', 'USER_NOT_FOUND')
    }

    const response: AuthUserResponse = {
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
    }

    // Cache for 15 minutes
    await this.sessionCache.setSession(userId, response, 900)
    return response
  }
}
