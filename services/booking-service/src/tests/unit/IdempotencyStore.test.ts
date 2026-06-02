import { IdempotencyStore } from '../../infrastructure/idempotency/IdempotencyStore'
import type Redis from 'ioredis'

// ─── Mock Redis ───────────────────────────────────────────────────────────────

function makeRedisMock() {
  const store = new Map<string, string>()
  return {
    get: jest.fn(async (key: string) => store.get(key) ?? null),
    set: jest.fn(async (key: string, value: string, ..._args: unknown[]) => {
      // Simulate NX: only set if not exists
      const args = _args as string[]
      if (args.includes('NX') && store.has(key)) return null
      store.set(key, value)
      return 'OK'
    }),
    setex: jest.fn(async (key: string, _ttl: number, value: string) => {
      store.set(key, value)
      return 'OK'
    }),
    del: jest.fn(async (key: string) => {
      store.delete(key)
      return 1
    }),
    _store: store,
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('IdempotencyStore', () => {
  let redis: ReturnType<typeof makeRedisMock>
  let store: IdempotencyStore

  beforeEach(() => {
    redis = makeRedisMock()
    store = new IdempotencyStore(redis as unknown as Redis, 86400)
  })

  describe('get', () => {
    it('returns null when key does not exist', async () => {
      redis.get.mockResolvedValue(null)

      const result = await store.get('nonexistent-key')

      expect(result).toBeNull()
    })

    it('returns PROCESSING sentinel when key is being processed', async () => {
      redis.get.mockResolvedValue('__PROCESSING__')

      const result = await store.get('processing-key')

      expect(result).toBe('PROCESSING')
    })

    it('returns stored record when key has a completed response', async () => {
      const record = { statusCode: 201, body: { success: true }, createdAt: '2026-06-01T00:00:00.000Z' }
      redis.get.mockResolvedValue(JSON.stringify(record))

      const result = await store.get('completed-key')

      expect(result).toEqual(record)
    })

    it('returns null when stored value is not valid JSON', async () => {
      redis.get.mockResolvedValue('not-json')

      const result = await store.get('bad-key')

      expect(result).toBeNull()
    })
  })

  describe('markProcessing', () => {
    it('returns true when key is successfully marked as processing', async () => {
      redis.set.mockResolvedValue('OK')

      const result = await store.markProcessing('new-key')

      expect(result).toBe(true)
      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining('new-key'),
        '__PROCESSING__',
        'EX',
        60,
        'NX'
      )
    })

    it('returns false when key is already set (concurrent request)', async () => {
      redis.set.mockResolvedValue(null) // NX failed

      const result = await store.markProcessing('existing-key')

      expect(result).toBe(false)
    })
  })

  describe('store', () => {
    it('persists the idempotency record with TTL', async () => {
      const record = { statusCode: 201, body: { id: 'booking-1' }, createdAt: '2026-06-01T00:00:00.000Z' }

      await store.store('my-key', record)

      expect(redis.setex).toHaveBeenCalledWith(
        expect.stringContaining('my-key'),
        86400,
        JSON.stringify(record)
      )
    })
  })

  describe('delete', () => {
    it('deletes the idempotency key', async () => {
      await store.delete('key-to-delete')

      expect(redis.del).toHaveBeenCalledWith(expect.stringContaining('key-to-delete'))
    })
  })

  describe('idempotency round-trip', () => {
    it('stored record is retrievable with correct shape', async () => {
      const record = { statusCode: 201, body: { bookingId: 'b-1' }, createdAt: new Date().toISOString() }
      let stored: string | null = null

      redis.setex.mockImplementation(async (_key: string, _ttl: number, value: string) => {
        stored = value
        return 'OK'
      })
      redis.get.mockImplementation(async () => stored)

      await store.store('round-trip-key', record)
      const result = await store.get('round-trip-key')

      expect(result).toEqual(record)
    })
  })
})
