import { TokenService } from '../../application/services/TokenService'
import type { IRefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository'
import { RefreshToken } from '../../domain/entities/RefreshToken'
import { verifyAccessToken } from '@stayflexi/shared-auth'

const JWT_SECRET = 'test-secret-must-be-at-least-32-characters-long'
const JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-characters-long'
const ACCESS_EXPIRES_IN = '15m'
const REFRESH_EXPIRES_IN_MS = 7 * 24 * 60 * 60 * 1000

function makeTokenRepo(): jest.Mocked<IRefreshTokenRepository> {
  return {
    findActiveByUserId: jest.fn(),
    findActiveTokens: jest.fn(),
    create: jest.fn().mockImplementation(async (data) =>
      new RefreshToken({
        id: 'rt-new',
        userId: data.userId,
        tokenHash: data.tokenHash,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        expiresAt: data.expiresAt,
        revokedAt: null,
        createdAt: new Date(),
      }),
    ),
    revoke: jest.fn().mockResolvedValue(undefined),
    revokeAllByUserId: jest.fn().mockResolvedValue(0),
  }
}

describe('TokenService', () => {
  let tokenRepo: jest.Mocked<IRefreshTokenRepository>
  let service: TokenService

  beforeEach(() => {
    tokenRepo = makeTokenRepo()
    service = new TokenService(
      tokenRepo,
      JWT_SECRET,
      JWT_REFRESH_SECRET,
      ACCESS_EXPIRES_IN,
      REFRESH_EXPIRES_IN_MS,
    )
  })

  describe('issueTokenPair', () => {
    it('returns a valid access token, opaque refresh token, and expiry seconds', async () => {
      const pair = await service.issueTokenPair('user-1', 'org-1', 'FRONT_DESK', {})

      expect(pair.accessToken).toBeTruthy()
      expect(pair.refreshToken).toBeTruthy()
      expect(pair.accessExpiresIn).toBe(900) // 15m = 900 seconds
    })

    it('access token contains correct sub, organizationId, and primaryRole claims', async () => {
      const pair = await service.issueTokenPair('user-42', 'org-99', 'HOTEL_MANAGER', {})
      const payload = verifyAccessToken(pair.accessToken, JWT_SECRET)

      expect(payload.sub).toBe('user-42')
      expect(payload.organizationId).toBe('org-99')
      expect(payload.primaryRole).toBe('HOTEL_MANAGER')
    })

    it('access token omits organizationId when null', async () => {
      const pair = await service.issueTokenPair('user-99', null, 'FRONT_DESK', {})
      const payload = verifyAccessToken(pair.accessToken, JWT_SECRET)

      expect(payload.organizationId).toBeUndefined()
    })

    it('refresh token is prefixed with userId (format: userId:random)', async () => {
      const pair = await service.issueTokenPair('user-1', null, 'FRONT_DESK', {})

      expect(pair.refreshToken.startsWith('user-1:')).toBe(true)
    })

    it('persists hashed refresh token in repository', async () => {
      await service.issueTokenPair('user-1', 'org-1', 'FRONT_DESK', {
        ipAddress: '10.0.0.1',
        userAgent: 'TestAgent/1.0',
      })

      expect(tokenRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          ipAddress: '10.0.0.1',
          userAgent: 'TestAgent/1.0',
        }),
      )
    })

    it('each call generates a unique refresh token', async () => {
      const pair1 = await service.issueTokenPair('user-1', null, 'FRONT_DESK', {})
      const pair2 = await service.issueTokenPair('user-1', null, 'FRONT_DESK', {})

      expect(pair1.refreshToken).not.toBe(pair2.refreshToken)
    })

    it('refresh token expiry is set ~7 days in the future', async () => {
      const before = Date.now()
      await service.issueTokenPair('user-1', null, 'FRONT_DESK', {})
      const after = Date.now()

      const createCall = tokenRepo.create.mock.calls[0]?.[0]
      expect(createCall).toBeDefined()
      if (createCall) {
        const expiresAt = createCall.expiresAt.getTime()
        const expectedMin = before + REFRESH_EXPIRES_IN_MS - 1000
        const expectedMax = after + REFRESH_EXPIRES_IN_MS + 1000
        expect(expiresAt).toBeGreaterThan(expectedMin)
        expect(expiresAt).toBeLessThan(expectedMax)
      }
    })
  })
})
