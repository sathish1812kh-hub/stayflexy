import type { Redis } from 'ioredis';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ServiceInstance {
  instanceId: string;
  serviceName: string;
  url: string;
  port: number;
  health: 'healthy' | 'degraded' | 'unhealthy';
  metadata?: Record<string, string>;
  registeredAt: string;
  lastHeartbeat: string;
}

// ─── ServiceRegistry ──────────────────────────────────────────────────────────

export class ServiceRegistry {
  private readonly TTL_SECONDS = 30;
  private readonly KEY_PREFIX = 'stayflexi:sd';

  constructor(private readonly redis: Redis) {}

  // ── Private helpers ────────────────────────────────────────────────────────

  private instanceKey(serviceName: string, instanceId: string): string {
    return `${this.KEY_PREFIX}:${serviceName}:${instanceId}`;
  }

  private servicePattern(serviceName: string): string {
    return `${this.KEY_PREFIX}:${serviceName}:*`;
  }

  // ── register ───────────────────────────────────────────────────────────────

  async register(
    serviceName: string,
    instanceId: string,
    url: string,
    port: number,
    metadata?: Record<string, string>,
  ): Promise<void> {
    const instance: ServiceInstance = {
      instanceId,
      serviceName,
      url,
      port,
      health: 'healthy',
      metadata,
      registeredAt: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
    };

    await this.redis.setex(
      this.instanceKey(serviceName, instanceId),
      this.TTL_SECONDS,
      JSON.stringify(instance),
    );
  }

  // ── heartbeat ──────────────────────────────────────────────────────────────

  async heartbeat(serviceName: string, instanceId: string): Promise<void> {
    const key = this.instanceKey(serviceName, instanceId);

    // Fetch current data, update lastHeartbeat, re-save with refreshed TTL
    const raw = await this.redis.get(key);
    if (raw === null) {
      throw new Error(
        `Instance ${instanceId} of service ${serviceName} not registered`,
      );
    }

    const instance = JSON.parse(raw) as ServiceInstance;
    instance.lastHeartbeat = new Date().toISOString();

    await this.redis.setex(key, this.TTL_SECONDS, JSON.stringify(instance));
  }

  // ── deregister ─────────────────────────────────────────────────────────────

  async deregister(serviceName: string, instanceId: string): Promise<void> {
    await this.redis.del(this.instanceKey(serviceName, instanceId));
  }

  // ── getInstances ───────────────────────────────────────────────────────────

  async getInstances(serviceName: string): Promise<ServiceInstance[]> {
    const pattern = this.servicePattern(serviceName);
    const keys = await this.redis.keys(pattern);

    if (keys.length === 0) return [];

    const rawValues = await this.redis.mget(...keys);
    const instances: ServiceInstance[] = [];

    for (const raw of rawValues) {
      if (raw === null) continue;
      try {
        const instance = JSON.parse(raw) as ServiceInstance;
        if (instance.health !== 'unhealthy') {
          instances.push(instance);
        }
      } catch {
        // Skip malformed entries
      }
    }

    return instances;
  }

  // ── getAllServices ─────────────────────────────────────────────────────────

  async getAllServices(): Promise<Map<string, ServiceInstance[]>> {
    const allPattern = `${this.KEY_PREFIX}:*`;
    const allKeys = await this.redis.keys(allPattern);

    if (allKeys.length === 0) return new Map();

    const rawValues = await this.redis.mget(...allKeys);
    const result = new Map<string, ServiceInstance[]>();

    for (const raw of rawValues) {
      if (raw === null) continue;
      try {
        const instance = JSON.parse(raw) as ServiceInstance;
        const existing = result.get(instance.serviceName) ?? [];
        existing.push(instance);
        result.set(instance.serviceName, existing);
      } catch {
        // Skip malformed entries
      }
    }

    return result;
  }

  // ── updateHealth ───────────────────────────────────────────────────────────

  async updateHealth(
    serviceName: string,
    instanceId: string,
    health: ServiceInstance['health'],
  ): Promise<void> {
    const key = this.instanceKey(serviceName, instanceId);
    const raw = await this.redis.get(key);

    if (raw === null) {
      throw new Error(
        `Instance ${instanceId} of service ${serviceName} not found`,
      );
    }

    const instance = JSON.parse(raw) as ServiceInstance;
    instance.health = health;
    instance.lastHeartbeat = new Date().toISOString();

    // Preserve remaining TTL
    const ttl = await this.redis.ttl(key);
    const remainingTtl = ttl > 0 ? ttl : this.TTL_SECONDS;

    await this.redis.setex(key, remainingTtl, JSON.stringify(instance));
  }
}
