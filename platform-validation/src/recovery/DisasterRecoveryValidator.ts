import type { ValidationResult } from '../types/index'
import { createResult } from '../types/index'

export interface RtoRpoConfig {
  maxRtoMinutes?: number // Recovery Time Objective
  maxRpoMinutes?: number // Recovery Point Objective
  serviceName?: string
}

export const PRODUCTION_RTO_RPO: RtoRpoConfig = {
  maxRtoMinutes: 60,
  maxRpoMinutes: 15,
}

export class DisasterRecoveryValidator {
  validateRtoCompliance(actualRtoMinutes: number, config: RtoRpoConfig): ValidationResult {
    const start = Date.now()
    const maxRto = config.maxRtoMinutes ?? 60
    const passed = actualRtoMinutes <= maxRto
    return createResult(
      'RTOCompliance',
      passed,
      `RTO: ${actualRtoMinutes}min (max: ${maxRto}min)`,
      passed ? [] : [`RTO ${actualRtoMinutes}min exceeds maximum ${maxRto}min`],
      [],
      Date.now() - start,
    )
  }

  validateRpoCompliance(actualRpoMinutes: number, config: RtoRpoConfig): ValidationResult {
    const start = Date.now()
    const maxRpo = config.maxRpoMinutes ?? 15
    const passed = actualRpoMinutes <= maxRpo
    return createResult(
      'RPOCompliance',
      passed,
      `RPO: ${actualRpoMinutes}min (max: ${maxRpo}min)`,
      passed ? [] : [`RPO ${actualRpoMinutes}min exceeds maximum ${maxRpo}min`],
      [],
      Date.now() - start,
    )
  }

  validateBackupCompleteness(
    tables: string[],
    backupManifest: Record<string, { lastBackup: Date; sizeMb: number }>,
  ): ValidationResult {
    const start = Date.now()
    const missing: string[] = []
    const stale: string[] = []
    const maxAgeMs = 24 * 60 * 60 * 1000 // 24 hours

    for (const table of tables) {
      const entry = backupManifest[table]
      if (!entry) {
        missing.push(table)
      } else if (Date.now() - entry.lastBackup.getTime() > maxAgeMs) {
        stale.push(table)
      }
    }

    const errors = [
      ...missing.map(t => `Missing backup for table: ${t}`),
      ...stale.map(t => `Stale backup for table: ${t} (>24h old)`),
    ]

    return createResult(
      'BackupCompleteness',
      errors.length === 0,
      `${tables.length - missing.length - stale.length}/${tables.length} tables have current backups`,
      errors,
      [],
      Date.now() - start,
    )
  }

  validateHealthCheckResponse(healthResponse: {
    status: string
    checks: Record<string, string>
  }): ValidationResult {
    const start = Date.now()
    const errors: string[] = []
    const requiredChecks = ['redis', 'database']

    if (healthResponse.status !== 'ready' && healthResponse.status !== 'alive') {
      errors.push(`Unexpected health status: ${healthResponse.status}`)
    }

    for (const check of requiredChecks) {
      const checkResult = healthResponse.checks[check]
      if (checkResult !== 'ok') {
        errors.push(`Health check failed: ${check} = ${checkResult ?? 'missing'}`)
      }
    }

    return createResult(
      'HealthCheckResponse',
      errors.length === 0,
      `Status: ${healthResponse.status}, checks: ${Object.entries(healthResponse.checks)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ')}`,
      errors,
      [],
      Date.now() - start,
    )
  }
}
