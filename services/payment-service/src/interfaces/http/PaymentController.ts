import type { Request, Response, NextFunction } from 'express'
import { validate } from '@stayflexi/shared-validation'
import { successResponse } from '@stayflexi/shared-types'
import { UnauthorizedError, ForbiddenError } from '@stayflexi/shared-errors'
import {
  initiatePaymentSchema, confirmPaymentSchema, processRefundSchema, cancelPaymentSchema,
  paymentSearchSchema, createInvoiceSchema, reconciliationQuerySchema,
} from '../../application/dtos/payment.dto'
import type { InitiatePayment } from '../../application/use-cases/InitiatePayment'
import type { ConfirmPayment } from '../../application/use-cases/ConfirmPayment'
import type { ProcessRefund } from '../../application/use-cases/ProcessRefund'
import type { GenerateInvoice } from '../../application/use-cases/GenerateInvoice'
import type { CancelPayment } from '../../application/use-cases/CancelPayment'
import type { IPaymentRepository } from '../../domain/repositories/IPaymentRepository'
import type { IInvoiceRepository } from '../../domain/repositories/IInvoiceRepository'
import type { ReconciliationService } from '../../reconciliation/ReconciliationService'
import type { PaymentCache } from '../../infrastructure/cache/PaymentCache'

const CANCEL_ALLOWED_ROLES = ['MANAGER', 'GENERAL_MANAGER', 'SUPER_ADMIN']

export class PaymentController {
  constructor(
    private readonly initiatePaymentUC: InitiatePayment,
    private readonly confirmPaymentUC: ConfirmPayment,
    private readonly processRefundUC: ProcessRefund,
    private readonly generateInvoiceUC: GenerateInvoice,
    private readonly paymentRepo: IPaymentRepository,
    private readonly invoiceRepo: IInvoiceRepository,
    private readonly reconciliation: ReconciliationService,
    private readonly cache: PaymentCache,
    private readonly cancelPaymentUC?: CancelPayment
  ) {}

  private getAuth(req: Request) {
    const user = req.user
    if (!user || !user.userId) throw new UnauthorizedError('Authentication required')
    return {
      userId: user.userId,
      orgId: user.organizationId ?? '',
      correlationId: user.correlationId,
    }
  }

  initiatePayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, orgId, correlationId } = this.getAuth(req)
      const dto = validate(initiatePaymentSchema, req.body)
      const payment = await this.initiatePaymentUC.execute(dto, orgId, userId, correlationId)
      res.status(201).json({ ...successResponse(payment.toJSON(), correlationId) })
    } catch (err) { next(err) }
  }

  confirmPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, orgId, correlationId } = this.getAuth(req)
      const { id } = req.params
      if (!id) throw new Error('Missing id')
      const dto = validate(confirmPaymentSchema, req.body)
      const payment = await this.confirmPaymentUC.execute(id, dto, orgId, userId, correlationId)
      res.json({ ...successResponse(payment.toJSON(), correlationId) })
    } catch (err) { next(err) }
  }

  processRefund = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, orgId, correlationId } = this.getAuth(req)
      const { id } = req.params
      if (!id) throw new Error('Missing id')
      const dto = validate(processRefundSchema, req.body)
      const refund = await this.processRefundUC.execute(id, dto, orgId, userId, correlationId)
      res.status(201).json({ ...successResponse(refund.toJSON(), correlationId) })
    } catch (err) { next(err) }
  }

  cancelPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user
      if (!user || !user.userId) throw new UnauthorizedError('Authentication required')

      // Enforce role check — only managers and above may cancel payments
      if (!user.isServiceCall && !CANCEL_ALLOWED_ROLES.includes(user.primaryRole)) {
        throw new ForbiddenError(
          `Insufficient permissions. Required: ${CANCEL_ALLOWED_ROLES.join(' or ')}. Got: ${user.primaryRole}`
        )
      }

      const { userId, orgId, correlationId } = this.getAuth(req)
      const { id } = req.params
      if (!id) throw new Error('Missing id')

      if (!this.cancelPaymentUC) {
        throw new Error('CancelPayment use-case is not configured')
      }

      const dto = validate(cancelPaymentSchema, req.body)
      const payment = await this.cancelPaymentUC.execute(id, dto.reason, orgId, userId, correlationId)
      res.json({ ...successResponse(payment.toJSON(), correlationId) })
    } catch (err) { next(err) }
  }

  getPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const { id } = req.params
      if (!id) throw new Error('Missing id')

      const cached = await this.cache.getPayment(id)
      if (cached) {
        if (!cached.belongsToOrganization(orgId)) { res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied', statusCode: 403 } }); return }
        res.json({ ...successResponse(cached.toJSON(), correlationId) }); return
      }

      const payment = await this.paymentRepo.findById(id)
      if (!payment) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Payment not found', statusCode: 404 } }); return }
      if (!payment.belongsToOrganization(orgId)) { res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied', statusCode: 403 } }); return }

      await this.cache.setPayment(payment)
      res.json({ ...successResponse(payment.toJSON(), correlationId) })
    } catch (err) { next(err) }
  }

  listPayments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const dto = validate(paymentSearchSchema, req.query as Record<string, string>)
      const result = await this.paymentRepo.findByOrganization({
        organizationId: orgId,
        hotelId: dto.hotelId,
        bookingId: dto.bookingId,
        paymentStatus: dto.paymentStatus,
        paymentMethod: dto.paymentMethod,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        page: dto.page,
        limit: dto.limit,
      })
      res.json({ success: true, data: result.data.map(p => p.toJSON()), meta: result.meta, correlationId })
    } catch (err) { next(err) }
  }

  generateInvoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, orgId, correlationId } = this.getAuth(req)
      const dto = validate(createInvoiceSchema, req.body)
      const invoice = await this.generateInvoiceUC.execute(dto, orgId, userId, correlationId)
      res.status(201).json({ ...successResponse(invoice.toJSON(), correlationId) })
    } catch (err) { next(err) }
  }

  getInvoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const { id } = req.params
      if (!id) throw new Error('Missing id')

      const cached = await this.cache.getInvoice(id)
      if (cached) {
        if (!cached.belongsToOrganization(orgId)) { res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied', statusCode: 403 } }); return }
        res.json({ ...successResponse(cached.toJSON(), correlationId) }); return
      }

      const invoice = await this.invoiceRepo.findById(id)
      if (!invoice) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found', statusCode: 404 } }); return }
      if (!invoice.belongsToOrganization(orgId)) { res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied', statusCode: 403 } }); return }

      await this.cache.setInvoice(invoice)
      res.json({ ...successResponse(invoice.toJSON(), correlationId) })
    } catch (err) { next(err) }
  }

  getReconciliation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuth(req)
      const dto = validate(reconciliationQuerySchema, req.query as Record<string, string>)
      const report = await this.reconciliation.generateReport(
        orgId, new Date(dto.startDate), new Date(dto.endDate), dto.hotelId, dto.currency
      )
      res.json({ ...successResponse(report, correlationId) })
    } catch (err) { next(err) }
  }
}
