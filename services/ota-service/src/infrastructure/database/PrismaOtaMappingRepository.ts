import { getPrismaClient, Prisma } from '@stayflexi/shared-database'
import { fromPrismaError } from '@stayflexi/shared-errors'
import type { PrismaClient } from '@prisma/client'
import { OtaMapping } from '../../domain/entities/OtaMapping'
import type { OtaMappingProps } from '../../domain/entities/OtaMapping'
import type {
  IOtaMappingRepository,
  CreateOtaMappingData,
} from '../../domain/repositories/IOtaMappingRepository'

type PrismaOTAMapping = {
  id: string
  organizationId: string
  hotelId: string
  roomTypeId: string | null
  providerId: string
  externalHotelId: string
  externalRoomTypeId: string | null
  syncStatus: string
  isActive: boolean
  lastSyncedAt: Date | null
  metadata: unknown
  createdAt: Date
  updatedAt: Date
}

function mapToEntity(r: PrismaOTAMapping): OtaMapping {
  const props: OtaMappingProps = {
    id: r.id,
    organizationId: r.organizationId,
    hotelId: r.hotelId,
    roomTypeId: r.roomTypeId,
    providerId: r.providerId,
    externalHotelId: r.externalHotelId,
    externalRoomTypeId: r.externalRoomTypeId,
    syncStatus: r.syncStatus,
    isActive: r.isActive,
    lastSyncedAt: r.lastSyncedAt,
    metadata: r.metadata,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
  return new OtaMapping(props)
}

type SyncStatusInput = Parameters<PrismaClient['oTAMapping']['create']>[0]['data']['syncStatus']

export class PrismaOtaMappingRepository implements IOtaMappingRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async findById(id: string): Promise<OtaMapping | null> {
    try {
      const r = await this.db.oTAMapping.findUnique({ where: { id } })
      return r ? mapToEntity(r) : null
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async findByHotelAndProvider(hotelId: string, providerId: string): Promise<OtaMapping[]> {
    try {
      const records = await this.db.oTAMapping.findMany({
        where: { hotelId, providerId },
        orderBy: { createdAt: 'desc' },
      })
      return records.map(mapToEntity)
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async findByOrganization(organizationId: string, hotelId?: string): Promise<OtaMapping[]> {
    try {
      const records = await this.db.oTAMapping.findMany({
        where: {
          organizationId,
          ...(hotelId !== undefined && { hotelId }),
        },
        orderBy: { createdAt: 'desc' },
      })
      return records.map(mapToEntity)
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async findActiveForHotel(hotelId: string): Promise<OtaMapping[]> {
    try {
      const records = await this.db.oTAMapping.findMany({
        where: { hotelId, isActive: true },
        orderBy: { createdAt: 'desc' },
      })
      return records.map(mapToEntity)
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async create(data: CreateOtaMappingData): Promise<OtaMapping> {
    try {
      const r = await this.db.oTAMapping.create({
        data: {
          organizationId: data.organizationId,
          hotelId: data.hotelId,
          roomTypeId: data.roomTypeId ?? null,
          providerId: data.providerId,
          externalHotelId: data.externalHotelId,
          externalRoomTypeId: data.externalRoomTypeId ?? null,
          syncStatus: (data.syncStatus ?? 'PENDING') as SyncStatusInput,
          isActive: data.isActive ?? true,
          metadata: data.metadata !== undefined ? (data.metadata as Prisma.InputJsonValue) : undefined,
        },
      })
      return mapToEntity(r)
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async update(id: string, data: Partial<CreateOtaMappingData>): Promise<OtaMapping> {
    try {
      const r = await this.db.oTAMapping.update({
        where: { id },
        data: {
          ...(data.externalHotelId !== undefined && { externalHotelId: data.externalHotelId }),
          ...(data.externalRoomTypeId !== undefined && { externalRoomTypeId: data.externalRoomTypeId }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
          ...(data.syncStatus !== undefined && { syncStatus: data.syncStatus as SyncStatusInput }),
          ...(data.metadata !== undefined && {
            metadata: data.metadata as Prisma.InputJsonValue,
          }),
        },
      })
      return mapToEntity(r)
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async deactivate(id: string): Promise<OtaMapping> {
    try {
      const r = await this.db.oTAMapping.update({
        where: { id },
        data: { isActive: false },
      })
      return mapToEntity(r)
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async updateSyncStatus(id: string, status: string): Promise<OtaMapping> {
    try {
      const r = await this.db.oTAMapping.update({
        where: { id },
        data: {
          syncStatus: status as SyncStatusInput,
          lastSyncedAt: new Date(),
        },
      })
      return mapToEntity(r)
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }
}
