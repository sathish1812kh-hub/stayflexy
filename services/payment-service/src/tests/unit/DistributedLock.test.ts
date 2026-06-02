/**
 * RedisDistributedLock tests using ioredis-mock.
 */
import { RedisDistributedLock } from '../../infrastructure/locking/RedisDistributedLock'
import type { Logger } from '@stayflexi/shared-logger'

// ioredis-mock provides an in-memory Redis implementation compatible with ioredis
// eslint-disable-next-line @typescript-eslint/no-require-imports
const RedisMock = require('ioredis-mock')

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } as unknown as Logger

function makeLock(overrideLogger?: Logger) {
  const redis = new RedisMock()
  const lock = new RedisDistributedLock(redis, overrideLogger ?? mockLogger, 5000, 2, 50)
  return { redis, lock }
}

describe('RedisDistributedLock', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('acquire', () => {
    it('returns a token string when the lock is free', async () => {
      const { lock } = makeLock()
      const token = await lock.acquire('test-resource')
      expect(typeof token).toBe('string')
      expect(token).not.toBeNull()
      expect(token!.length).toBeGreaterThan(0)
    })

    it('returns null when lock is already taken', async () => {
      const { lock } = makeLock()
      // Acquire first — should succeed
      const firstToken = await lock.acquire('taken-resource')
      expect(firstToken).not.toBeNull()

      // Second acquire — should fail because lock is held
      const secondToken = await lock.acquire('taken-resource', { ttlMs: 5000, retries: 0 })
      expect(secondToken).toBeNull()
    })

    it('returns token for a different resource even when another is locked', async () => {
      const { lock } = makeLock()
      await lock.acquire('resource-a')
      const token = await lock.acquire('resource-b')
      expect(token).not.toBeNull()
    })
  })

  describe('release', () => {
    it('returns true when releasing with the correct token', async () => {
      const { lock } = makeLock()
      const token = await lock.acquire('release-resource')
      expect(token).not.toBeNull()
      const released = await lock.release('release-resource', token!)
      expect(released).toBe(true)
    })

    it('returns false when releasing with the wrong token', async () => {
      const { lock } = makeLock()
      await lock.acquire('resource-wrong-token')
      const released = await lock.release('resource-wrong-token', 'completely-wrong-token')
      expect(released).toBe(false)
    })

    it('returns false when lock does not exist', async () => {
      const { lock } = makeLock()
      const released = await lock.release('non-existent-resource', 'some-token')
      expect(released).toBe(false)
    })

    it('after release, resource can be acquired again', async () => {
      const { lock } = makeLock()
      const token = await lock.acquire('reacquire-resource')
      await lock.release('reacquire-resource', token!)
      const newToken = await lock.acquire('reacquire-resource')
      expect(newToken).not.toBeNull()
    })
  })

  describe('withLock', () => {
    it('executes the function and releases the lock', async () => {
      const { lock } = makeLock()
      const fn = jest.fn().mockResolvedValue('result')
      const result = await lock.withLock('fn-resource', fn)
      expect(result).toBe('result')
      expect(fn).toHaveBeenCalledTimes(1)

      // Lock should be released — can be re-acquired
      const token = await lock.acquire('fn-resource')
      expect(token).not.toBeNull()
    })

    it('releases the lock even when the function throws', async () => {
      const { lock } = makeLock()
      const fn = jest.fn().mockRejectedValue(new Error('fn error'))
      await expect(lock.withLock('throw-resource', fn)).rejects.toThrow('fn error')

      // Lock should be released
      const token = await lock.acquire('throw-resource')
      expect(token).not.toBeNull()
    })

    it('throws after max retries when lock is never available', async () => {
      // Reuse the same redis instance so two locks share state
      const redis = new RedisMock()
      const lockA = new RedisDistributedLock(redis, mockLogger, 30000, 1, 10)
      const lockB = new RedisDistributedLock(redis, mockLogger, 30000, 1, 10)

      // lockA holds the resource
      await lockA.acquire('contention-resource', { ttlMs: 30000 })

      // lockB should fail after retries (retries=1, so 2 attempts total)
      await expect(
        lockB.withLock('contention-resource', jest.fn(), { ttlMs: 30000, retries: 1, retryDelayMs: 5 })
      ).rejects.toThrow(/Failed to acquire distributed lock/)
    })
  })

  describe('isLocked', () => {
    it('returns false when resource is not locked', async () => {
      const { lock } = makeLock()
      const locked = await lock.isLocked('free-resource')
      expect(locked).toBe(false)
    })

    it('returns true when resource is locked', async () => {
      const { lock } = makeLock()
      await lock.acquire('locked-resource', { ttlMs: 5000 })
      const locked = await lock.isLocked('locked-resource')
      expect(locked).toBe(true)
    })

    it('returns false after lock is released', async () => {
      const { lock } = makeLock()
      const token = await lock.acquire('transient-resource', { ttlMs: 5000 })
      await lock.release('transient-resource', token!)
      const locked = await lock.isLocked('transient-resource')
      expect(locked).toBe(false)
    })
  })
})
