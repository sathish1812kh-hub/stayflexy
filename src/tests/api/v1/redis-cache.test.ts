import { test, expect } from '@playwright/test'
// @ts-expect-error ioredis-mock has no bundled typescript definitions
import RedisMock from 'ioredis-mock'
import { RedisCacheProvider } from '../../../infrastructure/cache/providers/RedisCacheProvider'

test.describe('RedisCacheProvider Unit & Degradation Suite', () => {
  let mockRedis: any
  let cache: RedisCacheProvider

  test.beforeEach(() => {
    mockRedis = new RedisMock()
    cache = new RedisCacheProvider(mockRedis, { scanBatchSize: 10 })
  })

  test('set and get structured object successfully', async () => {
    const data = { userId: 'u-123', roles: ['ORG_ADMIN'], permissions: ['hotel:create'] }
    await cache.set('rbac:user:123', data, 60)

    const cached = await cache.get<typeof data>('rbac:user:123')
    expect(cached).toEqual(data)
  })

  test('get returns null on cache miss', async () => {
    const cached = await cache.get('non-existent-key')
    expect(cached).toBeNull()
  })

  test('del removes key from cache', async () => {
    await cache.set('temp-key', { value: 42 })
    expect(await cache.exists('temp-key')).toBe(true)

    await cache.del('temp-key')
    expect(await cache.exists('temp-key')).toBe(false)
    expect(await cache.get('temp-key')).toBeNull()
  })

  test('delByPattern invalidates all matching keys non-blockingly', async () => {
    // Populate multiple keys matching pattern
    await cache.set('rbac:user:user-1', { id: 1 })
    await cache.set('rbac:user:user-2', { id: 2 })
    await cache.set('rbac:user:user-3', { id: 3 })
    await cache.set('hotel:info:1', { name: 'Grand Resort' })

    // Invalidate pattern
    await cache.delByPattern('rbac:user:*')

    expect(await cache.get('rbac:user:user-1')).toBeNull()
    expect(await cache.get('rbac:user:user-2')).toBeNull()
    expect(await cache.get('rbac:user:user-3')).toBeNull()
    // Non-matching key remains untouched
    expect(await cache.get('hotel:info:1')).toEqual({ name: 'Grand Resort' })
  })

  test('stats tracks hit rate and counts', async () => {
    await cache.set('metric-key', { active: true })

    await cache.get('metric-key') // hit 1
    await cache.get('metric-key') // hit 2
    await cache.get('miss-key') // miss 1

    const stats = cache.stats()
    expect(stats.hits).toBe(2)
    expect(stats.misses).toBe(1)
    expect(stats.hitRate).toBeCloseTo(2 / 3, 2)
  })

  test('gracefully degrades to null on Redis read failure', async () => {
    // Simulate failing redis client
    const failingRedis = {
      get: async () => {
        throw new Error('Connection refused')
      },
      on: () => {},
    } as any

    let degradedNotified = false
    const degradedCache = new RedisCacheProvider(failingRedis, {
      onDegraded: () => {
        degradedNotified = true
      },
    })

    const result = await degradedCache.get('any-key')
    expect(result).toBeNull() // Safe fallback to null for DB pass-through
    expect(degradedNotified).toBe(true)
  })
})
