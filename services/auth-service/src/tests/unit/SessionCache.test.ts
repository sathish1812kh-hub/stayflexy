import { SessionCache } from '../../application/services/SessionCache'
import type { AuthUserResponse } from '../../application/dtos/auth.dto'

function makeRedisMock() {
  const store = new Map<string, string>()
  return {
    setex: jest.fn(async (key: string, _ttl: number, value: string) => {
      store.set(key, value)
      return 'OK'
    }),
    get: jest.fn(async (key: string) => store.get(key) ?? null),
    del: jest.fn(async (key: string) => { store.delete(key); return 1 }),
    exists: jest.fn(async (key: string) => (store.has(key) ? 1 : 0)),
    _store: store,
  }
}

function makeUserResponse(overrides: Partial<AuthUserResponse> = {}): AuthUserResponse {
  return {
    userId: 'user-1',
    email: 'user@test.com',
    firstName: 'Test',
    lastName: 'User',
    primaryRole: 'FRONT_DESK',
    organizationId: 'org-1',
    status: 'ACTIVE',
    lastLoginAt: null,
    emailVerifiedAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('SessionCache', () => {
  describe('setSession / getSession', () => {
    it('stores and retrieves a session', async () => {
      const redis = makeRedisMock()
      const cache = new SessionCache(redis as never)
      const user = makeUserResponse()

      await cache.setSession('user-1', user, 900)
      const result = await cache.getSession('user-1')

      expect(result).toEqual(user)
      expect(redis.setex).toHaveBeenCalledWith(
        'stayflexi:auth:session:user-1',
        900,
        JSON.stringify(user),
      )
    })

    it('returns null when session does not exist', async () => {
      const redis = makeRedisMock()
      const cache = new SessionCache(redis as never)
      expect(await cache.getSession('nobody')).toBeNull()
    })

    it('returns null and does not throw when stored value is malformed JSON', async () => {
      const redis = makeRedisMock()
      redis._store.set('stayflexi:auth:session:user-1', 'NOT_JSON')
      const cache = new SessionCache(redis as never)
      expect(await cache.getSession('user-1')).toBeNull()
    })
  })

  describe('deleteSession', () => {
    it('removes the session key', async () => {
      const redis = makeRedisMock()
      const cache = new SessionCache(redis as never)
      await cache.setSession('user-1', makeUserResponse(), 900)
      await cache.deleteSession('user-1')
      expect(await cache.getSession('user-1')).toBeNull()
    })

    it('does not throw when deleting a non-existent session', async () => {
      const redis = makeRedisMock()
      const cache = new SessionCache(redis as never)
      await expect(cache.deleteSession('ghost-user')).resolves.not.toThrow()
    })
  })

  describe('blacklistToken / isTokenBlacklisted', () => {
    it('blacklists a token and detects it', async () => {
      const redis = makeRedisMock()
      const cache = new SessionCache(redis as never)

      await cache.blacklistToken('jti-abc', 900)
      expect(await cache.isTokenBlacklisted('jti-abc')).toBe(true)
    })

    it('returns false for a token that is not blacklisted', async () => {
      const redis = makeRedisMock()
      const cache = new SessionCache(redis as never)
      expect(await cache.isTokenBlacklisted('jti-unknown')).toBe(false)
    })

    it('uses the correct Redis key prefix for blacklisted tokens', async () => {
      const redis = makeRedisMock()
      const cache = new SessionCache(redis as never)

      await cache.blacklistToken('jti-xyz', 300)

      expect(redis.setex).toHaveBeenCalledWith(
        'stayflexi:auth:blacklist:jti-xyz',
        300,
        '1',
      )
    })
  })
})
