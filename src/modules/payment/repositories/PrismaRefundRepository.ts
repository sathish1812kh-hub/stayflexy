import { type Prisma } from "@prisma/client";
import { BaseRepository } from "@lib/baseRepository";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";
import type { Refund, CreateRefundData, UpdateRefundData, RefundStatusType } from "../types";

type PrismaRefund = Prisma.RefundGetPayload<Record<string, never>>;

function toRefund(r: PrismaRefund): Refund {
  return {
    id: r.id,
    paymentId: r.paymentId,
    refundReference: r.refundReference,
    refundAmount: r.refundAmount.toNumber(),
    refundReason: r.refundReason,
    refundStatus: r.refundStatus as Refund["refundStatus"],
    processedById: r.processedById,
    processedAt: r.processedAt ?? null,
    failureReason: r.failureReason ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export class PrismaRefundRepository extends BaseRepository<
  Refund,
  CreateRefundData,
  UpdateRefundData
> {
  async findById(id: string): Promise<Nullable<Refund>> {
    const r = await this.db.refund.findFirst({ where: { id } });
    return r ? toRefund(r) : null;
  }

  async findByPayment(paymentId: string): Promise<Refund[]> {
    const records = await this.db.refund.findMany({
      where: { paymentId },
      orderBy: { createdAt: "desc" },
    });
    return records.map(toRefund);
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<Refund>> {
    const skip = this.buildSkip(params);
    const [records, total] = await Promise.all([
      this.db.refund.findMany({ skip, take: params.limit, orderBy: { createdAt: "desc" } }),
      this.db.refund.count(),
    ]);
    return { data: records.map(toRefund), meta: this.buildPaginationMeta(total, params) };
  }

  async create(data: CreateRefundData): Promise<Refund> {
    const r = await this.db.refund.create({
      data: {
        paymentId: data.paymentId,
        refundReference: data.refundReference,
        refundAmount: data.refundAmount,
        refundReason: data.refundReason,
        refundStatus: data.refundStatus as PrismaRefund["refundStatus"],
        processedById: data.processedById,
        processedAt: data.processedAt ?? null,
        failureReason: data.failureReason ?? null,
      },
    });
    return toRefund(r);
  }

  async update(id: string, data: UpdateRefundData): Promise<Refund> {
    const payload: Prisma.RefundUpdateInput = {};
    if (data.refundStatus !== undefined) payload.refundStatus = data.refundStatus as PrismaRefund["refundStatus"];
    if (data.processedAt !== undefined) payload.processedAt = data.processedAt;
    if (data.failureReason !== undefined) payload.failureReason = data.failureReason;

    const r = await this.db.refund.update({ where: { id }, data: payload });
    return toRefund(r);
  }

  async updateStatus(
    id: string,
    status: RefundStatusType,
    extra?: Partial<UpdateRefundData>
  ): Promise<Refund> {
    const payload: Prisma.RefundUpdateInput = {
      refundStatus: status as PrismaRefund["refundStatus"],
    };
    if (extra?.processedAt !== undefined) payload.processedAt = extra.processedAt;
    if (extra?.failureReason !== undefined) payload.failureReason = extra.failureReason;

    const r = await this.db.refund.update({ where: { id }, data: payload });
    return toRefund(r);
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.refund.delete({ where: { id } });
  }
}
