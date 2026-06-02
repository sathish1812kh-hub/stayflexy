import pino from 'pino';
import pinoHttp from 'pino-http';
export interface LoggerOptions {
    level?: 'debug' | 'info' | 'warn' | 'error';
    prettyPrint?: boolean;
    serviceName: string;
    environment?: string;
}
export type Logger = pino.Logger;
export declare function createLogger(options: LoggerOptions): Logger;
export declare function createRequestLogger(logger: Logger): ReturnType<typeof pinoHttp>;
