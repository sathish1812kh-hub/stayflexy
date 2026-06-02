import { builder, GraphQLContext } from '../builder'
import { UnauthorizedError } from '@stayflexi/shared-errors'

// InventoryCalendarDay representing daily rates and availability
const InventoryCalendarDayRef = builder.objectRef<{
  date: string
  roomTypeId: string
  totalCapacity: number
  availableCount: number
  reservedCount: number
  blockedCount: number
  basePrice: number
}>('InventoryCalendarDay')

InventoryCalendarDayRef.implement({
  fields: (t) => ({
    date: t.exposeString('date'),
    roomTypeId: t.exposeString('roomTypeId'),
    totalCapacity: t.exposeInt('totalCapacity'),
    availableCount: t.exposeInt('availableCount'),
    reservedCount: t.exposeInt('reservedCount'),
    blockedCount: t.exposeInt('blockedCount'),
    basePrice: t.exposeFloat('basePrice'),
  }),
})

// Queries
builder.queryFields((t) => ({
  availabilityCalendar: t.field({
    type: [InventoryCalendarDayRef],
    args: {
      hotelId: t.arg.string({ required: true }),
      startDate: t.arg.string({ required: true }),
      endDate: t.arg.string({ required: true }),
    },
    resolve: async (
      _root: unknown,
      args: { hotelId: string; startDate: string; endDate: string },
      context: GraphQLContext
    ) => {
      const calendar = await context.getAvailabilityCalendar.execute(
        args.hotelId,
        new Date(args.startDate),
        new Date(args.endDate)
      )

      // Transform domain list to schema shape
      return calendar.map(item => ({
        date: item.date.toISOString().split('T')[0] || '',
        roomTypeId: item.roomTypeId,
        totalCapacity: item.totalCapacity,
        availableCount: item.availableCount,
        reservedCount: item.reservedCount,
        blockedCount: item.blockedCount,
        basePrice: 120.00, // mock fallback rates sync from hotel-service dynamic values
      }))
    },
  }),
}))

// Mutations
builder.mutationFields((t) => ({
  blockInventory: t.field({
    type: builder.simpleObject('BlockInventoryPayload', {
      fields: (t) => ({
        success: t.boolean(),
        message: t.string(),
      }),
    }),
    args: {
      hotelId: t.arg.string({ required: true }),
      roomTypeId: t.arg.string({ required: true }),
      startDate: t.arg.string({ required: true }),
      endDate: t.arg.string({ required: true }),
      reason: t.arg.string(),
    },
    resolve: async (
      _root: unknown,
      args: { hotelId: string; roomTypeId: string; startDate: string; endDate: string; reason?: string | null },
      context: GraphQLContext
    ) => {
      if (!context.userId || !context.organizationId) {
        throw new UnauthorizedError('Unauthorized session context', 'UNAUTHORIZED')
      }
      
      await context.blockInventory.execute({
        organizationId: context.organizationId,
        hotelId: args.hotelId,
        roomTypeId: args.roomTypeId,
        startDate: new Date(args.startDate),
        endDate: new Date(args.endDate),
        quantity: 1,
        notes: args.reason ?? 'Blocked by operations staff',
        createdById: context.userId
      })

      return {
        success: true,
        message: "Inventory blocked successfully.",
      }
    },
  }),
  unblockInventory: t.field({
    type: builder.simpleObject('UnblockInventoryPayload', {
      fields: (t) => ({
        success: t.boolean(),
        message: t.string(),
      }),
    }),
    args: {
      hotelId: t.arg.string({ required: true }),
      roomTypeId: t.arg.string({ required: true }),
      startDate: t.arg.string({ required: true }),
      endDate: t.arg.string({ required: true }),
    },
    resolve: async (
      _root: unknown,
      args: { hotelId: string; roomTypeId: string; startDate: string; endDate: string },
      context: GraphQLContext
    ) => {
      if (!context.userId || !context.organizationId) {
        throw new UnauthorizedError('Unauthorized session context', 'UNAUTHORIZED')
      }

      await context.unblockInventory.execute({
        organizationId: context.organizationId,
        hotelId: args.hotelId,
        roomTypeId: args.roomTypeId,
        startDate: new Date(args.startDate),
        endDate: new Date(args.endDate),
        quantity: 1,
        createdById: context.userId
      })

      return {
        success: true,
        message: "Inventory unblocked successfully.",
      }
    },
  }),
}))
