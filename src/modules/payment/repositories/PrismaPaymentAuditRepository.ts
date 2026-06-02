import { BaseRepository } from "@lib/baseRepository";
import type { Nullable, PaginatedResult, PaginationParams } from "@shared-types";
import type { PaymentAudit, CreatePaymentAuditData } from "../types";
import { type Prisma } from "@prisma/client";

type PrismaPaymentAudit = Prisma.PaymentAuditGetPayload<Record<string, never>>;

function toPaymentAudit(r: PrismaPaymentAudit): PaymentAudit {
  return {
    id: r.id,
    paymentId: r.paymentId,
    eventType: r.eventType as PaymentAudit["eventType"],
    eventDescription: r.eventDescription,
    performedById: r.performedById,
    metadata: r.metadata ?? null,
    createdAt: r.createdAt,
  };
}

export class PrismaPaymentAuditRepository extends BaseRepository<
  PaymentAudit,
  CreatePaymentAuditData,
  never
> {
  async findById(id: string): Promise<Nullable<PaymentAudit>> {
    const r = await this.db.paymentAudit.findFirst({ where: { id } });
    return r ? toPaymentAudit(r) : null;
  }

  async findByPayment(paymentId: string): Promise<PaymentAudit[]> {
    const records = await this.db.paymentAudit.findMany({
      where: { paymentId },
      orderBy: { createdAt: "asc" },
    });
    return records.map(toPaymentAudit);
  }

  async findMany(params: PaginationParams): Promise<PaginatedResult<PaymentAudit>> {
    const skip = this.buildSkip(params);
    const [records, total] = await Promise.all([
      this.db.paymentAudit.findMany({ skip, take: params.limit, orderBy: { createdAt: "desc" } }),
      this.db.paymentAudit.count(),
    ]);
    return { data: records.map(toPaymentAudit), meta: this.buildPaginationMeta(total, params) };
  }

  async create(data: CreatePaymentAuditData): Promise<PaymentAudit> {
    const r = await this.db.paymentAudit.create({
      data: {
        paymentId: data.paymentId,
        eventType: data.eventType as PrismaPaymentAudit["eventType"],
        eventDescription: data.eventDescription,
        performedById: data.performedById,
        metadata: data.metadata !== undefined ? (data.metadata as Prisma.InputJsonValue) : undefined,
      },
    });
    return toPaymentAudit(r);
  }

  override update(_id: string, _data: never): Promise<PaymentAudit> {
    return Promise.reject(new Error("Payment audit logs are immutable"));
  }

  override hardDelete(_id: string): Promise<void> {
    return Promise.reject(new Error("Payment audit logs are immutable"));
  }
}
