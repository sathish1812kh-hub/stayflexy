import { PrismaPaymentRepository } from "./repositories/PrismaPaymentRepository";
import { PrismaRefundRepository } from "./repositories/PrismaRefundRepository";
import { PrismaPaymentAuditRepository } from "./repositories/PrismaPaymentAuditRepository";
import { PaymentService } from "./services/PaymentService";

const paymentRepo = new PrismaPaymentRepository();
const refundRepo = new PrismaRefundRepository();
const auditRepo = new PrismaPaymentAuditRepository();
export const paymentService = new PaymentService(paymentRepo, refundRepo, auditRepo);
