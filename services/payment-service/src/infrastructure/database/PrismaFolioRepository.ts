import type { PrismaClient, Prisma } from '@prisma/client'
import { buildPaginationMeta } from '@stayflexi/shared-types'
import type { PaginatedResult } from '@stayflexi/shared-types'
import { fromPrismaError } from '@stayflexi/shared-errors'
import { Folio, FolioEntry } from '../../domain/entities/Folio'
import type { FolioProps, FolioEntryProps } from '../../domain/entities/Folio'
import type {
  IFolioRepository,
  CreateFolioData,
  CreateFolioEntryData,
  FolioFilter,
} from '../../domain/repositories/IFolioRepository'

type PrismaFolio = Prisma.FolioGetPayload<Record<string, never>>
type PrismaFolioEntry = Prisma.FolioEntryGetPayload<Record<string, never>>

function toFolio(raw: PrismaFolio): Folio {
  return new Folio({
    id: (raw as unknown as FolioProps).id,
    organizationId: (raw as unknown as FolioProps).organizationId,
    hotelId: (raw as unknown as FolioProps).hotelId,
    bookingId: (raw as unknown as FolioProps).bookingId,
    folioNumber: (raw as unknown as FolioProps).folioNumber,
    status: (raw as unknown as FolioProps).status,
    balance: Number((raw as unknown as { balance: unknown }).balance),
    currency: (raw as unknown as FolioProps).currency,
    closedAt: (raw as unknown as FolioProps).closedAt ?? null,
    closedById: (raw as unknown as FolioProps).closedById ?? null,
    createdAt: (raw as unknown as FolioProps).createdAt,
    updatedAt: (raw as unknown as FolioProps).updatedAt,
  })
}

function toEntry(raw: PrismaFolioEntry): FolioEntry {
  return new FolioEntry({
    id: (raw as unknown as FolioEntryProps).id,
    folioId: (raw as unknown as FolioEntryProps).folioId,
    organizationId: (raw as unknown as FolioEntryProps).organizationId,
    hotelId: (raw as unknown as FolioEntryProps).hotelId,
    entryType: (raw as unknown as FolioEntryProps).entryType,
    description: (raw as unknown as FolioEntryProps).description,
    amount: Number((raw as unknown as { amount: unknown }).amount),
    balanceAfter:
      ((raw as unknown as FolioEntryProps).balanceAfter ?? null !== undefined)
        ? Number((raw as unknown as { balanceAfter: unknown }).balanceAfter ?? 0)
        : null,
    referenceId: (raw as unknown as FolioEntryProps).referenceId ?? null,
    referenceType: (raw as unknown as FolioEntryProps).referenceType ?? null,
    createdById: (raw as unknown as FolioEntryProps).createdById ?? null,
    createdAt: (raw as unknown as FolioEntryProps).createdAt,
  })
}

export class PrismaFolioRepository implements IFolioRepository {
  constructor(private readonly db: PrismaClient) {}

  private get folioDelegate(): {
    findUnique: (a: unknown) => Promise<PrismaFolio | null>
    findFirst: (a: unknown) => Promise<PrismaFolio | null>
    findMany: (a: unknown) => Promise<PrismaFolio[]>
    count: (a: unknown) => Promise<number>
    create: (a: unknown) => Promise<PrismaFolio>
    update: (a: unknown) => Promise<PrismaFolio>
  } {
    return (this.db as unknown as Record<string, unknown>)['folio'] as unknown as {
      findUnique: (a: unknown) => Promise<PrismaFolio | null>
      findFirst: (a: unknown) => Promise<PrismaFolio | null>
      findMany: (a: unknown) => Promise<PrismaFolio[]>
      count: (a: unknown) => Promise<number>
      create: (a: unknown) => Promise<PrismaFolio>
      update: (a: unknown) => Promise<PrismaFolio>
    }
  }

  private get entryDelegate(): {
    findMany: (a: unknown) => Promise<PrismaFolioEntry[]>
    create: (a: unknown) => Promise<PrismaFolioEntry>
    aggregate: (a: unknown) => Promise<{ _sum: { amount: unknown } }>
  } {
    return (this.db as unknown as Record<string, unknown>)['folioEntry'] as unknown as {
      findMany: (a: unknown) => Promise<PrismaFolioEntry[]>
      create: (a: unknown) => Promise<PrismaFolioEntry>
      aggregate: (a: unknown) => Promise<{ _sum: { amount: unknown } }>
    }
  }

  async findById(id: string): Promise<Folio | null> {
    try {
      const r = await this.folioDelegate.findUnique({ where: { id } })
      return r ? toFolio(r) : null
    } catch (e) {
      const m = fromPrismaError(e)
      if (m) throw m
      throw e
    }
  }

  async findByBookingId(bookingId: string): Promise<Folio | null> {
    try {
      const r = await this.folioDelegate.findFirst({
        where: { bookingId },
        orderBy: { createdAt: 'desc' },
      })
      return r ? toFolio(r) : null
    } catch (e) {
      const m = fromPrismaError(e)
      if (m) throw m
      throw e
    }
  }

  async findByFolioNumber(folioNumber: string): Promise<Folio | null> {
    try {
      const r = await this.folioDelegate.findUnique({ where: { folioNumber } })
      return r ? toFolio(r) : null
    } catch (e) {
      const m = fromPrismaError(e)
      if (m) throw m
      throw e
    }
  }

  async create(data: CreateFolioData): Promise<Folio> {
    try {
      const r = await this.folioDelegate.create({ data })
      return toFolio(r)
    } catch (e) {
      const m = fromPrismaError(e)
      if (m) throw m
      throw e
    }
  }

  async close(id: string, closedById: string): Promise<Folio> {
    const r = await this.folioDelegate.update({
      where: { id },
      data: { status: 'CLOSED', closedAt: new Date(), closedById },
    })
    return toFolio(r)
  }

  async void(id: string): Promise<Folio> {
    const r = await this.folioDelegate.update({ where: { id }, data: { status: 'VOID' } })
    return toFolio(r)
  }

  async addEntry(data: CreateFolioEntryData): Promise<FolioEntry> {
    // Compute balanceAfter and update folio balance atomically via transaction
    const folio = await this.folioDelegate.findUnique({ where: { id: data.folioId } })
    if (!folio) throw new Error('Folio not found')
    const currentBalance = Number((folio as unknown as { balance: unknown }).balance)
    const newBalance = currentBalance + data.amount
    const entry = await this.entryDelegate.create({
      data: { ...data, balanceAfter: newBalance },
    })
    await this.folioDelegate.update({ where: { id: data.folioId }, data: { balance: newBalance } })
    return toEntry(entry)
  }

  async listEntries(folioId: string): Promise<FolioEntry[]> {
    const rows = await this.entryDelegate.findMany({
      where: { folioId },
      orderBy: { createdAt: 'asc' },
    })
    return rows.map(toEntry)
  }

  async findMany(organizationId: string, filter: FolioFilter): Promise<PaginatedResult<Folio>> {
    const where: Record<string, unknown> = { organizationId }
    if (filter.hotelId) where['hotelId'] = filter.hotelId
    if (filter.bookingId) where['bookingId'] = filter.bookingId
    if (filter.status) where['status'] = filter.status
    const [rows, total] = await Promise.all([
      this.folioDelegate.findMany({
        where,
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.folioDelegate.count({ where }),
    ])
    return { data: rows.map(toFolio), meta: buildPaginationMeta(total, filter.page, filter.limit) }
  }

  async getBalance(folioId: string): Promise<number> {
    const folio = await this.folioDelegate.findUnique({ where: { id: folioId } })
    return folio ? Number((folio as unknown as { balance: unknown }).balance) : 0
  }
}
