import type { PrismaClient, Prisma } from '@prisma/client'
import { getPrismaClient } from '@stayflexi/shared-database'
import { fromPrismaError } from '@stayflexi/shared-errors'
import { Member } from '../../domain/entities/Member'
import type { IMemberRepository, CreateMemberData } from '../../domain/repositories/IMemberRepository'

type PrismaMember = Prisma.OrganizationMemberGetPayload<Record<string, never>>

function mapToMember(raw: PrismaMember): Member {
  return new Member({
    id: raw.id,
    organizationId: raw.organizationId,
    userId: raw.userId,
    isOwner: raw.isOwner,
    joinedAt: raw.joinedAt,
    removedAt: raw.removedAt,
  })
}

export class PrismaMemberRepository implements IMemberRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async findByOrgAndUser(
    organizationId: string,
    userId: string
  ): Promise<Member | null> {
    const raw = await this.db.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    })
    return raw ? mapToMember(raw) : null
  }

  async findActiveByOrg(
    organizationId: string,
    page: number,
    limit: number
  ): Promise<{ members: Member[]; total: number }> {
    const skip = (page - 1) * limit
    const where: Prisma.OrganizationMemberWhereInput = {
      organizationId,
      removedAt: null,
    }
    const [records, total] = await Promise.all([
      this.db.organizationMember.findMany({
        where,
        skip,
        take: limit,
        orderBy: { joinedAt: 'asc' },
      }),
      this.db.organizationMember.count({ where }),
    ])
    return { members: records.map(mapToMember), total }
  }

  async create(data: CreateMemberData): Promise<Member> {
    try {
      const raw = await this.db.organizationMember.create({
        data: {
          organizationId: data.organizationId,
          userId: data.userId,
          isOwner: data.isOwner ?? false,
        },
      })
      return mapToMember(raw)
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }

  async remove(organizationId: string, userId: string): Promise<void> {
    await this.db.organizationMember.updateMany({
      where: { organizationId, userId, removedAt: null },
      data: { removedAt: new Date() },
    })
  }

  async countActiveByOrg(organizationId: string): Promise<number> {
    return this.db.organizationMember.count({
      where: { organizationId, removedAt: null },
    })
  }
}
