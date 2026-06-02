import { builder, GraphQLContext } from '../builder'
import { UnauthorizedError } from '@stayflexi/shared-errors'
import { PaymentMethod, PaymentStatus } from '../../domain/entities/Payment'
import { InvoiceStatus, InvoiceItemType } from '../../domain/entities/Invoice'

// ─── Object Refs ──────────────────────────────────────────────────────────────

const PaymentRef = builder.objectRef<{
  id: string
  organizationId: string
  hotelId: string
  bookingId: string
  paymentReference: string
  paymentMethod: PaymentMethod
  paymentProvider: string | null
  transactionId: string | null
  paymentStatus: PaymentStatus
  amount: number
  currency: string
  paidAt: Date | null
  refundedAt: Date | null
  failureReason: string | null
  processedById: string
  createdAt: Date
  updatedAt: Date
}>('Payment')

const InvoiceItemRef = builder.objectRef<{
  id: string
  invoiceId: string
  itemType: InvoiceItemType
  itemName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  taxRate: number
}>('InvoiceItem')

const InvoiceRef = builder.objectRef<{
  id: string
  organizationId: string
  hotelId: string
  bookingId: string
  invoiceNumber: string
  invoiceStatus: InvoiceStatus
  subtotal: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  currency: string
  issuedAt: Date | null
  dueDate: Date | null
  notes: string | null
  createdById: string
  createdAt: Date
  updatedAt: Date
  items?: any[]
}>('Invoice')

// ─── Implementation ───────────────────────────────────────────────────────────

PaymentRef.implement({
  fields: (t) => ({
    id: t.exposeString('id'),
    organizationId: t.exposeString('organizationId'),
    hotelId: t.exposeString('hotelId'),
    bookingId: t.exposeString('bookingId'),
    paymentReference: t.exposeString('paymentReference'),
    paymentMethod: t.exposeString('paymentMethod'),
    paymentProvider: t.exposeString('paymentProvider', { nullable: true }),
    transactionId: t.exposeString('transactionId', { nullable: true }),
    paymentStatus: t.exposeString('paymentStatus'),
    amount: t.exposeFloat('amount'),
    currency: t.exposeString('currency'),
    paidAt: t.expose('paidAt', { type: 'DateTime', nullable: true }),
    refundedAt: t.expose('refundedAt', { type: 'DateTime', nullable: true }),
    failureReason: t.exposeString('failureReason', { nullable: true }),
    processedById: t.exposeString('processedById'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
  }),
})

InvoiceItemRef.implement({
  fields: (t) => ({
    id: t.exposeString('id'),
    invoiceId: t.exposeString('invoiceId'),
    itemType: t.exposeString('itemType'),
    itemName: t.exposeString('itemName'),
    quantity: t.exposeInt('quantity'),
    unitPrice: t.exposeFloat('unitPrice'),
    totalPrice: t.exposeFloat('totalPrice'),
    taxRate: t.exposeFloat('taxRate'),
  }),
})

InvoiceRef.implement({
  fields: (t) => ({
    id: t.exposeString('id'),
    organizationId: t.exposeString('organizationId'),
    hotelId: t.exposeString('hotelId'),
    bookingId: t.exposeString('bookingId'),
    invoiceNumber: t.exposeString('invoiceNumber'),
    invoiceStatus: t.exposeString('invoiceStatus'),
    subtotal: t.exposeFloat('subtotal'),
    taxAmount: t.exposeFloat('taxAmount'),
    discountAmount: t.exposeFloat('discountAmount'),
    totalAmount: t.exposeFloat('totalAmount'),
    currency: t.exposeString('currency'),
    issuedAt: t.expose('issuedAt', { type: 'DateTime', nullable: true }),
    dueDate: t.expose('dueDate', { type: 'DateTime', nullable: true }),
    notes: t.exposeString('notes', { nullable: true }),
    createdById: t.exposeString('createdById'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
    items: t.field({
      type: [InvoiceItemRef],
      resolve: (parent) => parent.items || [],
    }),
  }),
})

// Support Apollo Federation entity resolution
builder.asEntity(PaymentRef, {
  key: builder.selection<{ id: string }>('id'),
  resolveReference: async (paymentRef, context: GraphQLContext) => {
    const p = await context.paymentRepo.findById(paymentRef.id)
    if (!p) throw new Error('Payment not found')
    return p.toJSON()
  },
})

builder.asEntity(InvoiceRef, {
  key: builder.selection<{ id: string }>('id'),
  resolveReference: async (invoiceRef, context: GraphQLContext) => {
    const inv = await context.invoiceRepo.findById(invoiceRef.id)
    if (!inv) throw new Error('Invoice not found')
    return inv.toJSON()
  },
})

// ─── Input Types ──────────────────────────────────────────────────────────────

const InvoiceItemInput = builder.inputType('InvoiceItemInput', {
  fields: (t) => ({
    itemType: t.string({ required: true }),
    itemName: t.string({ required: true }),
    quantity: t.int({ required: true }),
    unitPrice: t.float({ required: true }),
    taxRate: t.float({ required: true }),
  }),
})

// ─── Queries ──────────────────────────────────────────────────────────────────

builder.queryFields((t) => ({
  payment: t.field({
    type: PaymentRef,
    nullable: true,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_root: unknown, args: { id: string }, context: GraphQLContext) => {
      const p = await context.paymentRepo.findById(args.id)
      return p ? p.toJSON() : null
    },
  }),
  payments: t.field({
    type: [PaymentRef],
    args: {
      hotelId: t.arg.string({ required: true }),
    },
    resolve: async (_root: unknown, args: { hotelId: string }, context: GraphQLContext) => {
      const result = await context.paymentRepo.findByOrganization({
        organizationId: context.organizationId ?? "",
        hotelId: args.hotelId,
        page: 1,
        limit: 100,
      })
      return result.data.map(p => p.toJSON())
    },
  }),
  invoice: t.field({
    type: InvoiceRef,
    nullable: true,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_root: unknown, args: { id: string }, context: GraphQLContext) => {
      const inv = await context.invoiceRepo.findById(args.id)
      return inv ? inv.toJSON() : null
    },
  }),
  invoices: t.field({
    type: [InvoiceRef],
    args: {
      bookingId: t.arg.string({ required: true }),
    },
    resolve: async (_root: unknown, args: { bookingId: string }, context: GraphQLContext) => {
      const invoicesList = await context.invoiceRepo.findByBookingId(args.bookingId)
      return invoicesList.map(inv => inv.toJSON())
    },
  }),
}))

// ─── Mutations ────────────────────────────────────────────────────────────────

builder.mutationFields((t) => ({
  initiatePayment: t.field({
    type: PaymentRef,
    args: {
      hotelId: t.arg.string({ required: true }),
      bookingId: t.arg.string({ required: true }),
      paymentMethod: t.arg.string({ required: true }),
      amount: t.arg.float({ required: true }),
      currency: t.arg.string({ required: true }),
    },
    resolve: async (
      _root: unknown,
      args: { hotelId: string; bookingId: string; paymentMethod: string; amount: number; currency: string },
      context: GraphQLContext
    ) => {
      if (!context.userId || !context.organizationId) {
        throw new UnauthorizedError('Unauthorized session context', 'UNAUTHORIZED')
      }

      // Explicitly call the card transaction init saga
      const payment = await context.initiatePayment.execute({
        hotelId: args.hotelId,
        bookingId: args.bookingId,
        paymentMethod: args.paymentMethod as PaymentMethod,
        amount: args.amount,
        currency: args.currency,
        paymentProvider: 'Stripe Terminal',
        transactionId: `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      }, context.organizationId, context.userId, context.correlationId)

      return payment.toJSON()
    },
  }),
  generateInvoice: t.field({
    type: InvoiceRef,
    args: {
      hotelId: t.arg.string({ required: true }),
      bookingId: t.arg.string({ required: true }),
      currency: t.arg.string({ required: true }),
      notes: t.arg.string(),
      dueDate: t.arg.string(),
      items: t.arg({ type: [InvoiceItemInput], required: true }),
    },
    resolve: async (
      _root: unknown,
      args: { hotelId: string; bookingId: string; currency: string; notes?: string | null; dueDate?: string | null; items: any[] },
      context: GraphQLContext
    ) => {
      if (!context.userId || !context.organizationId) {
        throw new UnauthorizedError('Unauthorized session context', 'UNAUTHORIZED')
      }

      const inv = await context.generateInvoice.execute({
        hotelId: args.hotelId,
        bookingId: args.bookingId,
        currency: args.currency,
        notes: args.notes ?? undefined,
        dueDate: args.dueDate ? new Date(args.dueDate) : undefined,
        items: args.items.map((item: any) => ({
          itemType: item.itemType as InvoiceItemType,
          itemName: item.itemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
        })),
      }, context.organizationId, context.userId, context.correlationId)

      return inv.toJSON()
    },
  }),
  postChargeToFolio: t.field({
    type: InvoiceRef,
    args: {
      bookingId: t.arg.string({ required: true }),
      amount: t.arg.float({ required: true }),
      description: t.arg.string({ required: true }),
      source: t.arg.string({ required: true }),
    },
    resolve: async (
      _root: unknown,
      args: { bookingId: string; amount: number; description: string; source: string },
      context: GraphQLContext
    ) => {
      const activeInvoices = await context.invoiceRepo.findByBookingId(args.bookingId)
      let inv = activeInvoices[0]

      if (!inv) {
        inv = await context.generateInvoice.execute({
          hotelId: "h1-resort-goa",
          bookingId: args.bookingId,
          currency: "USD",
          notes: "Auto-generated guest ledger invoice",
          items: [
            {
              itemType: 'ROOM_CHARGE',
              itemName: 'Base Stay Room Charge (Micro-Allotment)',
              quantity: 1,
              unitPrice: 150.00,
              taxRate: 0.12
            }
          ]
        }, context.organizationId || "org-stayflexi", context.userId || "GUEST_SELF_SERVICE", context.correlationId)
      }

      const { getPrismaClient } = await import('@stayflexi/shared-database');
      const prisma = getPrismaClient();

      // Insert service charge/upsell item into database invoice items table
      await prisma.invoiceItem.create({
        data: {
          invoiceId: inv.id,
          itemType: 'SERVICE_CHARGE',
          itemName: `[${args.source}] ${args.description}`,
          quantity: 1,
          unitPrice: args.amount,
          totalPrice: args.amount,
          taxRate: 0.05
        }
      });

      // Recalculate invoice totals dynamically
      const allItems = await prisma.invoiceItem.findMany({ where: { invoiceId: inv.id } });
      const subtotal = allItems.reduce((acc, item) => acc + Number(item.totalPrice), 0);
      const taxAmount = allItems.reduce((acc, item) => acc + (Number(item.totalPrice) * Number(item.taxRate)), 0);
      const totalAmount = subtotal + taxAmount;

      await prisma.invoice.update({
        where: { id: inv.id },
        data: {
          subtotal,
          taxAmount,
          totalAmount
        }
      });

      const updatedInvoice = await context.invoiceRepo.findById(inv.id);
      if (!updatedInvoice) throw new Error("Recalculation failed");
      return updatedInvoice.toJSON();
    }
  }),
}))
