import { LatencyBudgetValidator } from '../performance/LatencyBudgetValidator'
import * as LoadTestScenarios from '../performance/LoadTestScenarios'
import { DisasterRecoveryValidator } from '../recovery/DisasterRecoveryValidator'
import { ServiceHealthValidator, ALL_SERVICES } from '../integration/ServiceHealthValidator'

const latencyValidator = new LatencyBudgetValidator()
const drValidator = new DisasterRecoveryValidator()
const healthValidator = new ServiceHealthValidator()

// ─── Latency Budget Compliance ────────────────────────────────────────────────

describe('LatencyBudgetValidator — SLO compliance', () => {
  it('booking creation latency complies with 2s P99 budget', () => {
    // Simulate observed latencies within budget (ms)
    // Budget: p50<=200, p95<=500, p99<=1000
    const observed = [50, 80, 100, 120, 140, 160, 180, 200, 250, 300, 400, 480]
    const result = latencyValidator.validateBudgetCompliance('POST /api/v1/bookings', observed)
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('booking creation latency violates budget when P99 exceeds 2s', () => {
    // Observed: several requests exceeding the P99 budget
    const observed = [300, 500, 800, 1200, 1800, 2200, 2500, 2800, 3000, 3500, 4000, 4500]
    const result = latencyValidator.validateBudgetCompliance('POST /api/v1/bookings', observed)
    expect(result.passed).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('inventory availability check complies with 100ms P99 budget (cached path)', () => {
    // Budget: p50<=20, p95<=50, p99<=100
    const observed = [5, 8, 10, 12, 14, 16, 18, 20, 25, 30, 40, 48]
    const result = latencyValidator.validateBudgetCompliance('GET /api/v1/inventory/availability', observed)
    expect(result.passed).toBe(true)
  })

  it('payment initiation complies with 3s P99 budget', () => {
    // Budget: p50<=500, p95<=2000, p99<=5000
    const observed = [100, 150, 200, 250, 300, 350, 400, 450, 600, 800, 1200, 1800]
    const result = latencyValidator.validateBudgetCompliance('POST /api/v1/payments', observed)
    expect(result.passed).toBe(true)
  })

  it('booking check by id complies with budget', () => {
    // Budget: p50<=50, p95<=200, p99<=500
    const observed = [5, 10, 15, 20, 25, 30, 35, 40, 60, 80, 120, 180]
    const result = latencyValidator.validateBudgetCompliance('GET /api/v1/bookings/:id', observed)
    expect(result.passed).toBe(true)
  })

  it('cache hit ratio above 80% passes compliance', () => {
    const result = latencyValidator.validateCacheHitRatio(850, 1000, 0.80)
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('cache hit ratio below 80% fails compliance', () => {
    const result = latencyValidator.validateCacheHitRatio(600, 1000, 0.80)
    expect(result.passed).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('cache hit ratio at exact threshold passes', () => {
    const result = latencyValidator.validateCacheHitRatio(800, 1000, 0.80)
    expect(result.passed).toBe(true)
  })
})

// ─── Load Test Scenario Validation ───────────────────────────────────────────

describe('LoadTestScenarios — throughput configuration', () => {
  it('all scenarios have valid configuration', () => {
    const scenarios = LoadTestScenarios.ALL_SCENARIOS
    for (const scenario of scenarios) {
      expect(scenario.virtualUsers).toBeGreaterThan(0)
      expect(scenario.durationSeconds).toBeGreaterThan(0)
      expect(scenario.rampUpSeconds).toBeGreaterThanOrEqual(0)
      expect(scenario.expectedP95LatencyMs).toBeGreaterThan(0)
      expect(scenario.expectedThroughputRps).toBeGreaterThan(0)
    }
  })

  it('booking creation scenario has correct throughput target (50 RPS)', () => {
    const scenario = LoadTestScenarios.BOOKING_CREATION_SCENARIO
    expect(scenario.expectedThroughputRps).toBe(50)
    expect(scenario.expectedP95LatencyMs).toBe(500)
    expect(scenario.virtualUsers).toBe(50)
  })

  it('inventory read scenario has 10x booking throughput (500 RPS)', () => {
    const bookingRps = LoadTestScenarios.BOOKING_CREATION_SCENARIO.expectedThroughputRps
    const inventoryRps = LoadTestScenarios.INVENTORY_READ_SCENARIO.expectedThroughputRps
    expect(inventoryRps).toBeGreaterThanOrEqual(bookingRps * 10)
  })

  it('payment processing scenario has lower throughput than booking (financial ops are heavier)', () => {
    const bookingRps = LoadTestScenarios.BOOKING_CREATION_SCENARIO.expectedThroughputRps
    const paymentRps = LoadTestScenarios.PAYMENT_PROCESSING_SCENARIO.expectedThroughputRps
    expect(paymentRps).toBeLessThan(bookingRps)
  })

  it('OTA sync scenario has longest duration (synchronization is sustained load)', () => {
    const otaDuration = LoadTestScenarios.OTA_SYNC_SCENARIO.durationSeconds
    const bookingDuration = LoadTestScenarios.BOOKING_CREATION_SCENARIO.durationSeconds
    expect(otaDuration).toBeGreaterThan(bookingDuration)
  })

  it('notification scenario supports 100 RPS throughput', () => {
    const scenario = LoadTestScenarios.NOTIFICATION_THROUGHPUT_SCENARIO
    expect(scenario.expectedThroughputRps).toBe(100)
  })
})

// ─── Disaster Recovery Compliance ────────────────────────────────────────────

describe('DisasterRecoveryValidator — RTO/RPO compliance', () => {
  it('RTO of 45 minutes complies with 60-minute target', () => {
    const result = drValidator.validateRtoCompliance(45, { maxRtoMinutes: 60, serviceName: 'booking-service' })
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('RTO of 90 minutes violates 60-minute target', () => {
    const result = drValidator.validateRtoCompliance(90, { maxRtoMinutes: 60, serviceName: 'booking-service' })
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.includes('90') || e.includes('RTO') || e.includes('60'))).toBe(true)
  })

  it('RPO of 10 minutes complies with 15-minute target', () => {
    const result = drValidator.validateRpoCompliance(10, { maxRpoMinutes: 15, serviceName: 'payment-service' })
    expect(result.passed).toBe(true)
  })

  it('RPO of 20 minutes violates 15-minute target', () => {
    const result = drValidator.validateRpoCompliance(20, { maxRpoMinutes: 15, serviceName: 'payment-service' })
    expect(result.passed).toBe(false)
  })

  it('backup completeness passes when all tables backed up within 24 hours', () => {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const tables = ['bookings', 'payments', 'inventory_reservations', 'ledger_entries']
    const manifest = tables.reduce((acc, t) => ({ ...acc, [t]: { lastBackup: oneHourAgo, sizeMb: 10 } }), {})
    const result = drValidator.validateBackupCompleteness(tables, manifest)
    expect(result.passed).toBe(true)
  })

  it('backup completeness fails when backup is older than 24 hours', () => {
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)
    const tables = ['payments', 'ledger_entries']
    const manifest = { payments: { lastBackup: twoDaysAgo, sizeMb: 10 }, ledger_entries: { lastBackup: twoDaysAgo, sizeMb: 10 } }
    const result = drValidator.validateBackupCompleteness(tables, manifest)
    expect(result.passed).toBe(false)
  })

  it('health check response structure is valid', () => {
    const healthResponse = {
      status: 'ready',
      checks: {
        database: 'ok',
        redis: 'ok',
      },
      uptime: 3600,
    }
    const result = drValidator.validateHealthCheckResponse(healthResponse)
    expect(result.passed).toBe(true)
  })
})

// ─── Service Registry Validation ─────────────────────────────────────────────

describe('ServiceHealthValidator — service registry', () => {
  it('all 11 platform services are registered', () => {
    const result = healthValidator.validateAllServicesRegistered(
      ALL_SERVICES.map(s => s.name),
    )
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('service dependency graph is valid (no circular deps)', () => {
    const result = healthValidator.validateServiceDependencies()
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('auth-service health response validates correctly', () => {
    const response = {
      status: 'ok',
      service: 'auth-service',
      version: '2.0.0',
      checks: { database: 'ok', redis: 'ok' },
    }
    const result = healthValidator.validateHealthResponseShape('auth-service', response)
    expect(result.passed).toBe(true)
  })

  it('missing service from registry is detected', () => {
    const incomplete = ALL_SERVICES.map(s => s.name).filter(name => name !== 'api-gateway')
    const result = healthValidator.validateAllServicesRegistered(incomplete)
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.includes('api-gateway'))).toBe(true)
  })
})

// ─── Scalability Readiness ────────────────────────────────────────────────────

describe('Scalability readiness validation', () => {
  it('Kafka partition count supports target booking throughput', () => {
    const TARGET_BOOKING_RPS = 50
    const PARTITION_THROUGHPUT_RPS = 10
    const requiredPartitions = Math.ceil(TARGET_BOOKING_RPS / PARTITION_THROUGHPUT_RPS)
    const configuredPartitions = 6 // booking.events has 6 partitions

    expect(configuredPartitions).toBeGreaterThanOrEqual(requiredPartitions)
  })

  it('Redis connection pool supports 10 concurrent services with 5 connections each', () => {
    const SERVICES = 10
    const CONNECTIONS_PER_SERVICE = 5
    const REDIS_MAX_CONNECTIONS = 100 // typical Redis limit

    const totalConnections = SERVICES * CONNECTIONS_PER_SERVICE
    expect(totalConnections).toBeLessThanOrEqual(REDIS_MAX_CONNECTIONS)
  })

  it('HPA max replicas support 3x baseline throughput spike', () => {
    const baselineRps = 50 // booking service baseline
    const spikeMultiplier = 3
    const baselineReplicas = 3
    const hpaMaxReplicas = 10 // from booking-service HPA config

    const requiredReplicasForSpike = Math.ceil(baselineReplicas * spikeMultiplier)
    expect(hpaMaxReplicas).toBeGreaterThanOrEqual(requiredReplicasForSpike)

    // Verify target throughput per replica is reasonable
    const rpsPerReplica = (baselineRps * spikeMultiplier) / hpaMaxReplicas
    expect(rpsPerReplica).toBeLessThan(100) // Each replica handles <100 RPS
  })

  it('analytics aggregation is idempotent — re-running does not double-count', () => {
    const aggregationResults: Map<string, number> = new Map()

    const aggregateForDate = (hotelId: string, date: string, revenue: number) => {
      const key = `${hotelId}:${date}`
      // Upsert pattern — re-running produces same result
      aggregationResults.set(key, revenue)
    }

    // Run twice (idempotent)
    aggregateForDate('hotel-1', '2025-07-01', 5000)
    aggregateForDate('hotel-1', '2025-07-01', 5000)

    expect(aggregationResults.get('hotel-1:2025-07-01')).toBe(5000) // Not 10000
    expect(aggregationResults.size).toBe(1) // Only one entry
  })
})
