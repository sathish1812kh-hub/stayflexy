// FILE: src/modules/invoice/validators/index.ts
import { ZodError } from "zod";
import { ValidationError } from "@errors/HttpError";
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  FinalizeInvoiceDto,
  InvoiceFilterDto,
  BillingQueryDto,
  type CreateInvoiceDtoType,
  type UpdateInvoiceDtoType,
  type FinalizeInvoiceDtoType,
  type InvoiceFilterDtoType,
  type BillingQueryDtoType,
} from "../dto";

function wrapZod<T>(fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      throw new ValidationError("Validation failed", details);
    }
    throw error;
  }
}

export function validateCreateInvoice(data: unknown): CreateInvoiceDtoType {
  return wrapZod(() => CreateInvoiceDto.parse(data)) as CreateInvoiceDtoType;
}

export function validateUpdateInvoice(data: unknown): UpdateInvoiceDtoType {
  return wrapZod(() => UpdateInvoiceDto.parse(data)) as UpdateInvoiceDtoType;
}

export function validateFinalizeInvoice(data: unknown): FinalizeInvoiceDtoType {
  return wrapZod(() => FinalizeInvoiceDto.parse(data)) as FinalizeInvoiceDtoType;
}

export function validateInvoiceFilter(data: unknown): InvoiceFilterDtoType {
  return wrapZod(() => InvoiceFilterDto.parse(data)) as InvoiceFilterDtoType;
}

export function validateBillingQuery(data: unknown): BillingQueryDtoType {
  return wrapZod(() => BillingQueryDto.parse(data)) as BillingQueryDtoType;
}
