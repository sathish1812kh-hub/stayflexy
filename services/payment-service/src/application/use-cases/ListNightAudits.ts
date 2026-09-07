import type {
  INightAuditRepository,
  NightAuditFilter,
} from '../../domain/repositories/INightAuditRepository'
export class ListNightAudits {
  constructor(private readonly auditRepo: INightAuditRepository) {}
  async execute(organizationId: string, filter: NightAuditFilter) {
    return this.auditRepo.findMany(organizationId, filter)
  }
}
