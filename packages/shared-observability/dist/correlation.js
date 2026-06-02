"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCorrelationId = getCorrelationId;
exports.correlationMiddleware = correlationMiddleware;
const async_hooks_1 = require("async_hooks");
const crypto_1 = require("crypto");
const storage = new async_hooks_1.AsyncLocalStorage();
function getCorrelationId() {
    return storage.getStore()?.correlationId ?? 'no-context';
}
// ─── Express-compatible middleware ────────────────────────────────────────────
// Uses inline interface definitions to avoid adding 'express' as a runtime dep.
function correlationMiddleware(req, res, next) {
    const raw = req['headers']['x-correlation-id'];
    const correlationId = (Array.isArray(raw) ? raw[0] : raw) ?? (0, crypto_1.randomUUID)();
    res.setHeader('x-correlation-id', correlationId);
    storage.run({ correlationId }, () => {
        // Attach to the request object for downstream handler access
        req['correlationId'] = correlationId;
        next();
    });
}
