"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceClientError = exports.ServiceHttpClient = void 0;
exports.extractAuthUser = extractAuthUser;
exports.buildPaginationMeta = buildPaginationMeta;
exports.parsePaginationParams = parsePaginationParams;
exports.successResponse = successResponse;
exports.paginatedSuccess = paginatedSuccess;
// Extract from Express request headers (x-user-id, x-organization-id, x-user-role, x-correlation-id, x-service-key)
function extractAuthUser(headers, serviceKey) {
    const userId = Array.isArray(headers['x-user-id'])
        ? headers['x-user-id'][0]
        : headers['x-user-id'];
    const correlationId = (Array.isArray(headers['x-correlation-id'])
        ? headers['x-correlation-id'][0]
        : headers['x-correlation-id']) ?? '';
    const serviceKeyHeader = Array.isArray(headers['x-service-key'])
        ? headers['x-service-key'][0]
        : headers['x-service-key'];
    if (serviceKeyHeader && serviceKeyHeader === serviceKey) {
        return {
            userId: 'service',
            organizationId: null,
            primaryRole: 'SERVICE',
            correlationId,
            isServiceCall: true,
        };
    }
    if (!userId)
        return null;
    const orgId = Array.isArray(headers['x-organization-id'])
        ? headers['x-organization-id'][0]
        : headers['x-organization-id'];
    const role = Array.isArray(headers['x-user-role'])
        ? headers['x-user-role'][0]
        : headers['x-user-role'];
    return {
        userId,
        organizationId: orgId ?? null,
        primaryRole: role ?? 'FRONT_DESK',
        correlationId,
        isServiceCall: false,
    };
}
function buildPaginationMeta(total, page, limit) {
    const totalPages = Math.ceil(total / limit);
    return {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
    };
}
function parsePaginationParams(query) {
    const page = Math.max(1, parseInt(String(query['page'] ?? '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(query['limit'] ?? '20'), 10)));
    return { page, limit };
}
function successResponse(data, correlationId) {
    return { success: true, data, correlationId };
}
// Service-to-service HTTP client
var service_client_1 = require("./service-client");
Object.defineProperty(exports, "ServiceHttpClient", { enumerable: true, get: function () { return service_client_1.ServiceHttpClient; } });
Object.defineProperty(exports, "ServiceClientError", { enumerable: true, get: function () { return service_client_1.ServiceClientError; } });
function paginatedSuccess(data, meta, correlationId) {
    return { success: true, data, meta, correlationId };
}
