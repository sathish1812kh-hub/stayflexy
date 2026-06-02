// Immutable financial ledger — append-only, derived from payment records.
// When ILedgerRepository is provided, persists proper LedgerEntry rows.
// When absent, falls back to PaymentAudit-based storage for backward compatibility.
import type { PrismaClient } from '@prisma/client'
import { getPrismaClient, Prisma } from '@stayflexi/shared-database'
import type { Logger } from '@stayflexi/shared-logger'
import { LedgerEntry } from '../domain/entities/LedgerEntry'
import type { LedgerEntryProps, LedgerEntryType, LedgerCategory } from '../domain/entities/LedgerEntry'
import type { ILedgerRepository } from '../domain/repositories/ILedgerRepository'
import { randomUUID } from 'crypto'

export interface LedgerBalance {
  organizationId: string
  hotelId: string
  totalDebits: number
  totalCredits: number
  netBalance: number
  currency: string
  entryCount: number
  lastUpdated: Date
}

export class LedgerService {
  constructor(
    private readonly db: PrismaClient = getPrismaClient(),
    private readonly logger: Logger,
    private readonly ledgerRepo?: ILedgerRepository
  ) {}

  /**
   * Record a payment as a CREDIT ledger entry.
   * Uses ledgerRepo if available; otherwise falls back to PaymentAudit.
   */
  async recordPayment(
    organizationId: string, hotelId: string, paymentId: string,
    amount: number, currency: string, performedById: string, correlationId?: string
  ): Promise<void> {
    if (this.ledgerRepo) {
      await this.ledgerRepo.create({
        organizationId, hotelId,
        referenceId: paymentId,
        referenceType: 'Payment',
        entryType: 'CREDIT',
        category: 'PAYMENT',
        amount, currency,
        description: `Payment received: ${amount} ${currency}`,
        correlationId,
      })
    } else {
      const ledgerData: LedgerEntryProps = {
        id: randomUUID(),
        organizationId, hotelId,
        referenceId: paymentId, referenceType: 'Payment',
        entryType: 'CREDIT' as LedgerEntryType,
        category: 'PAYMENT' as LedgerCategory,
        amount, currency,
        description: `Payment received: ${amount} ${currency}`,
        balanceAfter: 0,
        correlationId,
        createdAt: new Date(),
      }

      await this.db.paymentAudit.create({
        data: {
          paymentId,
          eventType: 'SUCCESS',
          eventDescription: `LEDGER:CREDIT:${amount}:${currency}`,
          performedById,
          metadata: ledgerData as unknown as Prisma.InputJsonValue,
        },
      })
    }

    this.logger.info({ paymentId, amount, currency, correlationId }, 'Ledger entry recorded: CREDIT')
  }

  /**
   * Record a refund as a DEBIT ledger entry.
   * Uses ledgerRepo if available; otherwise falls back to PaymentAudit.
   */
  async recordRefund(
    organizationId: string, hotelId: string, paymentId: string,
    refundId: string, amount: number, currency: string, performedById: string, correlationId?: string
  ): Promise<void> {
    if (this.ledgerRepo) {
      await this.ledgerRepo.create({
        organizationId, hotelId,
        referenceId: refundId,
        referenceType: 'Refund',
        entryType: 'DEBIT',
        category: 'REFUND',
        amount, currency,
        description: `Refund issued: ${amount} ${currency}`,
        correlationId,
      })
    } else {
      const ledgerData: LedgerEntryProps = {
        id: randomUUID(),
        organizationId, hotelId,
        referenceId: refundId, referenceType: 'Refund',
        entryType: 'DEBIT' as LedgerEntryType,
        category: 'REFUND' as LedgerCategory,
        amount, currency,
        description: `Refund issued: ${amount} ${currency}`,
        balanceAfter: 0,
        correlationId,
        createdAt: new Date(),
      }

      await this.db.paymentAudit.create({
        data: {
          paymentId,
          eventType: 'REFUND_SUCCESS',
          eventDescription: `LEDGER:DEBIT:${amount}:${currency}`,
          performedById,
          metadata: ledgerData as unknown as Prisma.InputJsonValue,
        },
      })
    }

    this.logger.info({ paymentId, refundId, amount, currency, correlationId }, 'Ledger entry recorded: DEBIT')
  }

  /**
   * Compute ledger balance.
   * Uses ledgerRepo if available; otherwise aggregates from payment/refund tables.
   */
  async getBalance(organizationId: string, hotelId: string, currency = 'USD'): Promise<LedgerBalance> {
    if (this.ledgerRepo) {
      const balance = await this.ledgerRepo.getBalance(organizationId, hotelId, currency)
      const count = await this.db.payment.count({ where: { organizationId, hotelId } })
      return {
        organizationId, hotelId,
        totalDebits: balance.totalDebits,
        totalCredits: balance.totalCredits,
        netBalance: balance.netBalance,
        currency, entryCount: count,
        lastUpdated: new Date(),
      }
    }

    // Fallback: aggregate from payments directly
    const [creditResult, debitResult, count] = await Promise.all([
      this.db.payment.aggregate({
        where: { organizationId, hotelId, paymentStatus: 'SUCCESS', currency },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.db.refund.aggregate({
        where: { payment: { organizationId, hotelId, currency }, refundStatus: 'SUCCESS' },
        _sum: { refundAmount: true },
      }),
      this.db.payment.count({ where: { organizationId, hotelId } }),
    ])

    const totalCredits = creditResult._sum.amount?.toNumber() ?? 0
    const totalDebits = debitResult._sum.refundAmount?.toNumber() ?? 0

    return {
      organizationId, hotelId,
      totalDebits, totalCredits,
      netBalance: totalCredits - totalDebits,
      currency, entryCount: count,
      lastUpdated: new Date(),
    }
  }

  /**
   * Get ledger entries for a reference (payment or refund ID).
   * Uses ledgerRepo if available; otherwise reads from audit trail.
   */
  async getEntries(paymentId: string): Promise<LedgerEntry[]> {
    if (this.ledgerRepo) {
      return this.ledgerRepo.findByReference(paymentId)
    }

    const auditRecords = await this.db.paymentAudit.findMany({
      where: {
        paymentId,
        eventDescription: { startsWith: 'LEDGER:' },
      },
      orderBy: { createdAt: 'asc' },
    })

    return auditRecords.map(record => {
      const metadata = record.metadata as Record<string, unknown> | null
      if (!metadata) return null
      return new LedgerEntry({
        id: String(metadata['id'] ?? record.id),
        organizationId: String(metadata['organizationId'] ?? ''),
        hotelId: String(metadata['hotelId'] ?? ''),
        referenceId: String(metadata['referenceId'] ?? paymentId),
        referenceType: String(metadata['referenceType'] ?? 'Payment'),
        entryType: (metadata['entryType'] as LedgerEntryType) ?? 'CREDIT',
        category: (metadata['category'] as LedgerCategory) ?? 'PAYMENT',
        amount: Number(metadata['amount'] ?? 0),
        currency: String(metadata['currency'] ?? 'USD'),
        description: record.eventDescription,
        balanceAfter: Number(metadata['balanceAfter'] ?? 0),
        createdAt: record.createdAt,
      })
    }).filter((e): e is LedgerEntry => e !== null)
  }
}
