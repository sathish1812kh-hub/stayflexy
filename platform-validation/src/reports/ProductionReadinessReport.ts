import type { ValidationResult, ValidationSuite } from '../types/index'
import { runSuite } from '../types/index'

export interface ReadinessReport {
  generatedAt: string
  platform: string
  version: string
  suites: ValidationSuite[]
  overallPassed: boolean
  totalTests: number
  totalPassed: number
  totalFailed: number
  totalDurationMs: number
  criticalFailures: string[]
  summary: string
}

const CRITICAL_VALIDATORS = [
  'OverbookingPrevention',
  'MutualExclusion',
  'CrossOrgIsolation',
  'JwtConfig',
  'RoleHierarchy',
  'TenantFilterPresence',
]

export function generateReadinessReport(
  suites: Array<{ name: string; results: ValidationResult[] }>,
): ReadinessReport {
  const builtSuites = suites.map(s => runSuite(s.name, s.results))
  const allResults = builtSuites.flatMap(s => s.results)

  const totalTests = allResults.length
  const totalPassed = allResults.filter(r => r.passed).length
  const totalFailed = totalTests - totalPassed
  const totalDurationMs = builtSuites.reduce((acc, s) => acc + s.totalDurationMs, 0)

  const criticalFailures = allResults
    .filter(r => !r.passed && CRITICAL_VALIDATORS.includes(r.name))
    .map(r => `[CRITICAL] ${r.name}: ${r.details}`)

  const overallPassed = totalFailed === 0

  const passRate =
    totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : '0.0'
  const summary = overallPassed
    ? `✓ Platform READY: All ${totalTests} validations passed in ${totalDurationMs}ms`
    : `✗ Platform NOT READY: ${totalFailed}/${totalTests} validations failed (${passRate}% pass rate), ${criticalFailures.length} critical`

  return {
    generatedAt: new Date().toISOString(),
    platform: 'Stayflexi',
    version: '2.0.0',
    suites: builtSuites,
    overallPassed,
    totalTests,
    totalPassed,
    totalFailed,
    totalDurationMs,
    criticalFailures,
    summary,
  }
}

export function formatReport(report: ReadinessReport): string {
  const lines: string[] = [
    '═══════════════════════════════════════════════════════════════',
    `  STAYFLEXI PLATFORM VALIDATION REPORT`,
    `  Generated: ${report.generatedAt}`,
    `  Version: ${report.version}`,
    '═══════════════════════════════════════════════════════════════',
    '',
    `  ${report.summary}`,
    '',
    `  Total: ${report.totalTests} | Passed: ${report.totalPassed} | Failed: ${report.totalFailed}`,
    `  Duration: ${report.totalDurationMs}ms`,
    '',
  ]

  if (report.criticalFailures.length > 0) {
    lines.push('  CRITICAL FAILURES:')
    report.criticalFailures.forEach(f => lines.push(`    ${f}`))
    lines.push('')
  }

  for (const suite of report.suites) {
    lines.push(`  ┌─ ${suite.name}: ${suite.passedCount}/${suite.results.length} passed`)
    for (const r of suite.results) {
      const icon = r.passed ? '  ✓' : '  ✗'
      lines.push(`  │  ${icon} ${r.name} (${r.durationMs}ms)`)
      if (!r.passed) {
        r.errors.forEach(e => lines.push(`  │       Error: ${e}`))
      }
    }
    lines.push('  └─')
    lines.push('')
  }

  lines.push('═══════════════════════════════════════════════════════════════')
  return lines.join('\n')
}
