import Redis from 'ioredis';
import type { IEventBus } from './types';
import { RedisStreamEventBus } from './RedisStreamEventBus';
import { InMemoryEventBus } from './InMemoryEventBus';

export interface EventBusFactoryOptions {
  type?: 'redis' | 'memory';
  redisUrl?: string;
  serviceName: string;
}

export function createEventBus(options: EventBusFactoryOptions): IEventBus {
  const rawType =
    options.type ??
    (process.env['EVENT_BUS_TYPE'] as 'redis' | 'memory' | undefined) ??
    'redis';

  const type: 'redis' | 'memory' = rawType === 'memory' ? 'memory' : 'redis';

  if (type === 'memory') {
    return new InMemoryEventBus();
  }

  const url =
    options.redisUrl ??
    process.env['REDIS_URL'] ??
    'redis://localhost:6379';

  const redis = new Redis(url, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  return new RedisStreamEventBus(redis, options.serviceName);
}
