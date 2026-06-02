"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceHttpClient = exports.ServiceClientError = void 0;
const http = __importStar(require("http"));
const https = __importStar(require("https"));
class ServiceClientError extends Error {
    statusCode;
    responseBody;
    constructor(message, statusCode, responseBody) {
        super(message);
        this.statusCode = statusCode;
        this.responseBody = responseBody;
        this.name = 'ServiceClientError';
    }
}
exports.ServiceClientError = ServiceClientError;
/**
 * Lightweight HTTP client for service-to-service calls.
 * Propagates correlation ID, auth headers, and service key.
 * Retries transient 5xx and network errors with exponential backoff.
 */
class ServiceHttpClient {
    options;
    timeoutMs;
    maxRetries;
    retryDelayMs;
    constructor(options) {
        this.options = options;
        this.timeoutMs = options.timeoutMs ?? 10_000;
        this.maxRetries = options.maxRetries ?? 3;
        this.retryDelayMs = options.retryDelayMs ?? 200;
    }
    async request(opts) {
        const method = opts.method ?? 'GET';
        let lastError;
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                return await this.doRequest(method, opts);
            }
            catch (err) {
                lastError = err;
                if (err instanceof ServiceClientError && err.statusCode < 500) {
                    throw err; // non-retryable: 4xx client errors
                }
                if (attempt < this.maxRetries) {
                    await this.sleep(this.retryDelayMs * Math.pow(2, attempt - 1));
                }
            }
        }
        throw lastError;
    }
    async get(path, opts = {}) {
        return this.request({ ...opts, method: 'GET', path });
    }
    async post(path, body, opts = {}) {
        return this.request({ ...opts, method: 'POST', path, body });
    }
    async patch(path, body, opts = {}) {
        return this.request({ ...opts, method: 'PATCH', path, body });
    }
    doRequest(method, opts) {
        const url = new URL(opts.path, this.options.baseUrl);
        const lib = url.protocol === 'https:' ? https : http;
        const bodyStr = opts.body !== undefined ? JSON.stringify(opts.body) : undefined;
        const headers = {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Service-Key': this.options.serviceKey,
        };
        if (opts.correlationId)
            headers['X-Correlation-Id'] = opts.correlationId;
        if (opts.organizationId)
            headers['X-Organization-Id'] = opts.organizationId;
        if (opts.userId)
            headers['X-User-Id'] = opts.userId;
        if (opts.userRole)
            headers['X-User-Role'] = opts.userRole;
        if (bodyStr)
            headers['Content-Length'] = Buffer.byteLength(bodyStr).toString();
        return new Promise((resolve, reject) => {
            const req = lib.request({
                hostname: url.hostname,
                port: url.port ? parseInt(url.port, 10) : (url.protocol === 'https:' ? 443 : 80),
                path: url.pathname + url.search,
                method,
                headers,
                timeout: this.timeoutMs,
            }, (res) => {
                const chunks = [];
                res.on('data', (c) => chunks.push(c));
                res.on('end', () => {
                    const raw = Buffer.concat(chunks).toString('utf-8');
                    let parsed;
                    try {
                        parsed = JSON.parse(raw);
                    }
                    catch {
                        parsed = raw;
                    }
                    const status = res.statusCode ?? 0;
                    if (status >= 200 && status < 300) {
                        resolve(parsed);
                    }
                    else {
                        reject(new ServiceClientError(`Service call failed: ${method} ${url.pathname} → ${status}`, status, parsed));
                    }
                });
                res.on('error', reject);
            });
            req.on('timeout', () => {
                req.destroy();
                reject(new ServiceClientError(`Service call timed out: ${method} ${url.pathname}`, 408, null));
            });
            req.on('error', reject);
            if (bodyStr)
                req.write(bodyStr);
            req.end();
        });
    }
    sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }
}
exports.ServiceHttpClient = ServiceHttpClient;
