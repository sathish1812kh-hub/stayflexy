import { DistributedLockService } from '../../application/services/DistributedLockService'
import { ServiceUnavailableError } from '@stayflexi/shared-errors'
import type Redis from 'ioredis'
import type { Logger } from '@stayflexi/shared-logger'

// ─── Mock Redis ───────────────────────────────────────────────────────────────

function makeRedisMock(): jest.Mocked<Pick<Redis, 'set' | 'eval' | 'del'>> & {
  set: jest.Mock
  eval: jest.Mock
  del: jest.Mock
} {
  return {
    set: jest.fn(),
    eval: jest.fn(),
    del: jest.fn(),
  }
}

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('DistributedLockService', () => {
  let redisMock: ReturnType<typeof makeRedisMock>
  let service: DistributedLockService

  beforeEach(() => {
    jest.clearAllMocks()
    redisMock = makeRedisMock()
    service = new DistributedLockService(
      redisMock as unknown as Redis,
      mockLogger,
      5000, // ttl
      3,    // retries
      10    // base delay ms
    )
  })

  describe('acquire', () => {
    it('returns a token when Redis SET NX succeeds', async () => {
      redisMock.set.mockResolvedValue('OK')

      const token = await service.acquire('test-lock')

      expect(token).not.toBeNull()
      expect(typeof token).toBe('string')
      expect(redisMock.set).toHaveBeenCalledWith(
        'stayflexi:inv:lock:test-lock',
        expect.any(String),
        'PX',
        5000,
        'NX'
      )
    })

    it('returns null when all retry attempts fail', async () => {
      redisMock.set.mockResolvedValue(null) // NX fails — lock already held

      const token = await service.acquire('busy-lock')

      expect(token).toBeNull()
      expect(redisMock.set).toHaveBeenCalledTimes(3) // retryAttempts=3
    })

    it('returns token on second attempt after first NX failure', async () => {
      redisMock.set
        .mockResolvedValueOnce(null)  // first attempt fails
        .mockResolvedValueOnce('OK') // second attempt succeeds

      const token = await service.acquire('contested-lock')

      expect(token).not.toBeNull()
      expect(redisMock.set).toHaveBeenCalledTimes(2)
    })
  })

  describe('release', () => {
    it('returns true when Lua script deletes the key (token matches)', async () => {
      redisMock.eval.mockResolvedValue(1)

      const result = await service.release('test-lock', 'my-token')

      expect(result).toBe(true)
      expect(redisMock.eval).toHaveBeenCalledWith(
        expect.any(String),
        1,
        'stayflexi:inv:lock:test-lock',
        'my-token'
      )
    })

    it('returns false when token does not match (lock owned by another caller)', async () => {
      redisMock.eval.mockResolvedValue(0)

      const result = await service.release('test-lock', 'wrong-token')

      expect(result).toBe(false)
    })

    it('returns false on Redis error', async () => {
      redisMock.eval.mockRejectedValue(new Error('Redis connection error'))

      const result = await service.release('test-lock', 'my-token')

      expect(result).toBe(false)
    })
  })

  describe('withMultipleLocks', () => {
    it('acquires locks, runs fn, releases locks', async () => {
      redisMock.set.mockResolvedValue('OK')
      redisMock.eval.mockResolvedValue(1)

      const result = await service.withMultipleLocks(
        ['lock-a', 'lock-b'],
        async () => 'result'
      )

      expect(result).toBe('result')
      expect(redisMock.set).toHaveBeenCalledTimes(2)
      expect(redisMock.eval).toHaveBeenCalledTimes(2)
    })

    it('throws ServiceUnavailableError and releases acquired locks on partial failure', async () => {
      redisMock.set
        .mockResolvedValueOnce('OK')  // lock-a acquired
        .mockResolvedValue(null)       // lock-b fails after retries

      redisMock.eval.mockResolvedValue(1)

      await expect(
        service.withMultipleLocks(['lock-a', 'lock-b', 'lock-c'], async () => 'done')
      ).rejects.toThrow(ServiceUnavailableError)

      // lock-a should be released despite lock-b failing
      expect(redisMock.eval).toHaveBeenCalledTimes(1)
    })

    it('acquires locks in sorted order regardless of input order', async () => {
      redisMock.set.mockResolvedValue('OK')
      redisMock.eval.mockResolvedValue(1)

      const lockOrder: string[] = []
      redisMock.set.mockImplementation(async (key: string) => {
        lockOrder.push(key as string)
        return 'OK'
      })

      await service.withMultipleLocks(['z-lock', 'a-lock', 'm-lock'], async () => 'ok')

      // Should be sorted: a-lock, m-lock, z-lock
      expect(lockOrder[0]).toContain('a-lock')
      expect(lockOrder[1]).toContain('m-lock')
      expect(lockOrder[2]).toContain('z-lock')
    })

    it('releases locks even when fn throws', async () => {
      redisMock.set.mockResolvedValue('OK')
      redisMock.eval.mockResolvedValue(1)

      await expect(
        service.withMultipleLocks(['lock-a'], async () => {
          throw new Error('business logic error')
        })
      ).rejects.toThrow('business logic error')

      // Lock must be released despite the error
      expect(redisMock.eval).toHaveBeenCalledTimes(1)
    })
  })

  describe('inventoryKey', () => {
    it('generates consistent key from roomTypeId and date', () => {
      const key = DistributedLockService.inventoryKey('rt-abc', '2025-06-15')
      expect(key).toBe('rt-abc:2025-06-15')
    })
  })
})
