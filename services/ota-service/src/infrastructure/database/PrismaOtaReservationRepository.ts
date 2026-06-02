import { getPrismaClient, Prisma } from '@stayflexi/shared-database'
import { fromPrismaError } from '@stayflexi/shared-errors'
import type { PrismaClient } from '@prisma/client'
import { OtaReservation } from '../../domain/entities/OtaReservation'
import type { OtaReservationProps } from '../../domain/entities/OtaReservation'
import type {
  IOtaReservationRepository,
  CreateOtaReservationData,
  ReservationFilters,
  UpdateReservationData,
} from '../../domain/repositories/IOtaReservationRepository'

type PrismaOTAReservation = {
  id: string
  organizationId: string
  hotelId: string
  providerId: string
  externalReservationId: string
  bookingId: string | null
  syncStatus: string
  rawPayload: unknown
  importedAt: Date | null
  errorMessage: string | null
  createdAt: Date
  updatedAt: Date
}

function mapToEntity(r: PrismaOTAReservation): OtaReservation {
  const props: OtaReservationProps = {
    id: r.id,
    organizationId: r.organizationId,
    hotelId: r.hotelId,
    providerId: r.providerId,
    externalReservationId: r.externalReservationId,
    bookingId: r.bookingId,
    syncStatus: r.syncStatus as OtaReservationProps['syncStatus'],
    rawPayload: r.rawPayload,
    importedAt: r.importedAt,
    errorMessage: r.errorMessage,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
  return new OtaReservation(props)
}

type ReservationSyncStatusInput = Parameters<PrismaClient['oTAReservation']['create']>[0]['data']['syncStatus']

export class PrismaOtaReservationRepository implements IOtaReservationRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async findById(id: string): Promise<OtaReservation | null> {
    try {
      const r = await this.db.oTAReservation.findUnique({ where: { id } })
      return r ? mapToEntity(r) : null
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async findByExternalId(providerId: string, externalId: string): Promise<OtaReservation | null> {
    try {
      const r = await this.db.oTAReservation.findUnique({
        where: { providerId_externalReservationId: { providerId, externalReservationId: externalId } },
      })
      return r ? mapToEntity(r) : null
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async findByHotel(
    hotelId: string,
    filters?: ReservationFilters,
  ): Promise<{ data: OtaReservation[]; total: number }> {
    try {
      const page = filters?.page ?? 1
      const limit = filters?.limit ?? 20
      const skip = (Math.max(1, page) - 1) * Math.max(1, limit)

      const where = {
        hotelId,
        ...(filters?.providerId !== undefined && { providerId: filters.providerId }),
        ...(filters?.syncStatus !== undefined && {
          syncStatus: filters.syncStatus as ReservationSyncStatusInput,
        }),
      }

      const [records, total] = await Promise.all([
        this.db.oTAReservation.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.db.oTAReservation.count({ where }),
      ])

      return { data: records.map(mapToEntity), total }
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async findPendingForHotel(hotelId: string): Promise<OtaReservation[]> {
    try {
      const records = await this.db.oTAReservation.findMany({
        where: { hotelId, syncStatus: 'PENDING' as ReservationSyncStatusInput },
        orderBy: { createdAt: 'asc' },
      })
      return records.map(mapToEntity)
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async create(data: CreateOtaReservationData): Promise<OtaReservation> {
    try {
      const r = await this.db.oTAReservation.create({
        data: {
          organizationId: data.organizationId,
          hotelId: data.hotelId,
          providerId: data.providerId,
          externalReservationId: data.externalReservationId,
          syncStatus: (data.syncStatus ?? 'PENDING') as ReservationSyncStatusInput,
          rawPayload: data.rawPayload as Prisma.InputJsonValue,
        },
      })
      return mapToEntity(r)
    } catch (err) {
      const e = fromPrismaError(err)
      if (e) throw e
      throw err
    }
  }

  async updateStatus(id: string, status: string, data?: UpdateReservationData): Promise<OtaReservation> {
    try {
      const r = await this.db.oTAReservation.update({
        where: { id },
        data: {
          syncStatus: status as ReservationSyncStatusInput,
          ...(data?.bookingId !== undefined && { bookingId: data.bookingId }),
          ...(data?.importedAt !== undefined && { importedAt: data.importedAt }),
          ...(data?.errorMessage !== undefined && { errorMessage: data.errorMessage }),
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
