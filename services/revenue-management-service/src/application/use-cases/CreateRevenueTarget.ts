import { ConflictError, BadRequestError } from '@stayflexi/shared-errors'
import type { PrismaRevenueTargetRepository } from '../../infrastructure/database/PrismaRevenueTargetRepository'
import type { IEventPublisher } from '@stayflexi/shared-events'
import type { Logger } from '@stayflexi/shared-logger'
import type { RevenueTarget } from '../../domain/entities/RevenueTarget'
import { REVENUE_EVENTS } from '../../events/revenueEvents'

export interface CreateRevenueTargetDto {
  organizationId: string
  hotelId: string
  targetPeriod: string          // YYYY-MM
  targetRevenue: number
  targetRevPar: number
  targetAdr: number
  targetOccupancy: number       // 0.0–1.0
  createdById: string
}

export class CreateRevenueTarget {
  constructor(
    private readonly targetRepo: PrismaRevenueTargetRepository,
    private readonly eventPublisher: IEventPublisher,
    private readonly logger: Logger,
  ) {}

  async execute(dto: CreateRevenueTargetDto): Promise<RevenueTarget> {
    if (!/^\d{4}-\d{2}$/.test(dto.targetPeriod)) {
      throw new BadRequestError('targetPeriod must be in YYYY-MM format')
    }
    if (dto.targetOccupancy < 0 || dto.targetOccupancy > 1) {
      throw new BadRequestError('targetOccupancy must be between 0.0 and 1.0')
    }
    if (dto.targetRevenue <= 0 || dto.targetAdr <= 0 || dto.targetRevPar <= 0) {
      throw new BadRequestError('Revenue targets must be positive')
    }

    const existing = await this.targetRepo.findByHotelAndPeriod(dto.hotelId, dto.targetPeriod)
    if (existing) {
      throw new ConflictError(`Revenue target for ${dto.hotelId} in ${dto.targetPeriod} already exists`)
    }

    const target = await this.targetRepo.create(dto)

    setImmediate(() => {
      void this.eventPublisher.publish('pricing.events', {
        eventType: REVENUE_EVENTS.TARGET_CREATED,
        aggregateId: target.id,
        aggregateType: 'RevenueTarget',
        organizationId: dto.organizationId,
        payload: {
          targetId: target.id,
          hotelId: dto.hotelId,
          targetPeriod: dto.targetPeriod,
          targetRevenue: dto.targetRevenue,
        },
      }).catch(() => {})
    })

    this.logger.info({
      targetId: target.id,
      hotelId: dto.hotelId,
      targetPeriod: dto.targetPeriod,
      targetRevenue: dto.targetRevenue,
    }, 'Revenue target created')

    return target
  }
}
