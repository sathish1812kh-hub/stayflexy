export interface ValidationResult {
  passed: boolean
  name: string
  details: string
  errors: string[]
  warnings: string[]
  durationMs: number
}

export interface ValidationSuite {
  name: string
  results: ValidationResult[]
  passedCount: number
  failedCount: number
  totalDurationMs: number
}

export function createResult(
  name: string,
  passed: boolean,
  details: string,
  errors: string[] = [],
  warnings: string[] = [],
  durationMs = 0,
): ValidationResult {
  return { passed, name, details, errors, warnings, durationMs }
}

export function runSuite(name: string, results: ValidationResult[]): ValidationSuite {
  return {
    name,
    results,
    passedCount: results.filter(r => r.passed).length,
    failedCount: results.filter(r => !r.passed).length,
    totalDurationMs: results.reduce((acc, r) => acc + r.durationMs, 0),
  }
}
