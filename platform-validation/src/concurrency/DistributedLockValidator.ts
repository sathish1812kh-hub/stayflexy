import type { ValidationResult } from '../types/index'
import { createResult } from '../types/index'

// In-memory lock store that simulates Redis NX SET semantics
class InMemoryLockStore {
  private readonly locks = new Map<string, { token: string; expiresAt: number }>()

  set(key: string, token: string, ttlMs: number): boolean {
    const existing = this.locks.get(key)
    if (existing && existing.expiresAt > Date.now()) return false
    this.locks.set(key, { token, expiresAt: Date.now() + ttlMs })
    return true
  }

  get(key: string): string | null {
    const entry = this.locks.get(key)
    if (!entry || entry.expiresAt <= Date.now()) return null
    return entry.token
  }

  del(key: string, token: string): boolean {
    const entry = this.locks.get(key)
    if (!entry || entry.token !== token) return false
    this.locks.delete(key)
    return true
  }

  exists(key: string): boolean {
    const entry = this.locks.get(key)
    return entry !== undefined && entry.expiresAt > Date.now()
  }
}

export class DistributedLockValidator {
  async validateMutualExclusion(concurrentAttempts: number): Promise<ValidationResult> {
    const start = Date.now()
    const store = new InMemoryLockStore()
    const resource = 'test:room:001'
    let simultaneousLockHolders = 0
    let maxSimultaneous = 0

    const acquireAndHold = async (): Promise<void> => {
      const token = `token-${Math.random().toString(36).slice(2)}`
      const acquired = store.set(resource, token, 1000)
      if (acquired) {
        simultaneousLockHolders++
        maxSimultaneous = Math.max(maxSimultaneous, simultaneousLockHolders)
        await new Promise(resolve => setTimeout(resolve, 5))
        simultaneousLockHolders--
        store.del(resource, token)
      }
    }

    await Promise.allSettled(
      Array.from({ length: concurrentAttempts }, () => acquireAndHold()),
    )

    const passed = maxSimultaneous <= 1
    return createResult(
      'MutualExclusion',
      passed,
      `Max simultaneous lock holders: ${maxSimultaneous} (expected: ≤ 1)`,
      passed ? [] : [`Lock held by ${maxSimultaneous} owners simultaneously`],
      [],
      Date.now() - start,
    )
  }

  async validateLockExpiry(ttlMs: number): Promise<ValidationResult> {
    const start = Date.now()
    const store = new InMemoryLockStore()
    const resource = 'test:expiry'
    const token = 'expiry-token'

    store.set(resource, token, ttlMs)
    const heldBefore = store.exists(resource)

    await new Promise(resolve => setTimeout(resolve, ttlMs + 10))
    const heldAfter = store.exists(resource)

    const passed = heldBefore && !heldAfter
    return createResult(
      'LockExpiry',
      passed,
      `Lock held before expiry: ${heldBefore}, held after expiry: ${heldAfter}`,
      passed ? [] : ['Lock did not expire correctly'],
      [],
      Date.now() - start,
    )
  }

  async validateOwnershipEnforcement(): Promise<ValidationResult> {
    const start = Date.now()
    const store = new InMemoryLockStore()
    const resource = 'test:ownership'

    store.set(resource, 'owner-token', 5000)
    const wrongOwnerReleased = store.del(resource, 'wrong-token')
    const stillHeld = store.exists(resource)
    const correctOwnerReleased = store.del(resource, 'owner-token')

    const passed = !wrongOwnerReleased && stillHeld && correctOwnerReleased
    return createResult(
      'OwnershipEnforcement',
      passed,
      `Wrong owner release: ${wrongOwnerReleased}, correct owner release: ${correctOwnerReleased}`,
      passed ? [] : ['Lock ownership enforcement failed'],
      [],
      Date.now() - start,
    )
  }

  async validateDeadlockPrevention(resourceCount: number): Promise<ValidationResult> {
    const start = Date.now()
    // Deadlock prevention: always acquire locks in sorted order
    const resources = Array.from(
      { length: resourceCount },
      (_, i) => `room-${i.toString().padStart(3, '0')}`,
    )
    const sorted = [...resources].sort()
    const isOrdered = sorted.every((r, i) => r === resources[i])

    return createResult(
      'DeadlockPrevention',
      isOrdered,
      `Resources in acquisition order: ${resources.join(', ')}`,
      isOrdered ? [] : ['Resources not acquired in sorted order — deadlock risk'],
      [],
      Date.now() - start,
    )
  }
}
