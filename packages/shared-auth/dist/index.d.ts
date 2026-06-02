export interface JwtPayload {
    sub: string;
    organizationId?: string;
    primaryRole: string;
    jti: string;
    iat?: number;
    exp?: number;
}
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    accessExpiresIn: number;
}
export declare function generateAccessToken(payload: Omit<JwtPayload, 'jti'>, secret: string, expiresIn?: string): string;
export declare function verifyAccessToken(token: string, secret: string): JwtPayload;
export declare function generateRefreshToken(): string;
export declare function hashToken(token: string, rounds?: number): Promise<string>;
export declare function compareToken(token: string, hash: string): Promise<boolean>;
export declare function hashPassword(password: string, rounds?: number): Promise<string>;
export declare function verifyPassword(password: string, hash: string): Promise<boolean>;
export declare function decodeTokenUnsafe(token: string): JwtPayload | null;
export interface PasswordValidationResult {
    valid: boolean;
    errors: string[];
}
export declare function validatePasswordStrength(password: string): PasswordValidationResult;
