import { BaseService } from "@lib/baseService";
import { prisma } from "@lib/prisma";
import { type PrismaTransactionClient } from "@lib/baseRepository";
import { NotFoundError, ForbiddenError, BadRequestError } from "@errors/HttpError";
import { type Prisma } from "@prisma/client";
import type { PrismaPaymentRepository } from "../repositories/PrismaPaymentRepository";
import type { PrismaRefundRepository } from "../repositories/PrismaRefundRepository";
import type { PrismaPaymentAuditRepository } from "../repositories/PrismaPaymentAuditRepository";
import type {
  Payment,
  Refund,
  PaymentFilter,
} from "../types";
import type { PaginatedResult } from "@shared-types";
import type { CreatePaymentDtoType, InitiateRefundDtoType, PaymentFilterDtoType, ReconciliationQueryDtoType } from "../dto";
import {
  PAYMENT_ERRORS,
  PAYMENT_REFERENCE_PREFIX,
  REFUND_REFERENCE_PREFIX,
} from "../constants";

function generateReference(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export interface ReconciliationBreakdown {
  byMethod: Record<string, number>;
  byStatus: Record<string, number>;
}

export interface ReconciliationResult {
  hotelId: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  totalCount: number;
  breakdown: ReconciliationBreakdown;
}

export class PaymentService extends BaseService {
  protected readonly moduleName = "PaymentService";

  constructor(
    private readonly paymentRepo: PrismaPaymentRepository,
    private readonly refundRepo: PrismaRefundRepository,
    private readonly auditRepo: PrismaPaymentAuditRepository
  ) {
    super();
  }

  async createPayment(
    dto: CreatePaymentDtoType,
    userId: string,
    orgId: string
  ): Promise<Payment> {
    return this.execute("createPayment", async () => {
      const hotel = await prisma.hotel.findFirst({
        where: { id: dto.hotelId, organizationId: orgId, deletedAt: null },
        select: { id: true },
      });
      if (!hotel) throw new NotFoundError(PAYMENT_ERRORS.HOTEL_NOT_FOUND);

      const booking = await prisma.booking.findFirst({
        where: { id: dto.bookingId, hotelId: dto.hotelId, deletedAt: null },
        select: { id: true, status: true, finalAmount: true },
      });
      if (!booking) throw new NotFoundError(PAYMENT_ERRORS.BOOKING_NOT_FOUND);

      if (booking.status !== "CONFIRMED" && booking.status !== "CHECKED_IN") {
        throw new BadRequestError(PAYMENT_ERRORS.INVALID_BOOKING_STATUS);
      }

      const totalPaid = await this.paymentRepo.getTotalPaidForBooking(dto.bookingId);
      const bookingTotal = booking.finalAmount.toNumber();
      if (totalPaid + dto.amount > bookingTotal) {
        throw new BadRequestError(PAYMENT_ERRORS.OVERPAYMENT);
      }

      const paymentReference = generateReference(PAYMENT_REFERENCE_PREFIX);
      const isCashOrBank = dto.paymentMethod === "CASH" || dto.paymentMethod === "BANK_TRANSFER";
      const paymentStatus = isCashOrBank ? "SUCCESS" : "PENDING";
      const paidAt = isCashOrBank ? new Date() : undefined;

      return prisma.$transaction(async (tx: PrismaTransactionClient) => {
        const payment = await tx.payment.create({
          data: {
            organizationId: orgId,
            hotelId: dto.hotelId,
            bookingId: dto.bookingId,
            paymentReference,
            paymentMethod: dto.paymentMethod,
            paymentProvider: dto.paymentProvider ?? null,
            transactionId: dto.transactionId ?? null,
            paymentStatus,
            amount: dto.amount,
            currency: dto.currency,
            paidAt: paidAt ?? null,
            processedById: userId,
            metadata: dto.metadata !== undefined ? (dto.metadata as Prisma.InputJsonValue) : undefined,
          },
        });

        await tx.paymentAudit.create({
          data: {
            paymentId: payment.id,
            eventType: "CREATED",
            eventDescription: `Payment ${paymentReference} created for booking ${dto.bookingId}`,
            performedById: userId,
          },
        });

        return {
          id: payment.id,
          organizationId: payment.organizationId,
          hotelId: payment.hotelId,
          bookingId: payment.bookingId,
          paymentReference: payment.paymentReference,
          paymentMethod: payment.paymentMethod as Payment["paymentMethod"],
          paymentProvider: payment.paymentProvider ?? null,
          transactionId: payment.transactionId ?? null,
          paymentStatus: payment.paymentStatus as Payment["paymentStatus"],
          amount: payment.amount.toNumber(),
          currency: payment.currency,
          paidAt: payment.paidAt ?? null,
          refundedAt: payment.refundedAt ?? null,
          failureReason: payment.failureReason ?? null,
          metadata: payment.metadata ?? null,
          processedById: payment.processedById,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt,
        };
      });
    });
  }

  async initiateRefund(
    dto: InitiateRefundDtoType,
    userId: string,
    orgId: string
  ): Promise<Refund> {
    return this.execute("initiateRefund", async () => {
      const payment = await this.paymentRepo.findById(dto.paymentId);
      if (!payment) throw new NotFoundError(PAYMENT_ERRORS.NOT_FOUND);
      if (payment.organizationId !== orgId) throw new ForbiddenError(PAYMENT_ERRORS.ACCESS_DENIED);

      if (payment.paymentStatus !== "SUCCESS" && payment.paymentStatus !== "PARTIALLY_REFUNDED") {
        throw new BadRequestError(PAYMENT_ERRORS.INVALID_PAYMENT_STATUS);
      }

      const alreadyRefunded = await this.paymentRepo.getRefundedAmountForPayment(dto.paymentId);
      if (dto.refundAmount + alreadyRefunded > payment.amount) {
        throw new BadRequestError(PAYMENT_ERRORS.REFUND_EXCEEDS_PAID);
      }

      const refundReference = generateReference(REFUND_REFERENCE_PREFIX);
      const isCash = payment.paymentMethod === "CASH";
      const refundStatus = isCash ? "SUCCESS" : "PENDING";
      const totalRefundAfter = dto.refundAmount + alreadyRefunded;
      const newPaymentStatus =
        totalRefundAfter === payment.amount ? "REFUNDED" : "PARTIALLY_REFUNDED";

      return prisma.$transaction(async (tx: PrismaTransactionClient) => {
        const refund = await tx.refund.create({
          data: {
            paymentId: dto.paymentId,
            refundReference,
            refundAmount: dto.refundAmount,
            refundReason: dto.refundReason,
            refundStatus,
            processedById: userId,
            processedAt: isCash ? new Date() : null,
          },
        });

        await tx.payment.update({
          where: { id: dto.paymentId },
          data: {
            paymentStatus: newPaymentStatus,
            refundedAt: new Date(),
          },
        });

        await tx.paymentAudit.create({
          data: {
            paymentId: dto.paymentId,
            eventType: "REFUND_INITIATED",
            eventDescription: `Refund ${refundReference} initiated for ${dto.refundAmount} ${payment.currency}`,
            performedById: userId,
          },
        });

        return {
          id: refund.id,
          paymentId: refund.paymentId,
          refundReference: refund.refundReference,
          refundAmount: refund.refundAmount.toNumber(),
          refundReason: refund.refundReason,
          refundStatus: refund.refundStatus as Refund["refundStatus"],
          processedById: refund.processedById,
          processedAt: refund.processedAt ?? null,
          failureReason: refund.failureReason ?? null,
          createdAt: refund.createdAt,
          updatedAt: refund.updatedAt,
        };
      });
    });
  }

  async getPayment(id: string, orgId: string): Promise<Payment> {
    return this.execute("getPayment", async () => {
      const payment = await this.paymentRepo.findById(id);
      if (!payment) throw new NotFoundError(PAYMENT_ERRORS.NOT_FOUND);
      if (payment.organizationId !== orgId) throw new ForbiddenError(PAYMENT_ERRORS.ACCESS_DENIED);
      return payment;
    });
  }

  async listPayments(
    filter: PaymentFilterDtoType,
    orgId: string
  ): Promise<PaginatedResult<Payment>> {
    return this.execute("listPayments", async () => {
      const hotel = await prisma.hotel.findFirst({
        where: { id: filter.hotelId, organizationId: orgId, deletedAt: null },
        select: { id: true },
      });
      if (!hotel) throw new NotFoundError(PAYMENT_ERRORS.HOTEL_NOT_FOUND);

      const paymentFilter: PaymentFilter = {
        organizationId: orgId,
        hotelId: filter.hotelId,
        bookingId: filter.bookingId,
        status: filter.status,
        method: filter.method,
        page: filter.page,
        limit: filter.limit,
      };

      return this.paymentRepo.findManyFiltered(paymentFilter);
    });
  }

  async getReconciliation(
    dto: ReconciliationQueryDtoType,
    orgId: string
  ): Promise<ReconciliationResult> {
    return this.execute("getReconciliation", async () => {
      const hotel = await prisma.hotel.findFirst({
        where: { id: dto.hotelId, organizationId: orgId, deletedAt: null },
        select: { id: true },
      });
      if (!hotel) throw new NotFoundError(PAYMENT_ERRORS.HOTEL_NOT_FOUND);

      const startDate = new Date(dto.startDate + "T00:00:00.000Z");
      const endDate = new Date(dto.endDate + "T23:59:59.999Z");

      const payments = await prisma.payment.findMany({
        where: {
          hotelId: dto.hotelId,
          organizationId: orgId,
          createdAt: { gte: startDate, lte: endDate },
        },
        select: {
          amount: true,
          paymentMethod: true,
          paymentStatus: true,
        },
      });

      let totalAmount = 0;
      const byMethod: Record<string, number> = {};
      const byStatus: Record<string, number> = {};

      for (const p of payments) {
        const amount = p.amount.toNumber();
        totalAmount += amount;

        const method = p.paymentMethod as string;
        byMethod[method] = (byMethod[method] ?? 0) + amount;

        const status = p.paymentStatus as string;
        byStatus[status] = (byStatus[status] ?? 0) + amount;
      }

      return {
        hotelId: dto.hotelId,
        startDate: dto.startDate,
        endDate: dto.endDate,
        totalAmount,
        totalCount: payments.length,
        breakdown: { byMethod, byStatus },
      };
    });
  }
}
