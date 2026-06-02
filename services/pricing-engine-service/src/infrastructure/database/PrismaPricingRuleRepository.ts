import type { PrismaClient } from '@stayflexi/shared-database'
import { PricingRule } from '../../domain/entities/PricingRule'
import type { PricingRuleProps } from '../../domain/entities/PricingRule'
import type { IPricingRuleRepository, PricingRuleFilters } from '../../domain/repositories/IPricingRuleRepository'

type AnyClient = PrismaClient & Record<string, any>

function toDomain(raw: any): PricingRule {
  return new PricingRule({
    id: raw.id,
    organizationId: raw.organizationId,
    hotelId: raw.hotelId,
    roomTypeId: raw.roomTypeId,
    ruleName: raw.ruleName,
    pricingStrategy: raw.pricingStrategy,
    adjustmentType: raw.adjustmentType,
    adjustmentValue: Number(raw.adjustmentValue),
    minimumPrice: raw.minimumPrice !== null ? Number(raw.minimumPrice) : null,
    maximumPrice: raw.maximumPrice !== null ? Number(raw.maximumPrice) : null,
    applicableDays: raw.applicableDays,
    applicableSeasons: raw.applicableSeasons,
    activeFrom: raw.activeFrom,
    activeTo: raw.activeTo,
    priority: raw.priority,
    status: raw.status,
    createdById: raw.createdById,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  })
}

export class PrismaPricingRuleRepository implements IPricingRuleRepository {
  private get repo() { return (this.db as AnyClient)['pricingRule'] }

  constructor(private readonly db: PrismaClient) {}

  async findById(id: string): Promise<PricingRule | null> {
    const raw = await this.repo.findUnique({ where: { id } })
    return raw ? toDomain(raw) : null
  }

  async findActiveByHotel(hotelId: string, targetDate?: Date): Promise<PricingRule[]> {
    const now = targetDate ?? new Date()
    const rows = await this.repo.findMany({
      where: {
        hotelId,
        status: 'ACTIVE',
        activeFrom: { lte: now },
        OR: [{ activeTo: null }, { activeTo: { gte: now } }],
      },
      orderBy: { priority: 'desc' },
    })
    return rows.map(toDomain)
  }

  async findByOrganization(
    organizationId: string,
    filters: PricingRuleFilters,
  ): Promise<{ data: PricingRule[]; total: number }> {
    const page = filters.page ?? 1
    const limit = filters.limit ?? 20
    const where: Record<string, unknown> = { organizationId }
    if (filters.hotelId) where['hotelId'] = filters.hotelId
    if (filters.roomTypeId) where['roomTypeId'] = filters.roomTypeId
    if (filters.status) where['status'] = filters.status
    if (filters.pricingStrategy) where['pricingStrategy'] = filters.pricingStrategy

    const [rows, total] = await Promise.all([
      this.repo.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { priority: 'desc' } }),
      this.repo.count({ where }),
    ])
    return { data: rows.map(toDomain), total }
  }

  async create(data: Omit<PricingRuleProps, 'id' | 'createdAt' | 'updatedAt'>): Promise<PricingRule> {
    const raw = await this.repo.create({
      data: {
        ...data,
        adjustmentValue: data.adjustmentValue,
        minimumPrice: data.minimumPrice,
        maximumPrice: data.maximumPrice,
      },
    })
    return toDomain(raw)
  }

  async update(id: string, data: Partial<Pick<PricingRuleProps, 'ruleName' | 'adjustmentType' | 'adjustmentValue' | 'minimumPrice' | 'maximumPrice' | 'applicableDays' | 'applicableSeasons' | 'activeFrom' | 'activeTo' | 'priority' | 'status'>>): Promise<PricingRule> {
    const raw = await this.repo.update({ where: { id }, data })
    return toDomain(raw)
  }

  async delete(id: string): Promise<void> {
    await this.repo.update({ where: { id }, data: { status: 'ARCHIVED' } })
  }
}
