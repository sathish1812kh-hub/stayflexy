// FILE: src/modules/invoice/container.ts
import { PrismaInvoiceRepository } from "./repositories/PrismaInvoiceRepository";
import { InvoiceService } from "./services/InvoiceService";
import { BillingService } from "./services/BillingService";

const invoiceRepo = new PrismaInvoiceRepository();
export const invoiceService = new InvoiceService(invoiceRepo);
export const billingService = new BillingService(invoiceRepo);
