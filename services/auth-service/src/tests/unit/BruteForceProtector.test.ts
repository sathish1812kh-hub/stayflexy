import { BruteForceProtector } from '../../application/services/BruteForceProtector'

function makeRedisMock() {
  const store = new Map<string, string>()
  return {
    get: jest.fn(async (key: string) => store.get(key) ?? null),
    del: jest.fn(async (key: string) => { store.delete(key); return 1 }),
    pipeline: jest.fn(() => {
      const ops: Array<() => void> = []
      const pipe = {
        incr: jest.fn((key: string) => {
          ops.push(() => {
            const cur = parseInt(store.get(key) ?? '0', 10)
            store.set(key, String(cur + 1))
          })
          return pipe
        }),
        expire: jest.fn(() => pipe),
        exec: jest.fn(async () => {
          ops.forEach(op => op())
          return [[null, 1], [null, 1]]
        }),
      }
      return pipe
    }),
    _store: store,
  }
}

describe('BruteForceProtector', () => {
  const IP = '10.0.0.1'
  const EMAIL = 'attacker@example.com'

  it('isBlocked returns false when no failures recorded', async () => {
    const redis = makeRedisMock()
    const protector = new BruteForceProtector(redis as never, 5, 900)
    expect(await protector.isBlocked(IP, EMAIL)).toBe(false)
  })

  it('isBlocked returns false when failures are below threshold', async () => {
    const redis = makeRedisMock()
    const protector = new BruteForceProtector(redis as never, 5, 900)
    redis._store.set(`stayflexi:auth:bf:${IP}:${EMAIL}`, '4')
    expect(await protector.isBlocked(IP, EMAIL)).toBe(false)
  })

  it('isBlocked returns true when failures equal threshold', async () => {
    const redis = makeRedisMock()
    const protector = new BruteForceProtector(redis as never, 5, 900)
    redis._store.set(`stayflexi:auth:bf:${IP}:${EMAIL}`, '5')
    expect(await protector.isBlocked(IP, EMAIL)).toBe(true)
  })

  it('isBlocked returns true when failures exceed threshold', async () => {
    const redis = makeRedisMock()
    const protector = new BruteForceProtector(redis as never, 5, 900)
    redis._store.set(`stayflexi:auth:bf:${IP}:${EMAIL}`, '10')
    expect(await protector.isBlocked(IP, EMAIL)).toBe(true)
  })

  it('recordFailure increments counter via pipeline', async () => {
    const redis = makeRedisMock()
    const protector = new BruteForceProtector(redis as never, 5, 900)

    await protector.recordFailure(IP, EMAIL)
    await protector.recordFailure(IP, EMAIL)

    const count = await protector.getAttempts(IP, EMAIL)
    expect(count).toBe(2)
    expect(redis.pipeline).toHaveBeenCalledTimes(2)
  })

  it('clearFailures removes the key', async () => {
    const redis = makeRedisMock()
    const protector = new BruteForceProtector(redis as never, 5, 900)
    redis._store.set(`stayflexi:auth:bf:${IP}:${EMAIL}`, '3')

    await protector.clearFailures(IP, EMAIL)

    expect(await protector.isBlocked(IP, EMAIL)).toBe(false)
    expect(await protector.getAttempts(IP, EMAIL)).toBe(0)
  })

  it('getAttempts returns 0 when no key exists', async () => {
    const redis = makeRedisMock()
    const protector = new BruteForceProtector(redis as never, 5, 900)
    expect(await protector.getAttempts(IP, EMAIL)).toBe(0)
  })

  it('normalises email to lowercase for key building', async () => {
    const redis = makeRedisMock()
    const protector = new BruteForceProtector(redis as never, 5, 900)

    // Inject failure with uppercase email
    redis._store.set(`stayflexi:auth:bf:${IP}:attacker@example.com`, '5')

    // Check with uppercase email — should still find the key
    expect(await protector.isBlocked(IP, 'ATTACKER@EXAMPLE.COM')).toBe(true)
  })
})
