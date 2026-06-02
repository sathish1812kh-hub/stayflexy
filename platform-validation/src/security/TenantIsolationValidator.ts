import type { ValidationResult } from '../types/index'
import { createResult } from '../types/index'

export class TenantIsolationValidator {
  // Validates that a query filter always includes organizationId
  validateTenantFilterPresence(
    query: Record<string, unknown>,
    tenantIdField = 'organizationId',
  ): ValidationResult {
    const start = Date.now()
    const hasFilter =
      tenantIdField in query &&
      query[tenantIdField] !== undefined &&
      query[tenantIdField] !== null &&
      query[tenantIdField] !== ''
    return createResult(
      'TenantFilterPresence',
      hasFilter,
      hasFilter
        ? `Tenant filter present: ${tenantIdField}=${String(query[tenantIdField])}`
        : `Missing tenant filter: ${tenantIdField}`,
      hasFilter
        ? []
        : [`Query missing ${tenantIdField} filter — cross-tenant data leak risk`],
      [],
      Date.now() - start,
    )
  }

  // Validates that data from org A is not accessible to org B
  validateCrossOrgIsolation(
    requestOrgId: string,
    resourceOrgId: string,
    resourceType: string,
  ): ValidationResult {
    const start = Date.now()
    const passed = requestOrgId === resourceOrgId
    return createResult(
      'CrossOrgIsolation',
      passed,
      `${resourceType}: request org=${requestOrgId}, resource org=${resourceOrgId}`,
      passed
        ? []
        : [
            `Cross-org access attempt: ${requestOrgId} accessing ${resourceType} owned by ${resourceOrgId}`,
          ],
      [],
      Date.now() - start,
    )
  }

  // Validates hotel-level isolation within an organization
  validateHotelScopeIsolation(
    userHotelIds: string[],
    resourceHotelId: string,
  ): ValidationResult {
    const start = Date.now()
    const hasAccess =
      userHotelIds.length === 0 || userHotelIds.includes(resourceHotelId)
    return createResult(
      'HotelScopeIsolation',
      hasAccess,
      `User hotels: [${userHotelIds.join(', ')}], resource hotel: ${resourceHotelId}`,
      hasAccess ? [] : [`User does not have access to hotel: ${resourceHotelId}`],
      [],
      Date.now() - start,
    )
  }
}
