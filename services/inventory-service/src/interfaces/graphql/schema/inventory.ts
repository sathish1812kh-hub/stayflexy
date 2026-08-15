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
      context: GraphQLContext,
    ) => {
      const d = new Date(args.startDate)
      const calendar = await context.getAvailabilityCalendar.execute({
        hotelId: args.hotelId,
        year: d.getUTCFullYear(),
        month: d.getUTCMonth() + 1,
      })

      // Transform domain list to schema shape
      return calendar.days.flatMap((day) =>
        day.roomTypes.map((item) => ({
          date: day.date,
          roomTypeId: item.roomTypeId,
          totalCapacity: item.totalRooms,
          availableCount: item.availableCount,
          reservedCount: item.reservedCount,
          blockedCount: item.blockedCount,
          basePrice: 120.0, // mock fallback rates sync from hotel-service dynamic values
        })),
      )
    },
  }),
}))

// Inventory payloads
const BlockInventoryPayloadRef = builder.objectRef<{ success: boolean; message: string }>(
  'BlockInventoryPayload',
)
BlockInventoryPayloadRef.implement({
  fields: (t) => ({
    success: t.exposeBoolean('success'),
    message: t.exposeString('message'),
  }),
})

const UnblockInventoryPayloadRef = builder.objectRef<{ success: boolean; message: string }>(
  'UnblockInventoryPayload',
)
UnblockInventoryPayloadRef.implement({
  fields: (t) => ({
    success: t.exposeBoolean('success'),
    message: t.exposeString('message'),
  }),
})

// Mutations
builder.mutationFields((t) => ({
  blockInventory: t.field({
    type: BlockInventoryPayloadRef,
    args: {
      hotelId: t.arg.string({ required: true }),
      roomTypeId: t.arg.string({ required: true }),
      startDate: t.arg.string({ required: true }),
      endDate: t.arg.string({ required: true }),
      reason: t.arg.string(),
    },
    resolve: async (
      _root: unknown,
      args: {
        hotelId: string
        roomTypeId: string
        startDate: string
        endDate: string
        reason?: string | null
      },
      context: GraphQLContext,
    ) => {
      if (!context.userId || !context.organizationId) {
        throw new UnauthorizedError('Unauthorized session context', 'UNAUTHORIZED')
      }

      await context.blockInventory.execute(
        {
          hotelId: args.hotelId,
          roomTypeId: args.roomTypeId,
          startDate: args.startDate,
          endDate: args.endDate,
          quantity: 1,
          reason: 'MANUAL_BLOCK',
          notes: args.reason ?? 'Blocked by operations staff',
        },
        context.organizationId,
        context.userId,
      )

      return {
        success: true,
        message: 'Inventory blocked successfully.',
      }
    },
  }),
  unblockInventory: t.field({
    type: UnblockInventoryPayloadRef,
    args: {
      hotelId: t.arg.string({ required: true }),
      roomTypeId: t.arg.string({ required: true }),
      startDate: t.arg.string({ required: true }),
      endDate: t.arg.string({ required: true }),
    },
    resolve: async (
      _root: unknown,
      args: { hotelId: string; roomTypeId: string; startDate: string; endDate: string },
      context: GraphQLContext,
    ) => {
      if (!context.userId || !context.organizationId) {
        throw new UnauthorizedError('Unauthorized session context', 'UNAUTHORIZED')
      }

      await context.unblockInventory.execute(
        {
          hotelId: args.hotelId,
          roomTypeId: args.roomTypeId,
          startDate: args.startDate,
          endDate: args.endDate,
          quantity: 1,
        },
        context.organizationId,
      )

      return {
        success: true,
        message: 'Inventory unblocked successfully.',
      }
    },
  }),
}))
