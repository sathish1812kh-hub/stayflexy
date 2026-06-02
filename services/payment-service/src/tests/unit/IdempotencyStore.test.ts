import { PaymentIdempotencyStore } from '../../infrastructure/idempotency/PaymentIdempotencyStore'

// ioredis-mock provides an in-memory Redis for tests
// eslint-disable-next-line @typescript-eslint/no-require-imports
const RedisMock = require('ioredis-mock')

describe('PaymentIdempotencyStore', () => {
  let store: PaymentIdempotencyStore
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let redis: any

  beforeEach(() => {
    redis = new RedisMock()
    store = new PaymentIdempotencyStore(redis, 3600)
  })

  afterEach(async () => {
    await redis.flushall()
  })

  it('returns null for unknown key', async () => {
    const result = await store.get('nonexistent')
    expect(result).toBeNull()
  })

  it('marks a key as PROCESSING', async () => {
    const claimed = await store.markProcessing('key-1')
    expect(claimed).toBe(true)
    const result = await store.get('key-1')
    expect(result).toBe('PROCESSING')
  })

  it('rejects concurrent markProcessing for the same key', async () => {
    const first = await store.markProcessing('key-2')
    const second = await store.markProcessing('key-2')
    expect(first).toBe(true)
    expect(second).toBe(false)
  })

  it('stores and retrieves a completed record', async () => {
    const record = { statusCode: 201, body: { success: true, data: { id: 'pay-1' } }, createdAt: '2026-01-01T00:00:00.000Z' }
    await store.store('key-3', record)
    const result = await store.get('key-3')
    expect(result).not.toBeNull()
    expect(result).not.toBe('PROCESSING')
    if (result !== null && result !== 'PROCESSING') {
      expect(result.statusCode).toBe(201)
      expect(result.body).toEqual({ success: true, data: { id: 'pay-1' } })
    }
  })

  it('overwrites PROCESSING when store is called', async () => {
    await store.markProcessing('key-4')
    expect(await store.get('key-4')).toBe('PROCESSING')
    await store.store('key-4', { statusCode: 200, body: { success: true }, createdAt: new Date().toISOString() })
    const result = await store.get('key-4')
    expect(result).not.toBe('PROCESSING')
    expect(result).not.toBeNull()
  })

  it('deletes a key', async () => {
    await store.markProcessing('key-5')
    await store.delete('key-5')
    const result = await store.get('key-5')
    expect(result).toBeNull()
  })

  it('returns null for corrupted stored data', async () => {
    // Directly set corrupt data to test the JSON parse fallback
    await redis.setex('stayflexi:idempotency:payment:key-bad', 3600, '{not valid json}')
    const result = await store.get('key-bad')
    expect(result).toBeNull()
  })
})
