import { builder } from '../builder'
import { Room } from '../../../domain/entities/Room'
import { HotelRef } from './hotel'
import { RoomTypeRef } from './roomType'

export const RoomStatusEnum = builder.enumType('RoomStatus', {
  values: [
    'AVAILABLE',
    'OCCUPIED',
    'OUT_OF_ORDER',
    'HOUSEKEEPING',
    'MAINTENANCE',
    'BLOCKED',
  ] as const,
})

export const RoomRef = builder.objectRef<Room>('Room')

builder.objectType(RoomRef, {
  name: 'Room',
  key: builder.selection<{ id: string }>('id'),
  fields: (t) => ({
    id: t.exposeID('id'),
    hotelId: t.exposeString('hotelId'),
    organizationId: t.exposeString('organizationId'),
    roomTypeId: t.exposeString('roomTypeId'),
    roomNumber: t.exposeString('roomNumber'),
    floor: t.exposeInt('floor', { nullable: true }),
    status: t.expose('status', { type: RoomStatusEnum }),
    isActive: t.exposeBoolean('isActive'),
    notes: t.exposeString('notes', { nullable: true }),
    wing: t.exposeString('wing', { nullable: true }),
    zone: t.exposeString('zone', { nullable: true }),
    wifiSSID: t.exposeString('wifiSSID', { nullable: true }),
    wifiPassword: t.exposeString('wifiPassword', { nullable: true }),
    arrivalNotes: t.exposeString('arrivalNotes', { nullable: true }),
    lockVendor: t.exposeString('lockVendor', { nullable: true }),
    lockDeviceId: t.exposeString('lockDeviceId', { nullable: true }),
    lockSecret: t.exposeString('lockSecret', { nullable: true }),
    connectingRoomId: t.exposeString('connectingRoomId', { nullable: true }),
    parentRoomId: t.exposeString('parentRoomId', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
    
    // Relations
    hotel: t.field({
      type: HotelRef,
      resolve: async (room, _args, context) => {
        const orgId = context.role === 'SUPER_ADMIN' ? null : context.organizationId
        return context.getHotel.execute(room.hotelId, orgId)
      },
    }),
    roomType: t.field({
      type: RoomTypeRef,
      nullable: true,
      resolve: async (room, _args, context) => {
        return context.loaders.roomType.load(room.roomTypeId)
      },
    }),
  }),
})

builder.entityMapper(RoomRef, {
  key: builder.selection<{ id: string }>('id'),
  resolveReference: async (key, context) => {
    if (!context.organizationId) {
      throw new Error('Organization context required')
    }
    return context.getRoom.execute(key.id, context.organizationId)
  },
})

// Queries
builder.queryFields((t) => ({
  room: t.field({
    type: RoomRef,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_root, { id }, context) => {
      if (!context.organizationId) {
        throw new Error('Organization context required')
      }
      return context.getRoom.execute(id, context.organizationId)
    },
  }),
}))

// Mutations
builder.mutationFields((t) => ({
  createRoom: t.field({
    type: RoomRef,
    args: {
      hotelId: t.arg.string({ required: true }),
      roomTypeId: t.arg.string({ required: true }),
      roomNumber: t.arg.string({ required: true }),
      floor: t.arg.int({ required: false }),
      notes: t.arg.string({ required: false }),
      wing: t.arg.string({ required: false }),
      zone: t.arg.string({ required: false }),
      wifiSSID: t.arg.string({ required: false }),
      wifiPassword: t.arg.string({ required: false }),
      arrivalNotes: t.arg.string({ required: false }),
      lockVendor: t.arg.string({ required: false }),
      lockDeviceId: t.arg.string({ required: false }),
      lockSecret: t.arg.string({ required: false }),
      connectingRoomId: t.arg.string({ required: false }),
      parentRoomId: t.arg.string({ required: false }),
    },
    resolve: async (_root, args, context) => {
      if (!context.organizationId) {
        throw new Error('Organization context required')
      }
      return context.createRoom.execute(
        {
          hotelId: args.hotelId,
          roomTypeId: args.roomTypeId,
          roomNumber: args.roomNumber,
          floor: args.floor ?? undefined,
          notes: args.notes ?? undefined,
          wing: args.wing ?? undefined,
          zone: args.zone ?? undefined,
          wifiSSID: args.wifiSSID ?? undefined,
          wifiPassword: args.wifiPassword ?? undefined,
          arrivalNotes: args.arrivalNotes ?? undefined,
          lockVendor: args.lockVendor ?? undefined,
          lockDeviceId: args.lockDeviceId ?? undefined,
          lockSecret: args.lockSecret ?? undefined,
          connectingRoomId: args.connectingRoomId ?? undefined,
          parentRoomId: args.parentRoomId ?? undefined,
        },
        context.organizationId,
        context.correlationId
      )
    },
  }),
  updateRoomStatus: t.field({
    type: RoomRef,
    args: {
      roomId: t.arg.string({ required: true }),
      status: t.arg({ type: RoomStatusEnum, required: true }),
      reason: t.arg.string({ required: false }),
    },
    resolve: async (_root, args, context) => {
      if (!context.organizationId || !context.userId) {
        throw new Error('Authentication context required')
      }
      return context.updateRoomStatus.execute(
        args.roomId,
        {
          status: args.status,
          reason: args.reason ?? undefined,
        },
        context.userId,
        context.organizationId,
        context.correlationId
      )
    },
  }),
}))
