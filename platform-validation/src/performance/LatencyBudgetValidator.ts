import type { ValidationResult } from '../types/index'
import { createResult } from '../types/index'

export interface LatencyBudget {
  endpoint: string
  p50Ms: number
  p95Ms: number
  p99Ms: number
}

export const SERVICE_LATENCY_BUDGETS: LatencyBudget[] = [
  { endpoint: 'GET /api/v1/bookings/:id', p50Ms: 50, p95Ms: 200, p99Ms: 500 },
  { endpoint: 'POST /api/v1/bookings', p50Ms: 200, p95Ms: 500, p99Ms: 1000 },
  { endpoint: 'GET /api/v1/inventory/availability', p50Ms: 20, p95Ms: 50, p99Ms: 100 },
  { endpoint: 'POST /api/v1/payments', p50Ms: 500, p95Ms: 2000, p99Ms: 5000 },
  { endpoint: 'GET /api/v1/hotels', p50Ms: 30, p95Ms: 100, p99Ms: 250 },
  { endpoint: 'POST /api/v1/notifications', p50Ms: 50, p95Ms: 200, p99Ms: 500 },
  { endpoint: 'GET /health/ready', p50Ms: 5, p95Ms: 20, p99Ms: 50 },
]

export class LatencyBudgetValidator {
  validateBudgetCompliance(
    endpoint: string,
    observedLatencies: number[],
  ): ValidationResult {
    const start = Date.now()
    const budget = SERVICE_LATENCY_BUDGETS.find(b => b.endpoint === endpoint)

    if (!budget) {
      return createResult(
        `LatencyBudget:${endpoint}`,
        false,
        `No latency budget defined for endpoint: ${endpoint}`,
        [`Missing budget for: ${endpoint}`],
        [],
        Date.now() - start,
      )
    }

    if (observedLatencies.length === 0) {
      return createResult(
        `LatencyBudget:${endpoint}`,
        false,
        'No latency observations provided',
        ['Empty latency array'],
        [],
        Date.now() - start,
      )
    }

    const sorted = [...observedLatencies].sort((a, b) => a - b)
    const p50 = sorted[Math.floor(sorted.length * 0.5)] ?? 0
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0
    const p99 = sorted[Math.floor(sorted.length * 0.99)] ?? 0

    const errors: string[] = []
    if (p50 > budget.p50Ms) errors.push(`P50 ${p50}ms exceeds budget ${budget.p50Ms}ms`)
    if (p95 > budget.p95Ms) errors.push(`P95 ${p95}ms exceeds budget ${budget.p95Ms}ms`)
    if (p99 > budget.p99Ms) errors.push(`P99 ${p99}ms exceeds budget ${budget.p99Ms}ms`)

    return createResult(
      `LatencyBudget:${endpoint}`,
      errors.length === 0,
      `P50=${p50}ms P95=${p95}ms P99=${p99}ms (budget: P50≤${budget.p50Ms} P95≤${budget.p95Ms} P99≤${budget.p99Ms})`,
      errors,
      [],
      Date.now() - start,
    )
  }

  validateCacheHitRatio(hits: number, total: number, minRatio: number): ValidationResult {
    const start = Date.now()
    if (total === 0) {
      return createResult(
        'CacheHitRatio',
        false,
        'No requests observed',
        ['total=0'],
        [],
        Date.now() - start,
      )
    }
    const ratio = hits / total
    const passed = ratio >= minRatio
    return createResult(
      'CacheHitRatio',
      passed,
      `Hit ratio: ${(ratio * 100).toFixed(1)}% (${hits}/${total}, min: ${(minRatio * 100).toFixed(0)}%)`,
      passed
        ? []
        : [
            `Cache hit ratio ${(ratio * 100).toFixed(1)}% below minimum ${(minRatio * 100).toFixed(0)}%`,
          ],
      [],
      Date.now() - start,
    )
  }
}
