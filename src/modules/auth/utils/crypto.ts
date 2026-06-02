import crypto from "crypto";
import { env } from "@configs/env";

export interface RefreshTokenPair {
  plaintext: string;
  hash: string;
  expiresAt: Date;
}

export function generateRefreshToken(): RefreshTokenPair {
  // Cryptographically secure random token
  const plaintext = crypto.randomBytes(48).toString("base64url");
  const hash = hashToken(plaintext);
  const expiresAt = parseRefreshTokenExpiry(env.JWT_REFRESH_TOKEN_EXPIRES_IN);
  return { plaintext, hash, expiresAt };
}

export function hashToken(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function generateSecureHex(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

export function parseRefreshTokenExpiry(expiresIn: string): Date {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const [, value, unit] = match;
  const num = parseInt(value ?? "7", 10);
  const ms: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return new Date(Date.now() + num * (ms[unit ?? "d"] ?? 86_400_000));
}
