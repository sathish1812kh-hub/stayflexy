import { builder } from '../builder'
import { RoomType } from '../../../domain/entities/RoomType'
import { HotelRef } from './hotel'

export const RoomTypeRef = builder.objectRef<RoomType>('RoomType')

builder.objectType(RoomTypeRef, {
  name: 'RoomType',
  key: builder.selection<{ id: string }>('id'),
  fields: (t) => ({
    id: t.exposeID('id'),
    hotelId: t.exposeString('hotelId'),
    organizationId: t.exposeString('organizationId'),
    name: t.exposeString('name'),
    description: t.exposeString('description', { nullable: true }),
    basePrice: t.exposeFloat('basePrice'),
    maxOccupancy: t.exposeInt('maxOccupancy'),
    maxAdults: t.exposeInt('maxAdults'),
    maxChildren: t.exposeInt('maxChildren'),
    maxInfants: t.exposeInt('maxInfants'),
    minChildAge: t.exposeInt('minChildAge'),
    maxChildAge: t.exposeInt('maxChildAge'),
    minInfantAge: t.exposeInt('minInfantAge'),
    maxInfantAge: t.exposeInt('maxInfantAge'),
    minOccupancy: t.exposeInt('minOccupancy'),
    absoluteMax: t.exposeInt('absoluteMax'),
    hourlyPrice: t.exposeFloat('hourlyPrice', { nullable: true }),
    extraBedPrice: t.exposeFloat('extraBedPrice'),
    extraGuestPrice: t.exposeFloat('extraGuestPrice'),
    maxExtraBeds: t.exposeInt('maxExtraBeds'),
    amenities: t.exposeStringList('amenities', { nullable: true }),
    isActive: t.exposeBoolean('isActive'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
    
    // Relation
    hotel: t.field({
      type: HotelRef,
      resolve: async (roomType, _args, context) => {
        const orgId = context.role === 'SUPER_ADMIN' ? null : context.organizationId
        return context.getHotel.execute(roomType.hotelId, orgId)
      },
    }),
  }),
})

builder.entityMapper(RoomTypeRef, {
  key: builder.selection<{ id: string }>('id'),
  resolveReference: async (key, context) => {
    if (!context.organizationId) {
      throw new Error('Organization context required')
    }
    return context.getRoomType.execute(key.id, context.organizationId)
  },
})

// Queries
builder.queryFields((t) => ({
  roomType: t.field({
    type: RoomTypeRef,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_root, { id }, context) => {
      if (!context.organizationId) {
        throw new Error('Organization context required')
      }
      return context.getRoomType.execute(id, context.organizationId)
    },
  }),
}))

// Mutations
builder.mutationFields((t) => ({
  createRoomType: t.field({
    type: RoomTypeRef,
    args: {
      hotelId: t.arg.string({ required: true }),
      name: t.arg.string({ required: true }),
      description: t.arg.string({ required: false }),
      basePrice: t.arg.float({ required: true }),
      maxOccupancy: t.arg.int({ required: true }),
      maxAdults: t.arg.int({ required: false }),
      maxChildren: t.arg.int({ required: false }),
      maxInfants: t.arg.int({ required: false }),
      minChildAge: t.arg.int({ required: false }),
      maxChildAge: t.arg.int({ required: false }),
      minInfantAge: t.arg.int({ required: false }),
      maxInfantAge: t.arg.int({ required: false }),
      minOccupancy: t.arg.int({ required: false }),
      absoluteMax: t.arg.int({ required: false }),
      hourlyPrice: t.arg.float({ required: false }),
      extraBedPrice: t.arg.float({ required: false }),
      extraGuestPrice: t.arg.float({ required: false }),
      maxExtraBeds: t.arg.int({ required: false }),
      amenities: t.arg.stringList({ required: false }),
    },
    resolve: async (_root, args, context) => {
      if (!context.organizationId) {
        throw new Error('Organization context required')
      }
      return context.createRoomType.execute(
        {
          hotelId: args.hotelId,
          name: args.name,
          description: args.description ?? undefined,
          basePrice: args.basePrice,
          maxOccupancy: args.maxOccupancy,
          maxAdults: args.maxAdults ?? undefined,
          maxChildren: args.maxChildren ?? undefined,
          maxInfants: args.maxInfants ?? undefined,
          minChildAge: args.minChildAge ?? undefined,
          maxChildAge: args.maxChildAge ?? undefined,
          minInfantAge: args.minInfantAge ?? undefined,
          maxInfantAge: args.maxInfantAge ?? undefined,
          minOccupancy: args.minOccupancy ?? undefined,
          absoluteMax: args.absoluteMax ?? undefined,
          hourlyPrice: args.hourlyPrice ?? undefined,
          extraBedPrice: args.extraBedPrice ?? undefined,
          extraGuestPrice: args.extraGuestPrice ?? undefined,
          maxExtraBeds: args.maxExtraBeds ?? undefined,
          amenities: args.amenities ?? undefined,
        },
        context.organizationId,
        context.correlationId
      )
    },
  }),
}))
