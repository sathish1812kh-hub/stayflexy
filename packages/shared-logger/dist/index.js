"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = createLogger;
exports.createRequestLogger = createRequestLogger;
const pino_1 = __importDefault(require("pino"));
const pino_http_1 = __importDefault(require("pino-http"));
function createLogger(options) {
    const isDev = (options.environment ?? process.env['NODE_ENV'] ?? 'development') ===
        'development';
    return (0, pino_1.default)({
        name: options.serviceName,
        level: options.level ?? (isDev ? 'debug' : 'info'),
        base: {
            service: options.serviceName,
            env: options.environment ?? process.env['NODE_ENV'],
        },
        timestamp: pino_1.default.stdTimeFunctions.isoTime,
        ...(isDev
            ? {
                transport: {
                    target: 'pino-pretty',
                    options: {
                        colorize: true,
                        translateTime: 'SYS:standard',
                        ignore: 'pid,hostname',
                    },
                },
            }
            : {}),
    });
}
function createRequestLogger(logger) {
    return (0, pino_http_1.default)({
        logger,
        customLogLevel: (_req, res) => {
            if (res.statusCode >= 500)
                return 'error';
            if (res.statusCode >= 400)
                return 'warn';
            return 'info';
        },
        customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
        customReceivedMessage: (req) => `Incoming ${req.method} ${req.url}`,
        serializers: {
            req: (req) => ({
                method: req['method'],
                url: req['url'],
                correlationId: req['headers']?.['x-correlation-id'],
            }),
            res: (res) => ({
                statusCode: res['statusCode'],
            }),
        },
    });
}
