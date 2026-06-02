export declare function getCorrelationId(): string;
export declare function correlationMiddleware(req: {
    headers: Record<string, string | string[] | undefined>;
} & Record<string, unknown>, res: {
    setHeader(k: string, v: string): void;
}, next: () => void): void;
