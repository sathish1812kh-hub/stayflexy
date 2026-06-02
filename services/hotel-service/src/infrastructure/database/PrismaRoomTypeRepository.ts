import type { PrismaClient, Prisma } from '@prisma/client'
import { fromPrismaError } from '@stayflexi/shared-errors'
import { buildPaginationMeta } from '@stayflexi/shared-types'
import type { PaginatedResult } from '@stayflexi/shared-types'
import { RoomType } from '../../domain/entities/RoomType'
import type {
  IRoomTypeRepository,
  CreateRoomTypeData,
  UpdateRoomTypeData,
  RoomTypeFilter,
} from '../../domain/repositories/IRoomTypeRepository'

type PrismaRoomType = Prisma.RoomTypeGetPayload<Record<string, never>>

function mapToRoomType(raw: PrismaRoomType): RoomType {
  return new RoomType({
    id: raw.id,
    hotelId: raw.hotelId,
    organizationId: raw.organizationId,
    name: raw.name,
    description: raw.description,
    basePrice: Number(raw.basePrice),
    maxOccupancy: raw.maxOccupancy,
    maxAdults: raw.maxAdults,
    maxChildren: raw.maxChildren,
    maxInfants: raw.maxInfants,
    minChildAge: raw.minChildAge,
    maxChildAge: raw.maxChildAge,
    minInfantAge: raw.minInfantAge,
    maxInfantAge: raw.maxInfantAge,
    minOccupancy: raw.minOccupancy,
    absoluteMax: raw.absoluteMax,
    hourlyPrice: raw.hourlyPrice ? Number(raw.hourlyPrice) : null,
    extraBedPrice: Number(raw.extraBedPrice),
    extraGuestPrice: Number(raw.extraGuestPrice),
    maxExtraBeds: raw.maxExtraBeds,
    amenities: raw.amenities as string[] | null,
    isActive: raw.isActive,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  })
}

export class PrismaRoomTypeRepository implements IRoomTypeRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string): Promise<RoomType | null> {
    try {
      const raw = await this.db.roomType.findUnique({ where: { id } })
      return raw ? mapToRoomType(raw) : null
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }

  async findByHotelAndName(hotelId: string, name: string): Promise<RoomType | null> {
    try {
      const raw = await this.db.roomType.findUnique({
        where: { hotelId_name: { hotelId, name } },
      })
      return raw ? mapToRoomType(raw) : null
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }

  async create(data: CreateRoomTypeData): Promise<RoomType> {
    try {
      const raw = await this.db.roomType.create({
        data: {
          hotelId: data.hotelId,
          organizationId: data.organizationId,
          name: data.name,
          description: data.description ?? null,
          basePrice: data.basePrice,
          maxOccupancy: data.maxOccupancy,
          maxAdults: data.maxAdults ?? 2,
          maxChildren: data.maxChildren ?? 0,
          maxInfants: data.maxInfants ?? 1,
          minChildAge: data.minChildAge ?? 7,
          maxChildAge: data.maxChildAge ?? 12,
          minInfantAge: data.minInfantAge ?? 0,
          maxInfantAge: data.maxInfantAge ?? 6,
          minOccupancy: data.minOccupancy ?? 1,
          absoluteMax: data.absoluteMax ?? 3,
          hourlyPrice: data.hourlyPrice ?? null,
          extraBedPrice: data.extraBedPrice ?? 0.00,
          extraGuestPrice: data.extraGuestPrice ?? 0.00,
          maxExtraBeds: data.maxExtraBeds ?? 0,
          amenities: data.amenities ?? null,
        },
      })
      return mapToRoomType(raw)
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }

  async update(id: string, data: UpdateRoomTypeData): Promise<RoomType> {
    try {
      const raw = await this.db.roomType.update({
        where: { id },
        data: data as Prisma.RoomTypeUpdateInput,
      })
      return mapToRoomType(raw)
    } catch (err) {
      const mapped = fromPrismaError(err)
      if (mapped) throw mapped
      throw err
    }
  }

  async findMany(filter: RoomTypeFilter): Promise<PaginatedResult<RoomType>> {
    const skip = (filter.page - 1) * filter.limit

    const where: Prisma.RoomTypeWhereInput = {
      hotelId: filter.hotelId,
      ...(filter.isActive !== undefined && { isActive: filter.isActive }),
    }

    const [records, total] = await Promise.all([
      this.db.roomType.findMany({
        where,
        skip,
        take: filter.limit,
        orderBy: { createdAt: 'asc' },
      }),
      this.db.roomType.count({ where }),
    ])

    return {
      data: records.map(mapToRoomType),
      meta: buildPaginationMeta(total, filter.page, filter.limit),
    }
  }
}
