import jwt from "jsonwebtoken";
import { env } from "@configs/env";
import { UnauthorizedError } from "@errors/HttpError";

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
  orgId: string | null;
  sid: string;
  type: "access";
  iat: number;
  exp: number;
}

const ACCESS_TOKEN_ALGORITHM = "HS256" as const;

export function generateAccessToken(
  userId: string,
  email: string,
  role: string,
  orgId: string | null,
  sid: string
): string {
  return jwt.sign(
    { sub: userId, email, role, orgId, sid, type: "access" },
    env.JWT_SECRET,
    // jsonwebtoken expects StringValue (ms-compatible) or number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { expiresIn: env.JWT_ACCESS_TOKEN_EXPIRES_IN as any, algorithm: ACCESS_TOKEN_ALGORITHM }
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      algorithms: [ACCESS_TOKEN_ALGORITHM],
    });
    return payload as AccessTokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError("Access token has expired");
    }
    throw new UnauthorizedError("Invalid access token");
  }
}

export function decodeTokenUnsafe(token: string): AccessTokenPayload | null {
  try {
    return jwt.decode(token) as AccessTokenPayload;
  } catch {
    return null;
  }
}

export function getAccessTokenExpiresIn(): number {
  // Returns seconds for the expiresIn value
  const match = env.JWT_ACCESS_TOKEN_EXPIRES_IN.match(/^(\d+)([smhd])$/);
  if (!match) return 900;
  const [, value, unit] = match;
  const num = parseInt(value ?? "0", 10);
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return num * (multipliers[unit ?? "m"] ?? 60);
}
