import type { PrismaClient, Prisma } from '@prisma/client'
import { getPrismaClient } from '@stayflexi/shared-database'
import { fromPrismaError } from '@stayflexi/shared-errors'
import { buildPaginationMeta } from '@stayflexi/shared-types'
import { GuestEntity } from '../../domain/entities/Guest'
import type { IGuestRepository } from '../../domain/repositories/IGuestRepository'
import type { PaginatedResult } from '@stayflexi/shared-types'

type JsonValue = Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput

type PrismaGuest = Prisma.GuestGetPayload<Record<string, never>>

function mapToGuest(raw: PrismaGuest): GuestEntity {
  return GuestEntity.fromPrisma({
    id: raw.id,
    organizationId: raw.organizationId,
    hotelId: raw.hotelId,
    firstName: raw.firstName,
    lastName: raw.lastName,
    email: raw.email,
    phone: raw.phone,
    nationality: raw.nationality,
    dateOfBirth: raw.dateOfBirth,
    governmentIdType: raw.governmentIdType,
    governmentIdNumber: raw.governmentIdNumber,
    preferences: raw.preferences as Record<string, unknown> | null,
    loyaltyTier: raw.loyaltyTier,
    loyaltyPoints: raw.loyaltyPoints,
    metadata: raw.metadata as Record<string, unknown> | null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    deletedAt: raw.deletedAt,
  })
}

export class PrismaGuestRepository implements IGuestRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async create(data: {
    organizationId: string
    hotelId?: string | null
    firstName: string
    lastName: string
    email?: string | null
    phone?: string | null
    nationality?: string | null
    dateOfBirth?: Date | null
    governmentIdType?: GuestEntity['governmentIdType']
    governmentIdNumber?: string | null
    preferences?: Record<string, unknown> | null
    loyaltyTier?: string | null
    loyaltyPoints?: number
    metadata?: Record<string, unknown> | null
  }): Promise<GuestEntity> {
    const existing = data.email
      ? await this.db.guest.findFirst({
          where: { email: data.email, organizationId: data.organizationId, deletedAt: null },
        })
      : null

    if (existing) {
      throw new Error('CONFLICT: A guest with this email already exists in this organization')
    }

    try {
      const raw = await this.db.guest.create({
        data: {
          organizationId: data.organizationId,
          hotelId: data.hotelId ?? null,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email ?? null,
          phone: data.phone ?? null,
          nationality: data.nationality ?? null,
          dateOfBirth: data.dateOfBirth ?? null,
          governmentIdType: data.governmentIdType ?? null,
          governmentIdNumber: data.governmentIdNumber ?? null,
          preferences: data.preferences as JsonValue,
          loyaltyTier: data.loyaltyTier ?? null,
          loyaltyPoints: data.loyaltyPoints ?? 0,
          metadata: data.metadata as JsonValue,
        },
      })
      return mapToGuest(raw)
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }

  async findById(id: string, organizationId?: string | null): Promise<GuestEntity | null> {
    const raw = await this.db.guest.findFirst({
      where: {
        id,
        ...(organizationId ? { organizationId } : {}),
        deletedAt: null,
      },
    })
    return raw ? mapToGuest(raw) : null
  }

  async findByEmail(email: string, organizationId: string): Promise<GuestEntity | null> {
    const raw = await this.db.guest.findFirst({
      where: { email, organizationId, deletedAt: null },
    })
    return raw ? mapToGuest(raw) : null
  }

  async update(
    id: string,
    data: Partial<{
      hotelId: string | null
      firstName: string
      lastName: string
      email: string | null
      phone: string | null
      nationality: string | null
      dateOfBirth: Date | null
      governmentIdType: GuestEntity['governmentIdType']
      governmentIdNumber: string | null
      preferences: Record<string, unknown> | null
      loyaltyTier: string | null
      loyaltyPoints: number
      metadata: Record<string, unknown> | null
    }>,
    organizationId?: string | null,
  ): Promise<GuestEntity> {
    const existing = await this.db.guest.findFirst({
      where: { id, ...(organizationId ? { organizationId } : {}), deletedAt: null },
    })
    if (!existing) throw new Error('NOT_FOUND: Guest not found')

    if (data.email && data.email !== existing.email) {
      const conflict = await this.db.guest.findFirst({
        where: {
          email: data.email,
          organizationId: organizationId ?? existing.organizationId,
          id: { not: id },
          deletedAt: null,
        },
      })
      if (conflict) throw new Error('CONFLICT: A guest with this email already exists')
    }

    try {
      const raw = await this.db.guest.update({
        where: { id },
        data: {
          ...(data.hotelId !== undefined && { hotelId: data.hotelId }),
          ...(data.firstName !== undefined && { firstName: data.firstName }),
          ...(data.lastName !== undefined && { lastName: data.lastName }),
          ...(data.email !== undefined && { email: data.email }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(data.nationality !== undefined && { nationality: data.nationality }),
          ...(data.dateOfBirth !== undefined && { dateOfBirth: data.dateOfBirth }),
          ...(data.governmentIdType !== undefined && { governmentIdType: data.governmentIdType }),
          ...(data.governmentIdNumber !== undefined && {
            governmentIdNumber: data.governmentIdNumber,
          }),
          ...(data.preferences !== undefined && { preferences: data.preferences as JsonValue }),
          ...(data.loyaltyTier !== undefined && { loyaltyTier: data.loyaltyTier }),
          ...(data.loyaltyPoints !== undefined && { loyaltyPoints: data.loyaltyPoints }),
          ...(data.metadata !== undefined && { metadata: data.metadata as JsonValue }),
        },
      })
      return mapToGuest(raw)
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }

  async delete(id: string, organizationId?: string | null): Promise<void> {
    const existing = await this.db.guest.findFirst({
      where: { id, ...(organizationId ? { organizationId } : {}), deletedAt: null },
    })
    if (!existing) throw new Error('NOT_FOUND: Guest not found')

    await this.db.guest.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  async list(
    organizationId: string,
    options?: {
      hotelId?: string | null
      search?: string
      loyaltyTier?: string
      page?: number
      limit?: number
    },
  ): Promise<PaginatedResult<GuestEntity>> {
    const page = options?.page ?? 1
    const limit = options?.limit ?? 20
    const skip = (page - 1) * limit

    const where: Prisma.GuestWhereInput = {
      organizationId,
      deletedAt: null,
    }
    if (options?.hotelId) where.hotelId = options.hotelId
    if (options?.loyaltyTier) where.loyaltyTier = options.loyaltyTier
    if (options?.search) {
      where.OR = [
        { firstName: { contains: options.search, mode: 'insensitive' } },
        { lastName: { contains: options.search, mode: 'insensitive' } },
        { email: { contains: options.search, mode: 'insensitive' } },
      ]
    }

    const [records, total] = await Promise.all([
      this.db.guest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.db.guest.count({ where }),
    ])

    return {
      data: records.map(mapToGuest),
      meta: buildPaginationMeta(total, page, limit),
    }
  }

  async findOrCreateByEmail(data: {
    organizationId: string
    hotelId?: string | null
    email: string
    firstName: string
    lastName: string
    phone?: string | null
    nationality?: string | null
    dateOfBirth?: Date | null
    governmentIdType?: GuestEntity['governmentIdType']
    governmentIdNumber?: string | null
  }): Promise<GuestEntity> {
    const existing = await this.findByEmail(data.email, data.organizationId)
    if (existing) return existing

    return this.create({
      organizationId: data.organizationId,
      hotelId: data.hotelId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      nationality: data.nationality,
      dateOfBirth: data.dateOfBirth,
      governmentIdType: data.governmentIdType,
      governmentIdNumber: data.governmentIdNumber,
    })
  }
}
