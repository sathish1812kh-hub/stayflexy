"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRepository = exports.Prisma = exports.PrismaClient = void 0;
exports.createPrismaClient = createPrismaClient;
exports.getPrismaClient = getPrismaClient;
const client_1 = require("@prisma/client");
Object.defineProperty(exports, "PrismaClient", { enumerable: true, get: function () { return client_1.PrismaClient; } });
Object.defineProperty(exports, "Prisma", { enumerable: true, get: function () { return client_1.Prisma; } });
function createPrismaClient(databaseUrl) {
    const url = databaseUrl ?? process.env['DATABASE_URL'];
    const client = new client_1.PrismaClient({
        datasources: url ? { db: { url } } : undefined,
        log: process.env['NODE_ENV'] === 'development'
            ? ['query', 'warn', 'error']
            : ['warn', 'error'],
        errorFormat: process.env['NODE_ENV'] === 'development' ? 'pretty' : 'minimal',
    });
    return client;
}
function getPrismaClient(databaseUrl) {
    if (process.env['NODE_ENV'] !== 'production') {
        if (!globalThis.__prisma)
            globalThis.__prisma = createPrismaClient(databaseUrl);
        return globalThis.__prisma;
    }
    return createPrismaClient(databaseUrl);
}
// Base repository with common helpers
class BaseRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    buildSkip(page, limit) {
        return (Math.max(1, page) - 1) * Math.max(1, limit);
    }
    async withTransaction(fn) {
        return this.db.$transaction(fn);
    }
}
exports.BaseRepository = BaseRepository;
