import type { ValidationResult } from '../types/index'
import { createResult } from '../types/index'

export interface JwtConfig {
  algorithm: string
  expiresInSeconds: number
  issuer?: string
  audience?: string
  minimumSecretLength: number
}

export const PRODUCTION_JWT_CONFIG: JwtConfig = {
  algorithm: 'HS256',
  expiresInSeconds: 900, // 15 minutes
  minimumSecretLength: 32,
}

export class JwtSecurityValidator {
  validateJwtConfig(config: JwtConfig): ValidationResult {
    const start = Date.now()
    const errors: string[] = []
    const warnings: string[] = []

    const allowedAlgorithms = [
      'HS256',
      'HS384',
      'HS512',
      'RS256',
      'RS384',
      'RS512',
      'ES256',
      'ES384',
      'ES512',
    ]
    if (!allowedAlgorithms.includes(config.algorithm)) {
      errors.push(`Insecure or unknown JWT algorithm: ${config.algorithm}`)
    }

    if (config.expiresInSeconds > 86400) {
      errors.push(`Access token expiry too long: ${config.expiresInSeconds}s (max: 86400s)`)
    }
    if (config.expiresInSeconds > 3600) {
      warnings.push(
        `Access token expiry ${config.expiresInSeconds}s is long — consider ≤ 900s`,
      )
    }

    if (config.minimumSecretLength < 32) {
      errors.push(
        `JWT secret too short: minimum ${config.minimumSecretLength} chars (require ≥ 32)`,
      )
    }

    return createResult(
      'JwtConfig',
      errors.length === 0,
      `JWT algorithm: ${config.algorithm}, expiry: ${config.expiresInSeconds}s`,
      errors,
      warnings,
      Date.now() - start,
    )
  }

  validateTokenStructure(token: string): ValidationResult {
    const start = Date.now()
    const errors: string[] = []

    const parts = token.split('.')
    if (parts.length !== 3) {
      return createResult(
        'TokenStructure',
        false,
        `Invalid JWT structure: ${parts.length} parts`,
        ['JWT must have 3 parts (header.payload.signature)'],
        [],
        Date.now() - start,
      )
    }

    try {
      const header = JSON.parse(
        Buffer.from(parts[0] ?? '', 'base64url').toString('utf-8'),
      ) as Record<string, unknown>
      if (!header['alg']) errors.push('JWT header missing alg claim')
      if (!header['typ'] || header['typ'] !== 'JWT')
        errors.push('JWT header missing or invalid typ claim')
    } catch {
      errors.push('Could not parse JWT header')
    }

    try {
      const payload = JSON.parse(
        Buffer.from(parts[1] ?? '', 'base64url').toString('utf-8'),
      ) as Record<string, unknown>
      if (!payload['sub']) errors.push('JWT payload missing sub claim')
      if (!payload['exp']) errors.push('JWT payload missing exp claim')
      if (!payload['iat']) errors.push('JWT payload missing iat claim')
      if (!payload['jti']) errors.push('JWT payload missing jti claim (needed for revocation)')

      if (
        payload['exp'] &&
        payload['iat'] &&
        typeof payload['exp'] === 'number' &&
        typeof payload['iat'] === 'number' &&
        payload['exp'] <= payload['iat']
      ) {
        errors.push('JWT exp must be after iat')
      }
    } catch {
      errors.push('Could not parse JWT payload')
    }

    return createResult(
      'TokenStructure',
      errors.length === 0,
      `JWT structure validated`,
      errors,
      [],
      Date.now() - start,
    )
  }

  validateSecretStrength(secret: string): ValidationResult {
    const start = Date.now()
    const errors: string[] = []
    const warnings: string[] = []

    if (secret.length < 32) {
      errors.push(`Secret too short: ${secret.length} chars (minimum: 32)`)
    }
    if (secret.length < 64) {
      warnings.push(`Secret is ${secret.length} chars — 64+ recommended for production`)
    }

    const weakSecrets = ['secret', 'password', 'jwt-secret', 'changeme', 'test-secret', 'your-secret']
    if (weakSecrets.some(w => secret.toLowerCase().includes(w))) {
      errors.push('Secret contains weak/default value')
    }

    // Check entropy: should have uppercase, lowercase, digits, symbols
    const hasUpper = /[A-Z]/.test(secret)
    const hasLower = /[a-z]/.test(secret)
    const hasDigit = /[0-9]/.test(secret)
    if (!hasUpper || !hasLower || !hasDigit) {
      warnings.push(
        'Secret lacks character variety (uppercase + lowercase + digits recommended)',
      )
    }

    return createResult(
      'SecretStrength',
      errors.length === 0,
      `Secret length: ${secret.length} chars`,
      errors,
      warnings,
      Date.now() - start,
    )
  }
}
