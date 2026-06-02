import { ZodError } from "zod";
import { ValidationError } from "@errors/HttpError";
import {
  CreatePaymentDto,
  InitiateRefundDto,
  PaymentFilterDto,
  ReconciliationQueryDto,
  type CreatePaymentDtoType,
  type InitiateRefundDtoType,
  type PaymentFilterDtoType,
  type ReconciliationQueryDtoType,
} from "../dto";

function wrapZod<T>(fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.errors.map((e) => ({ field: e.path.join("."), message: e.message }));
      throw new ValidationError("Validation failed", details);
    }
    throw error;
  }
}

export function validateCreatePayment(data: unknown): CreatePaymentDtoType {
  return wrapZod(() => CreatePaymentDto.parse(data)) as CreatePaymentDtoType;
}

export function validateInitiateRefund(data: unknown): InitiateRefundDtoType {
  return wrapZod(() => InitiateRefundDto.parse(data)) as InitiateRefundDtoType;
}

export function validatePaymentFilter(data: unknown): PaymentFilterDtoType {
  return wrapZod(() => PaymentFilterDto.parse(data)) as PaymentFilterDtoType;
}

export function validateReconciliationQuery(data: unknown): ReconciliationQueryDtoType {
  return wrapZod(() => ReconciliationQueryDto.parse(data)) as ReconciliationQueryDtoType;
}
