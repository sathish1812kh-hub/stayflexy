import type { Request, Response, NextFunction } from 'express'
import { UnauthorizedError } from '@stayflexi/shared-errors'
import { validate } from '@stayflexi/shared-validation'
import {
  registerDtoSchema,
  loginDtoSchema,
  refreshDtoSchema,
  logoutDtoSchema,
} from '../../application/dtos/auth.dto'
import type { RegisterUser } from '../../application/use-cases/RegisterUser'
import type { LoginUser } from '../../application/use-cases/LoginUser'
import type { LogoutUser } from '../../application/use-cases/LogoutUser'
import type { RefreshTokens } from '../../application/use-cases/RefreshTokens'
import type { GetCurrentUser } from '../../application/use-cases/GetCurrentUser'

export class AuthController {
  constructor(
    private readonly registerUser: RegisterUser,
    private readonly loginUser: LoginUser,
    private readonly logoutUser: LogoutUser,
    private readonly refreshTokens: RefreshTokens,
    private readonly getCurrentUser: GetCurrentUser
  ) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = validate(registerDtoSchema, req.body)
      const correlationId = req.headers['x-correlation-id'] as string | undefined
      const result = await this.registerUser.execute(dto, correlationId)
      res.status(201).json({
        success: true,
        data: {
          userId: result.userId,
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
          accessExpiresIn: result.tokens.accessExpiresIn,
          tokenType: 'Bearer' as const,
        },
        correlationId,
      })
    } catch (err) {
      next(err)
    }
  }

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = validate(loginDtoSchema, req.body)
      const forwardedFor = req.headers['x-forwarded-for'] as string | undefined
      const ipAddress =
        forwardedFor?.split(',')[0]?.trim() ?? req.socket.remoteAddress ?? 'unknown'
      const userAgent = req.headers['user-agent'] ?? 'unknown'
      const correlationId = req.headers['x-correlation-id'] as string | undefined
      const result = await this.loginUser.execute(dto, ipAddress, userAgent, correlationId)
      res.json({ success: true, data: result, correlationId })
    } catch (err) {
      next(err)
    }
  }

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = validate(logoutDtoSchema, req.body)
      const userId = req.headers['x-user-id'] as string | undefined
      if (!userId) throw new UnauthorizedError('Authentication required')
      const correlationId = req.headers['x-correlation-id'] as string | undefined
      await this.logoutUser.execute(dto, userId, correlationId)
      res.json({
        success: true,
        data: { message: 'Logged out successfully' },
        correlationId,
      })
    } catch (err) {
      next(err)
    }
  }

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = validate(refreshDtoSchema, req.body)
      const forwardedFor = req.headers['x-forwarded-for'] as string | undefined
      const ipAddress =
        forwardedFor?.split(',')[0]?.trim() ?? req.socket.remoteAddress ?? 'unknown'
      const userAgent = req.headers['user-agent'] ?? 'unknown'
      const correlationId = req.headers['x-correlation-id'] as string | undefined
      const tokens = await this.refreshTokens.execute(dto, ipAddress, userAgent, correlationId)
      res.json({
        success: true,
        data: { ...tokens, tokenType: 'Bearer' as const },
        correlationId,
      })
    } catch (err) {
      next(err)
    }
  }

  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string | undefined
      if (!userId) throw new UnauthorizedError('Authentication required')
      const user = await this.getCurrentUser.execute(userId)
      const correlationId = req.headers['x-correlation-id'] as string | undefined
      res.json({ success: true, data: user, correlationId })
    } catch (err) {
      next(err)
    }
  }
}
