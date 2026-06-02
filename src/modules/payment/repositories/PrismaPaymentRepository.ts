import { type Prisma } from "@prisma/client";
import { BaseRepository, type PrismaTransactionClient } from "@lib/baseRepository";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";
import type {
  Payment,
  CreatePaymentData,
  UpdatePaymentData,
  PaymentFilter,
  PaymentStatusType,
} from "../types";

type PaginationMeta = PaginatedResult<Payment>["meta"];

type PrismaPayment = Prisma.PaymentGetPayload<Record<string, never>>;

function toPayment(r: PrismaPayment): Payment {
  return {
    id: r.id,
    organizationId: r.organizationId,
    hotelId: r.hotelId,
    bookingId: r.bookingId,
    paymentReference: r.paymentReference,
    paymentMethod: r.paymentMethod as Payment["paymentMethod"],
    paymentProvider: r.paymentProvider ?? null,
    transactionId: r.transactionId ?? null,
    paymentStatus: r.paymentStatus as Payment["paymentStatus"],
    amount: r.amount.toNumber(),
    currency: r.currency,
    paidAt: r.paidAt ?? null,
    refundedAt: r.refundedAt ?? null,
    failureReason: r.failureReason ?? null,
    metadata: r.metadata ?? null,
    processedById: r.processedById,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class PrismaPaymentRepository extends BaseRepository<
  Payment,
  CreatePaymentData,
  UpdatePaymentData
> {
  async findById(id: string): Promise<Nullable<Payment>> {
    const r = await this.db.payment.findFirst({
      where: { id },
    });
    return r ? toPayment(r) : null;
  }

  async findByReference(ref: string): Promise<Nullable<Payment>> {
    const r = await this.db.payment.findFirst({
      where: { paymentReference: ref },
    });
    return r ? toPayment(r) : null;
  }

  async findByBooking(bookingId: string): Promise<Payment[]> {
    const records = await this.db.payment.findMany({
      where: { bookingId },
      orderBy: { createdAt: "desc" },
    });
    return records.map(toPayment);
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<Payment>> {
    const skip = this.buildSkip(params);
    const [records, total] = await Promise.all([
      this.db.payment.findMany({
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.payment.count(),
    ]);
    return { data: records.map(toPayment), meta: this.buildPaginationMeta(total, params) };
  }

  async findManyFiltered(filter: PaymentFilter): Promise<{ data: Payment[]; meta: PaginationMeta }> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const params: PaginationParams = { page, limit };
    const skip = this.buildSkip(params);

    const where: Prisma.PaymentWhereInput = {
      ...(filter.organizationId && { organizationId: filter.organizationId }),
      ...(filter.hotelId && { hotelId: filter.hotelId }),
      ...(filter.bookingId && { bookingId: filter.bookingId }),
      ...(filter.status && { paymentStatus: filter.status as PrismaPayment["paymentStatus"] }),
      ...(filter.method && { paymentMethod: filter.method as PrismaPayment["paymentMethod"] }),
    };

    const [records, total] = await Promise.all([
      this.db.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.db.payment.count({ where }),
    ]);

    return { data: records.map(toPayment), meta: this.buildPaginationMeta(total, params) };
  }

  async create(data: CreatePaymentData): Promise<Payment> {
    const r = await this.db.payment.create({
      data: {
        organizationId: data.organizationId,
        hotelId: data.hotelId,
        bookingId: data.bookingId,
        paymentReference: data.paymentReference,
        paymentMethod: data.paymentMethod as PrismaPayment["paymentMethod"],
        paymentProvider: data.paymentProvider ?? null,
        transactionId: data.transactionId ?? null,
        paymentStatus: data.paymentStatus as PrismaPayment["paymentStatus"],
        amount: data.amount,
        currency: data.currency,
        paidAt: data.paidAt ?? null,
        failureReason: data.failureReason ?? null,
        metadata: data.metadata !== undefined ? (data.metadata as Prisma.InputJsonValue) : undefined,
        processedById: data.processedById,
      },
    });
    return toPayment(r);
  }

  async update(id: string, data: UpdatePaymentData): Promise<Payment> {
    const payload: Prisma.PaymentUpdateInput = {};
    if (data.paymentStatus !== undefined) payload.paymentStatus = data.paymentStatus as PrismaPayment["paymentStatus"];
    if (data.paymentProvider !== undefined) payload.paymentProvider = data.paymentProvider;
    if (data.transactionId !== undefined) payload.transactionId = data.transactionId;
    if (data.paidAt !== undefined) payload.paidAt = data.paidAt;
    if (data.refundedAt !== undefined) payload.refundedAt = data.refundedAt;
    if (data.failureReason !== undefined) payload.failureReason = data.failureReason;
    if (data.metadata !== undefined) payload.metadata = data.metadata as Prisma.InputJsonValue;

    const r = await this.db.payment.update({ where: { id }, data: payload });
    return toPayment(r);
  }

  async updateStatus(
    id: string,
    status: PaymentStatusType,
    extra?: Partial<UpdatePaymentData>,
    tx?: PrismaTransactionClient
  ): Promise<Payment> {
    const client = tx ?? this.db;
    const payload: Prisma.PaymentUpdateInput = {
      paymentStatus: status as PrismaPayment["paymentStatus"],
    };
    if (extra?.paidAt !== undefined) payload.paidAt = extra.paidAt;
    if (extra?.refundedAt !== undefined) payload.refundedAt = extra.refundedAt;
    if (extra?.failureReason !== undefined) payload.failureReason = extra.failureReason;
    if (extra?.metadata !== undefined) payload.metadata = extra.metadata as Prisma.InputJsonValue;

    const r = await client.payment.update({ where: { id }, data: payload });
    return toPayment(r);
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.payment.delete({ where: { id } });
  }

  async getTotalPaidForBooking(bookingId: string): Promise<number> {
    const result = await this.db.payment.aggregate({
      where: { bookingId, paymentStatus: "SUCCESS" },
      _sum: { amount: true },
    });
    return result._sum.amount?.toNumber() ?? 0;
  }

  async getRefundedAmountForPayment(paymentId: string): Promise<number> {
    const result = await this.db.refund.aggregate({
      where: { paymentId, refundStatus: "SUCCESS" },
      _sum: { refundAmount: true },
    });
    return result._sum.refundAmount?.toNumber() ?? 0;
  }
}
