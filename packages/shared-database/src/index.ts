import { PrismaClient, Prisma } from '@prisma/client'

export { PrismaClient, Prisma }

// Singleton factory — avoids multiple client instances in dev hot-reload
declare global {
  var __prisma: PrismaClient | undefined
}

export function createPrismaClient(databaseUrl?: string): PrismaClient {
  const url = databaseUrl ?? process.env['DATABASE_URL']
  const client = new PrismaClient({
    datasources: url ? { db: { url } } : undefined,
    log:
      process.env['NODE_ENV'] === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
    errorFormat:
      process.env['NODE_ENV'] === 'development' ? 'pretty' : 'minimal',
  })
  return client
}

export function getPrismaClient(databaseUrl?: string): PrismaClient {
  if (process.env['NODE_ENV'] !== 'production') {
    if (!globalThis.__prisma)
      globalThis.__prisma = createPrismaClient(databaseUrl)
    return globalThis.__prisma
  }
  return createPrismaClient(databaseUrl)
}

// Base repository with common helpers
export abstract class BaseRepository {
  constructor(protected readonly db: PrismaClient) {}

  protected buildSkip(page: number, limit: number): number {
    return (Math.max(1, page) - 1) * Math.max(1, limit)
  }

  protected async withTransaction<T>(
    fn: (
      tx: Omit<
        PrismaClient,
        | '$connect'
        | '$disconnect'
        | '$on'
        | '$transaction'
        | '$use'
        | '$extends'
      >
    ) => Promise<T>
  ): Promise<T> {
    return this.db.$transaction(fn)
  }
}
