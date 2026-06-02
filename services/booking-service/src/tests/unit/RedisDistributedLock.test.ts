import { RedisDistributedLock } from '../../infrastructure/locking/RedisDistributedLock'

// Minimal Redis mock
const mockRedis = {
  set: jest.fn(),
  eval: jest.fn(),
  exists: jest.fn(),
} as unknown as jest.Mocked<{ set: jest.MockedFunction<(...args: unknown[]) => Promise<string | null>>; eval: jest.MockedFunction<(...args: unknown[]) => Promise<number>>; exists: jest.MockedFunction<(...args: unknown[]) => Promise<number>> }>

describe('RedisDistributedLock', () => {
  let lock: RedisDistributedLock

  beforeEach(() => {
    jest.clearAllMocks()
    lock = new RedisDistributedLock(mockRedis as never, 30000, 2, 10)
  })

  describe('acquire', () => {
    it('returns token when lock is acquired', async () => {
      jest.mocked(mockRedis.set).mockResolvedValue('OK')
      const token = await lock.acquire('test-resource')
      expect(token).toBeTruthy()
      expect(token).toHaveLength(36)  // UUID
    })

    it('returns null when lock is already held', async () => {
      jest.mocked(mockRedis.set).mockResolvedValue(null)
      const token = await lock.acquire('test-resource')
      expect(token).toBeNull()
    })
  })

  describe('release', () => {
    it('returns true when lock is released successfully', async () => {
      jest.mocked(mockRedis.eval).mockResolvedValue(1)
      const released = await lock.release('test-resource', 'my-token')
      expect(released).toBe(true)
    })

    it('returns false when lock is held by different owner', async () => {
      jest.mocked(mockRedis.eval).mockResolvedValue(0)
      const released = await lock.release('test-resource', 'wrong-token')
      expect(released).toBe(false)
    })
  })

  describe('withLock', () => {
    it('executes function and releases lock', async () => {
      jest.mocked(mockRedis.set).mockResolvedValue('OK')
      jest.mocked(mockRedis.eval).mockResolvedValue(1)
      const fn = jest.fn().mockResolvedValue('result')
      const result = await lock.withLock('resource', fn)
      expect(result).toBe('result')
      expect(fn).toHaveBeenCalled()
      expect(mockRedis.eval).toHaveBeenCalled()  // lock released
    })

    it('releases lock even when function throws', async () => {
      jest.mocked(mockRedis.set).mockResolvedValue('OK')
      jest.mocked(mockRedis.eval).mockResolvedValue(1)
      const fn = jest.fn().mockRejectedValue(new Error('Function error'))
      await expect(lock.withLock('resource', fn)).rejects.toThrow('Function error')
      expect(mockRedis.eval).toHaveBeenCalled()  // lock still released
    })

    it('throws after max retries when lock cannot be acquired', async () => {
      jest.mocked(mockRedis.set).mockResolvedValue(null)  // Always fails to acquire
      const fn = jest.fn()
      await expect(lock.withLock('resource', fn, { retries: 1, retryDelayMs: 1 })).rejects.toThrow('Failed to acquire distributed lock')
      expect(fn).not.toHaveBeenCalled()
    })
  })
})
