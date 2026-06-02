import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

export interface JwtPayload {
  sub: string // userId
  organizationId?: string
  primaryRole: string
  jti: string // JWT ID for blacklisting
  iat?: number
  exp?: number
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  accessExpiresIn: number // seconds
}

export function generateAccessToken(
  payload: Omit<JwtPayload, 'jti'>,
  secret: string,
  expiresIn = '15m'
): string {
  return jwt.sign({ ...payload, jti: randomUUID() }, secret, {
    expiresIn,
  } as jwt.SignOptions)
}

export function verifyAccessToken(token: string, secret: string): JwtPayload {
  return jwt.verify(token, secret) as JwtPayload
}

export function generateRefreshToken(): string {
  return randomUUID() + '-' + randomUUID() // 72 chars of randomness
}

export async function hashToken(
  token: string,
  rounds = 10
): Promise<string> {
  return bcrypt.hash(token, rounds)
}

export async function compareToken(
  token: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(token, hash)
}

export async function hashPassword(
  password: string,
  rounds = 12
): Promise<string> {
  return bcrypt.hash(password, rounds)
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function decodeTokenUnsafe(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload
  } catch {
    return null
  }
}

// Validate password strength
export interface PasswordValidationResult {
  valid: boolean
  errors: string[]
}

export function validatePasswordStrength(
  password: string
): PasswordValidationResult {
  const errors: string[] = []
  if (password.length < 8)
    errors.push('Password must be at least 8 characters')
  if (!/[A-Z]/.test(password))
    errors.push('Password must contain at least one uppercase letter')
  if (!/[a-z]/.test(password))
    errors.push('Password must contain at least one lowercase letter')
  if (!/[0-9]/.test(password))
    errors.push('Password must contain at least one digit')
  return { valid: errors.length === 0, errors }
}
