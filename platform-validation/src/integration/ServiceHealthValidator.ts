import type { ValidationResult } from '../types/index'
import { createResult } from '../types/index'

export interface ServiceConfig {
  name: string
  baseUrl: string
  healthPath: string
}

export const ALL_SERVICES: ServiceConfig[] = [
  { name: 'api-gateway', baseUrl: 'http://api-gateway:8080', healthPath: '/health/ready' },
  { name: 'auth-service', baseUrl: 'http://auth-service:3001', healthPath: '/health/ready' },
  {
    name: 'organization-service',
    baseUrl: 'http://organization-service:3002',
    healthPath: '/health/ready',
  },
  { name: 'hotel-service', baseUrl: 'http://hotel-service:3003', healthPath: '/health/ready' },
  {
    name: 'inventory-service',
    baseUrl: 'http://inventory-service:3004',
    healthPath: '/health/ready',
  },
  { name: 'booking-service', baseUrl: 'http://booking-service:3005', healthPath: '/health/ready' },
  { name: 'payment-service', baseUrl: 'http://payment-service:3006', healthPath: '/health/ready' },
  { name: 'ota-service', baseUrl: 'http://ota-service:3007', healthPath: '/health/ready' },
  {
    name: 'analytics-service',
    baseUrl: 'http://analytics-service:3008',
    healthPath: '/health/ready',
  },
  {
    name: 'notification-service',
    baseUrl: 'http://notification-service:3009',
    healthPath: '/health/ready',
  },
  {
    name: 'workflow-service',
    baseUrl: 'http://workflow-service:3010',
    healthPath: '/health/ready',
  },
]

export class ServiceHealthValidator {
  // Validates health response shape
  validateHealthResponseShape(serviceName: string, response: unknown): ValidationResult {
    const start = Date.now()
    const errors: string[] = []

    if (typeof response !== 'object' || response === null) {
      return createResult(
        `${serviceName}:HealthShape`,
        false,
        'Invalid response',
        ['Response is not an object'],
        [],
        Date.now() - start,
      )
    }

    const r = response as Record<string, unknown>
    if (typeof r['status'] !== 'string') {
      errors.push('Missing or non-string "status" field')
    } else if (!['ready', 'alive', 'ok', 'healthy'].includes(r['status'].toLowerCase())) {
      errors.push(`Unexpected status value: ${r['status']}`)
    }

    return createResult(
      `${serviceName}:HealthShape`,
      errors.length === 0,
      `Service: ${serviceName}, status: ${String(r['status'] ?? 'unknown')}`,
      errors,
      [],
      Date.now() - start,
    )
  }

  validateAllServicesRegistered(registeredServices: string[]): ValidationResult {
    const start = Date.now()
    const expectedNames = ALL_SERVICES.map(s => s.name)
    const missing = expectedNames.filter(n => !registeredServices.includes(n))
    const extra = registeredServices.filter(n => !expectedNames.includes(n))

    return createResult(
      'AllServicesRegistered',
      missing.length === 0,
      `${registeredServices.length} registered, ${missing.length} missing, ${extra.length} extra`,
      missing.map(n => `Missing service registration: ${n}`),
      extra.map(n => `Extra service: ${n} (not in expected list)`),
      Date.now() - start,
    )
  }

  validateServiceDependencies(): ValidationResult {
    const start = Date.now()
    // Defines the dependency graph — booking depends on inventory, payment, notification
    const dependencies: Record<string, string[]> = {
      'booking-service': [
        'inventory-service',
        'payment-service',
        'notification-service',
        'hotel-service',
      ],
      'payment-service': ['booking-service'],
      'notification-service': [],
      'inventory-service': ['hotel-service'],
      'ota-service': ['inventory-service', 'booking-service'],
      'analytics-service': ['booking-service', 'payment-service'],
      'workflow-service': ['notification-service'],
      'auth-service': [],
      'organization-service': ['auth-service'],
      'hotel-service': ['organization-service'],
    }

    const allServices = new Set(ALL_SERVICES.map(s => s.name))
    const errors: string[] = []

    for (const [svc, deps] of Object.entries(dependencies)) {
      if (!allServices.has(svc)) {
        errors.push(`Unknown service in dependency map: ${svc}`)
      }
      for (const dep of deps) {
        if (!allServices.has(dep)) {
          errors.push(`${svc} depends on unknown service: ${dep}`)
        }
      }
    }

    return createResult(
      'ServiceDependencies',
      errors.length === 0,
      `Dependency graph validated for ${allServices.size} services`,
      errors,
      [],
      Date.now() - start,
    )
  }
}
