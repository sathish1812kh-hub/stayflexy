import type Redis from 'ioredis'

const EXECUTION_TTL = 300 // 5 min
const IDEMPOTENCY_TTL = 3600 // 1 hour

export class WorkflowCache {
  constructor(private readonly redis: Redis) {}

  async getExecution(id: string): Promise<unknown | null> {
    const val = await this.redis.get(`stayflexi:workflow:exec:${id}`)
    return val ? (JSON.parse(val) as unknown) : null
  }

  async setExecution(id: string, data: unknown): Promise<void> {
    await this.redis.setex(
      `stayflexi:workflow:exec:${id}`,
      EXECUTION_TTL,
      JSON.stringify(data),
    )
  }

  async invalidateExecution(id: string): Promise<void> {
    await this.redis.del(`stayflexi:workflow:exec:${id}`)
  }

  async getIdempotencyResult(key: string): Promise<string | null> {
    return this.redis.get(`stayflexi:workflow:idempotency:${key}`)
  }

  async setIdempotencyResult(key: string, executionId: string): Promise<void> {
    await this.redis.setex(
      `stayflexi:workflow:idempotency:${key}`,
      IDEMPOTENCY_TTL,
      executionId,
    )
  }

  async getExecutionLock(executionId: string): Promise<boolean> {
    const result = await this.redis.set(
      `stayflexi:workflow:lock:${executionId}`,
      '1',
      'NX',
      'EX',
      300,
    )
    return result === 'OK'
  }

  async releaseExecutionLock(executionId: string): Promise<void> {
    await this.redis.del(`stayflexi:workflow:lock:${executionId}`)
  }
}
