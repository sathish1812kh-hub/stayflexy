import { getPrismaClient, Prisma } from '@stayflexi/shared-database'
import { buildPaginationMeta } from '@stayflexi/shared-types'
import { fromPrismaError } from '@stayflexi/shared-errors'
import type { PrismaClient } from '@prisma/client'
import { Payment } from '../../domain/entities/Payment'
import { Refund } from '../../domain/entities/Refund'
import type { PaymentProps, PaymentStatus, PaymentMethod } from '../../domain/entities/Payment'
import type { RefundProps, RefundStatus } from '../../domain/entities/Refund'
import type { IPaymentRepository, CreatePaymentData, CreateRefundData, PaymentSearchParams } from '../../domain/repositories/IPaymentRepository'
import type { PaginatedResult } from '@stayflexi/shared-types'
import { randomUUID } from 'crypto'

type PrismaPayment = Prisma.PaymentGetPayload<Record<string, never>>
type PrismaRefund = Prisma.RefundGetPayload<Record<string, never>>

function mapToPayment(r: PrismaPayment): Payment {
  return new Payment({
    id: r.id, organizationId: r.organizationId, hotelId: r.hotelId, bookingId: r.bookingId,
    paymentReference: r.paymentReference, paymentMethod: r.paymentMethod as PaymentMethod,
    paymentProvider: r.paymentProvider, transactionId: r.transactionId,
    paymentStatus: r.paymentStatus as PaymentStatus,
    amount: r.amount.toNumber(), currency: r.currency,
    paidAt: r.paidAt, refundedAt: r.refundedAt, failureReason: r.failureReason,
    metadata: r.metadata as Record<string, unknown> | null,
    processedById: r.processedById, createdAt: r.createdAt, updatedAt: r.updatedAt,
  })
}

function mapToRefund(r: PrismaRefund): Refund {
  return new Refund({
    id: r.id, paymentId: r.paymentId, refundReference: r.refundReference,
    refundAmount: r.refundAmount.toNumber(), refundReason: r.refundReason,
    refundStatus: r.refundStatus as RefundStatus,
    processedById: r.processedById, processedAt: r.processedAt, failureReason: r.failureReason,
    createdAt: r.createdAt, updatedAt: r.updatedAt,
  })
}

function generatePaymentReference(): string {
  return `PAY-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`
}

export class PrismaPaymentRepository implements IPaymentRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async findById(id: string): Promise<Payment | null> {
    try {
      const r = await this.db.payment.findUnique({ where: { id } })
      return r ? mapToPayment(r) : null
    } catch (err) { const e = fromPrismaError(err); if (e) throw e; throw err }
  }

  async findByReference(paymentReference: string): Promise<Payment | null> {
    const r = await this.db.payment.findUnique({ where: { paymentReference } })
    return r ? mapToPayment(r) : null
  }

  async findByOrganization(params: PaymentSearchParams): Promise<PaginatedResult<Payment>> {
    const skip = (params.page - 1) * params.limit
    const where: Prisma.PaymentWhereInput = {
      organizationId: params.organizationId,
      ...(params.hotelId && { hotelId: params.hotelId }),
      ...(params.bookingId && { bookingId: params.bookingId }),
      ...(params.paymentStatus && { paymentStatus: params.paymentStatus as PrismaPayment['paymentStatus'] }),
      ...(params.paymentMethod && { paymentMethod: params.paymentMethod as PrismaPayment['paymentMethod'] }),
      ...((params.startDate || params.endDate) && {
        createdAt: {
          ...(params.startDate && { gte: params.startDate }),
          ...(params.endDate && { lte: params.endDate }),
        },
      }),
    }
    const [records, total] = await Promise.all([
      this.db.payment.findMany({ where, skip, take: params.limit, orderBy: { createdAt: 'desc' } }),
      this.db.payment.count({ where }),
    ])
    return { data: records.map(mapToPayment), meta: buildPaginationMeta(total, params.page, params.limit) }
  }

  async getTotalRefunded(paymentId: string): Promise<number> {
    const result = await this.db.refund.aggregate({
      where: { paymentId, refundStatus: 'SUCCESS' },
      _sum: { refundAmount: true },
    })
    return result._sum.refundAmount?.toNumber() ?? 0
  }

  async getRefunds(paymentId: string): Promise<Refund[]> {
    const records = await this.db.refund.findMany({ where: { paymentId }, orderBy: { createdAt: 'desc' } })
    return records.map(mapToRefund)
  }

  async create(data: CreatePaymentData): Promise<Payment> {
    try {
      const paymentReference = data.paymentReference ?? generatePaymentReference()
      const r = await this.db.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            organizationId: data.organizationId, hotelId: data.hotelId, bookingId: data.bookingId,
            paymentReference,
            paymentMethod: data.paymentMethod as PrismaPayment['paymentMethod'],
            paymentProvider: data.paymentProvider ?? null,
            transactionId: data.transactionId ?? null,
            paymentStatus: 'PENDING',
            amount: new Prisma.Decimal(data.amount),
            currency: data.currency,
            processedById: data.processedById,
            metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
          },
        })
        await tx.paymentAudit.create({
          data: { paymentId: payment.id, eventType: 'CREATED', eventDescription: 'Payment initiated', performedById: data.processedById },
        })
        return payment
      })
      return mapToPayment(r)
    } catch (err) { const e = fromPrismaError(err); if (e) throw e; throw err }
  }

  async updateStatus(id: string, status: PaymentStatus, extra?: {
    paidAt?: Date; refundedAt?: Date; failureReason?: string; transactionId?: string
  }): Promise<Payment> {
    const r = await this.db.payment.update({
      where: { id },
      data: {
        paymentStatus: status as PrismaPayment['paymentStatus'],
        ...(extra?.paidAt && { paidAt: extra.paidAt }),
        ...(extra?.refundedAt && { refundedAt: extra.refundedAt }),
        ...(extra?.failureReason !== undefined && { failureReason: extra.failureReason }),
        ...(extra?.transactionId !== undefined && { transactionId: extra.transactionId }),
      },
    })
    return mapToPayment(r)
  }

  async createRefund(data: CreateRefundData): Promise<Refund> {
    try {
      const r = await this.db.refund.create({
        data: {
          paymentId: data.paymentId,
          refundReference: data.refundReference,
          refundAmount: new Prisma.Decimal(data.refundAmount),
          refundReason: data.refundReason,
          refundStatus: 'SUCCESS',
          processedById: data.processedById,
          processedAt: new Date(),
        },
      })
      return mapToRefund(r)
    } catch (err) { const e = fromPrismaError(err); if (e) throw e; throw err }
  }

  async updateRefundStatus(refundId: string, status: string, processedAt?: Date, failureReason?: string): Promise<Refund> {
    const r = await this.db.refund.update({
      where: { id: refundId },
      data: {
        refundStatus: status as PrismaRefund['refundStatus'],
        ...(processedAt && { processedAt }),
        ...(failureReason !== undefined && { failureReason }),
      },
    })
    return mapToRefund(r)
  }

  async addAuditEntry(paymentId: string, eventType: string, description: string, performedById: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.db.paymentAudit.create({
      data: {
        paymentId,
        eventType: eventType as PrismaPayment['paymentStatus'],
        eventDescription: description,
        performedById,
        ...(metadata && { metadata: metadata as Prisma.InputJsonValue }),
      },
    })
  }

  async aggregateByPeriod(organizationId: string, hotelId: string | undefined, startDate: Date, endDate: Date): Promise<{
    totalCollected: number; totalRefunded: number; netRevenue: number
    byMethod: Array<{ method: string; count: number; amount: number }>; transactionCount: number
  }> {
    const where: Prisma.PaymentWhereInput = {
      organizationId, paymentStatus: 'SUCCESS',
      createdAt: { gte: startDate, lte: endDate },
      ...(hotelId && { hotelId }),
    }

    const [byMethod, refundTotal, transactionCount] = await Promise.all([
      this.db.payment.groupBy({
        by: ['paymentMethod'],
        where,
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.db.refund.aggregate({
        where: { payment: { ...where }, refundStatus: 'SUCCESS' },
        _sum: { refundAmount: true },
      }),
      this.db.payment.count({ where }),
    ])

    const totalCollected = byMethod.reduce((sum, g) => sum + (g._sum.amount?.toNumber() ?? 0), 0)
    const totalRefunded = refundTotal._sum.refundAmount?.toNumber() ?? 0

    return {
      totalCollected, totalRefunded, netRevenue: totalCollected - totalRefunded,
      byMethod: byMethod.map(g => ({
        method: g.paymentMethod,
        count: g._count.id,
        amount: g._sum.amount?.toNumber() ?? 0,
      })),
      transactionCount,
    }
  }
}
