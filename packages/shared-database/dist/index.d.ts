import { PrismaClient, Prisma } from '@prisma/client';
export { PrismaClient, Prisma };
declare global {
    var __prisma: PrismaClient | undefined;
}
export declare function createPrismaClient(databaseUrl?: string): PrismaClient;
export declare function getPrismaClient(databaseUrl?: string): PrismaClient;
export declare abstract class BaseRepository {
    protected readonly db: PrismaClient;
    constructor(db: PrismaClient);
    protected buildSkip(page: number, limit: number): number;
    protected withTransaction<T>(fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>): Promise<T>;
}
