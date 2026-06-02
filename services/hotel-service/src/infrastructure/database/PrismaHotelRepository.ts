import type { PrismaClient, Prisma } from '@prisma/client'
import { fromPrismaError } from '@stayflexi/shared-errors'
import { buildPaginationMeta } from '@stayflexi/shared-types'
import type { PaginatedResult } from '@stayflexi/shared-types'
import { Hotel } from '../../domain/entities/Hotel'
import type { HotelProps, HotelStatus } from '../../domain/entities/Hotel'
import type {
  IHotelRepository,
  CreateHotelData,
  UpdateHotelData,
  HotelFilter,
} from '../../domain/repositories/IHotelRepository'

type PrismaHotel = Prisma.HotelGetPayload<Record<string, never>>

function mapToHotel(raw: PrismaHotel): Hotel {
  return new Hotel({
    id: raw.id,
    organizationId: raw.organizationId,
    name: raw.name,
    slug: raw.slug,
    address: raw.address,
    city: raw.city,
    state: raw.state,
    country: raw.country,
    postalCode: raw.postalCode,
    phone: raw.phone,
    email: raw.email,
    website: raw.website,
    starRating: raw.starRating,
    status: raw.status as HotelProps['status'],
    timezone: raw.timezone,
    checkInTime: raw.checkInTime,
    checkOutTime: raw.checkOutTime,
    metadata: raw.metadata as Record<string, unknown> | null,
    createdById: raw.createdById,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    deletedAt: raw.deletedAt,
  })
}

export class PrismaHotelRepository implements IHotelRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string): Promise<Hotel | null> {
    try {
      const raw = await this.db.hotel.findUnique({ where: { id } })
      return raw ? mapToHotel(raw) : null
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }

  async findBySlug(slug: string): Promise<Hotel | null> {
    try {
      const raw = await this.db.hotel.findUnique({ where: { slug } })
      return raw ? mapToHotel(raw) : null
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }

  async create(data: CreateHotelData): Promise<Hotel> {
    try {
      const raw = await this.db.hotel.create({
        data: {
          organizationId: data.organizationId,
          name: data.name,
          slug: data.slug,
          address: data.address ?? null,
          city: data.city,
          state: data.state ?? null,
          country: data.country,
          postalCode: data.postalCode ?? null,
          phone: data.phone ?? null,
          email: data.email ?? null,
          website: data.website ?? null,
          starRating: data.starRating ?? null,
          timezone: data.timezone ?? 'UTC',
          checkInTime: data.checkInTime ?? '14:00',
          checkOutTime: data.checkOutTime ?? '11:00',
          createdById: data.createdById ?? null,
        },
      })
      return mapToHotel(raw)
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }

  async update(id: string, data: UpdateHotelData): Promise<Hotel> {
    try {
      const raw = await this.db.hotel.update({
        where: { id },
        data: data as Prisma.HotelUpdateInput,
      })
      return mapToHotel(raw)
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }

  async softDelete(id: string): Promise<void> {
    try {
      await this.db.hotel.update({
        where: { id },
        data: { deletedAt: new Date(), status: 'INACTIVE' },
      })
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }

  async findMany(filter: HotelFilter): Promise<PaginatedResult<Hotel>> {
    const skip = (filter.page - 1) * filter.limit

    const where: Prisma.HotelWhereInput = {
      deletedAt: null,
      ...(filter.organizationId !== undefined && {
        organizationId: filter.organizationId,
      }),
      ...(filter.status !== undefined && {
        status: filter.status as HotelStatus,
      }),
    }

    const [records, total] = await Promise.all([
      this.db.hotel.findMany({
        where,
        skip,
        take: filter.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.hotel.count({ where }),
    ])

    return {
      data: records.map(mapToHotel),
      meta: buildPaginationMeta(total, filter.page, filter.limit),
    }
  }
}
