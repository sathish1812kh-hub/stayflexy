import { SurgePricingController } from '../../engine/SurgePricingController'

const makeRedis = () => {
  const store: Map<string, { value: string; ex: number }> = new Map()
  return {
    set: jest.fn(async (key: string, value: string, _exMode?: string, ex?: number) => {
      store.set(key, { value, ex: ex ?? 3600 })
      return 'OK'
    }),
    get: jest.fn(async (key: string) => {
      const entry = store.get(key)
      return entry?.value ?? null
    }),
    del: jest.fn(async (key: string) => {
      const existed = store.has(key)
      store.delete(key)
      return existed ? 1 : 0
    }),
    eval: jest.fn(async (_script: string, _numKeys: number, key: string, value: string) => {
      const entry = store.get(key)
      if (entry?.value === value) {
        store.delete(key)
        return 1
      }
      return 0
    }),
    _store: store,
  }
}

const makeLogger = () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
})

describe('SurgePricingController', () => {
  let redis: ReturnType<typeof makeRedis>
  let logger: ReturnType<typeof makeLogger>
  let controller: SurgePricingController

  beforeEach(() => {
    redis = makeRedis()
    logger = makeLogger()
    controller = new SurgePricingController(redis as any, logger as any)
  })

  describe('applySurge', () => {
    it('stores surge config in Redis and returns ActiveSurge', async () => {
      const result = await controller.applySurge({
        organizationId: 'org-1',
        hotelId: 'hotel-1',
        roomTypeId: undefined,
        multiplier: 1.50,
        reason: 'High demand weekend',
        durationSeconds: 3600,
        appliedById: 'user-1',
      })

      expect(result.hotelId).toBe('hotel-1')
      expect(result.multiplier).toBe(1.50)
      expect(result.reason).toBe('High demand weekend')
      expect(redis.set).toHaveBeenCalledTimes(1)
    })

    it('throws if multiplier exceeds max', async () => {
      await expect(controller.applySurge({
        organizationId: 'org-1',
        hotelId: 'hotel-1',
        multiplier: 5.0,
        reason: 'Test',
        durationSeconds: 3600,
        appliedById: 'user-1',
      })).rejects.toThrow()
    })

    it('stores surge keyed by roomTypeId when provided', async () => {
      await controller.applySurge({
        organizationId: 'org-1',
        hotelId: 'hotel-1',
        roomTypeId: 'rt-101',
        multiplier: 1.25,
        reason: 'Room-specific surge',
        durationSeconds: 1800,
        appliedById: 'user-1',
      })
      const stored = await controller.getActiveSurge('hotel-1', 'rt-101')
      expect(stored).not.toBeNull()
      expect(stored?.multiplier).toBe(1.25)
    })
  })

  describe('getActiveSurge', () => {
    it('returns null when no surge is active', async () => {
      const result = await controller.getActiveSurge('hotel-none', undefined)
      expect(result).toBeNull()
    })

    it('returns surge when active', async () => {
      await controller.applySurge({
        organizationId: 'org-1',
        hotelId: 'hotel-2',
        multiplier: 1.30,
        reason: 'Test surge',
        durationSeconds: 7200,
        appliedById: 'user-1',
      })
      const surge = await controller.getActiveSurge('hotel-2', undefined)
      expect(surge).not.toBeNull()
      expect(surge?.multiplier).toBe(1.30)
    })
  })

  describe('removeSurge', () => {
    it('removes active surge and returns true', async () => {
      await controller.applySurge({
        organizationId: 'org-1',
        hotelId: 'hotel-3',
        multiplier: 1.40,
        reason: 'Test',
        durationSeconds: 3600,
        appliedById: 'user-1',
      })
      const removed = await controller.removeSurge('hotel-3', undefined)
      expect(removed).toBe(true)
      const surge = await controller.getActiveSurge('hotel-3', undefined)
      expect(surge).toBeNull()
    })

    it('returns false when no surge to remove', async () => {
      const removed = await controller.removeSurge('hotel-none', undefined)
      expect(removed).toBe(false)
    })
  })

  describe('multiplier boundary', () => {
    it('accepts multiplier of exactly 3.0 (max)', async () => {
      const result = await controller.applySurge({
        organizationId: 'org-1',
        hotelId: 'hotel-4',
        multiplier: 3.0,
        reason: 'Max surge',
        durationSeconds: 3600,
        appliedById: 'user-1',
      })
      expect(result.multiplier).toBe(3.0)
    })

    it('accepts multiplier of 1.0 (no change)', async () => {
      const result = await controller.applySurge({
        organizationId: 'org-1',
        hotelId: 'hotel-5',
        multiplier: 1.0,
        reason: 'No change',
        durationSeconds: 60,
        appliedById: 'user-1',
      })
      expect(result.multiplier).toBe(1.0)
    })
  })
})
