import { NotFoundError, ForbiddenError } from '@stayflexi/shared-errors'
import type { PrismaRevenueTargetRepository } from '../../infrastructure/database/PrismaRevenueTargetRepository'
import type { RevenueTarget } from '../../domain/entities/RevenueTarget'

export interface RevenuePerformance {
  target: RevenueTarget
  achievementPercent: number | null
  revParAchievementPercent: number | null
  isOnTrack: boolean
  variance: {
    revenue: number | null
    revPar: number | null
    adr: number | null
    occupancy: number | null
  }
}

export class GetRevenuePerformance {
  constructor(private readonly targetRepo: PrismaRevenueTargetRepository) {}

  async execute(hotelId: string, targetPeriod: string, organizationId: string): Promise<RevenuePerformance> {
    const target = await this.targetRepo.findByHotelAndPeriod(hotelId, targetPeriod)
    if (!target) {
      throw new NotFoundError(`Revenue target not found for hotel ${hotelId} in ${targetPeriod}`)
    }
    if (!target.belongsToOrganization(organizationId)) {
      throw new ForbiddenError('Access denied')
    }

    const props = target.toJSON()
    return {
      target,
      achievementPercent: target.revenueAchievementPercent,
      revParAchievementPercent: target.revParAchievementPercent,
      isOnTrack: target.isOnTrack,
      variance: {
        revenue: props.actualRevenue !== null ? props.actualRevenue - props.targetRevenue : null,
        revPar: props.actualRevPar !== null ? props.actualRevPar - props.targetRevPar : null,
        adr: props.actualAdr !== null ? props.actualAdr - props.targetAdr : null,
        occupancy: props.actualOccupancy !== null ? props.actualOccupancy - props.targetOccupancy : null,
      },
    }
  }

  async listByHotel(hotelId: string, organizationId: string): Promise<RevenueTarget[]> {
    const targets = await this.targetRepo.findByHotel(hotelId, organizationId)
    return targets.filter(t => t.belongsToOrganization(organizationId))
  }
}
