import type Redis from 'ioredis'
import { Organization } from '../../domain/entities/Organization'
import type { OrganizationProps } from '../../domain/entities/Organization'

export class OrganizationCache {
  private readonly PREFIX = 'stayflexi:org'

  constructor(
    private readonly redis: Redis,
    private readonly ttlSeconds: number = 300
  ) {}

  private key(id: string): string {
    return `${this.PREFIX}:${id}`
  }

  async get(id: string): Promise<Organization | null> {
    const raw = await this.redis.get(this.key(id))
    if (!raw) return null
    try {
      const props = JSON.parse(raw) as OrganizationProps
      // Rehydrate Date fields serialised as ISO strings by JSON.stringify
      props.createdAt = new Date(props.createdAt)
      props.updatedAt = new Date(props.updatedAt)
      if (props.deletedAt) props.deletedAt = new Date(props.deletedAt)
      return new Organization(props)
    } catch {
      return null
    }
  }

  async set(org: Organization): Promise<void> {
    await this.redis.setex(
      this.key(org.id),
      this.ttlSeconds,
      JSON.stringify(org.toJSON())
    )
  }

  async invalidate(id: string): Promise<void> {
    await this.redis.del(this.key(id))
  }
}
