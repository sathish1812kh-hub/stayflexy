import { getPrismaClient, Prisma } from '@stayflexi/shared-database'
import type { PrismaClient } from '@prisma/client'
import { LedgerEntry } from '../../domain/entities/LedgerEntry'
import type { LedgerEntryType, LedgerCategory } from '../../domain/entities/LedgerEntry'
import type { ILedgerRepository, CreateLedgerEntryData, LedgerBalance } from '../../domain/repositories/ILedgerRepository'

// The Prisma LedgerEntry model is defined in the schema but may not yet be present
// in the generated client at compile-time (migration pending). We use `any` casting
// on the client delegate to forward-compat until `prisma generate` runs.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = PrismaClient & Record<string, any>

export class PrismaLedgerRepository implements ILedgerRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  private get ledger(): AnyClient['ledgerEntry'] {
    return (this.db as AnyClient)['ledgerEntry']
  }

  async create(data: CreateLedgerEntryData): Promise<LedgerEntry> {
    const record = await this.ledger.create({
      data: {
        organizationId: data.organizationId,
        hotelId: data.hotelId,
        referenceId: data.referenceId,
        referenceType: data.referenceType,
        entryType: data.entryType,
        category: data.category,
        amount: new Prisma.Decimal(data.amount),
        currency: data.currency,
        description: data.description,
        correlationId: data.correlationId ?? null,
      },
    })

    return this.mapToEntity(record)
  }

  async findByReference(referenceId: string): Promise<LedgerEntry[]> {
    const records = await this.ledger.findMany({
      where: { referenceId },
      orderBy: { createdAt: 'asc' },
    })

    return records.map((record: unknown) => this.mapToEntity(record))
  }

  async getBalance(organizationId: string, hotelId: string, currency: string): Promise<LedgerBalance> {
    const [creditResult, debitResult] = await Promise.all([
      this.ledger.aggregate({
        where: { organizationId, hotelId, currency, entryType: 'CREDIT' },
        _sum: { amount: true },
      }),
      this.ledger.aggregate({
        where: { organizationId, hotelId, currency, entryType: 'DEBIT' },
        _sum: { amount: true },
      }),
    ])

    const totalCredits: number = creditResult._sum?.amount?.toNumber?.() ?? 0
    const totalDebits: number = debitResult._sum?.amount?.toNumber?.() ?? 0

    return {
      totalCredits,
      totalDebits,
      netBalance: totalCredits - totalDebits,
    }
  }

  private mapToEntity(record: unknown): LedgerEntry {
    const r = record as {
      id: string
      organizationId: string
      hotelId: string
      referenceId: string
      referenceType: string
      entryType: string
      category: string
      amount: { toNumber: () => number }
      currency: string
      description: string
      correlationId: string | null
      createdAt: Date
    }

    return new LedgerEntry({
      id: r.id,
      organizationId: r.organizationId,
      hotelId: r.hotelId,
      referenceId: r.referenceId,
      referenceType: r.referenceType,
      entryType: r.entryType as LedgerEntryType,
      category: r.category as LedgerCategory,
      amount: r.amount.toNumber(),
      currency: r.currency,
      description: r.description,
      balanceAfter: 0, // Not stored in DB; computed lazily when needed
      correlationId: r.correlationId ?? undefined,
      createdAt: r.createdAt,
    })
  }
}
