import { builder } from '../builder'
import { Hotel } from '../../../domain/entities/Hotel'
import { RoomTypeRef } from './roomType'
import { RoomRef } from './room'

export const HotelStatusEnum = builder.enumType('HotelStatus', {
  values: ['ACTIVE', 'INACTIVE', 'UNDER_RENOVATION'] as const,
})

export const HotelRef = builder.objectRef<Hotel>('Hotel')

builder.objectType(HotelRef, {
  name: 'Hotel',
  key: builder.selection<{ id: string }>('id'),
  fields: (t) => ({
    id: t.exposeID('id'),
    organizationId: t.exposeString('organizationId'),
    name: t.exposeString('name'),
    slug: t.exposeString('slug'),
    address: t.exposeString('address', { nullable: true }),
    city: t.exposeString('city'),
    state: t.exposeString('state', { nullable: true }),
    country: t.exposeString('country'),
    postalCode: t.exposeString('postalCode', { nullable: true }),
    phone: t.exposeString('phone', { nullable: true }),
    email: t.exposeString('email', { nullable: true }),
    website: t.exposeString('website', { nullable: true }),
    starRating: t.exposeInt('starRating', { nullable: true }),
    status: t.expose('status', { type: HotelStatusEnum }),
    timezone: t.exposeString('timezone'),
    checkInTime: t.exposeString('checkInTime'),
    checkOutTime: t.exposeString('checkOutTime'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
    
    // Nested relations loaded via DataLoaders to prevent N+1 queries
    roomTypes: t.field({
      type: [RoomTypeRef],
      resolve: async (hotel, _args, context) => {
        return context.loaders.roomTypesByHotelId.load(hotel.id)
      },
    }),
    rooms: t.field({
      type: [RoomRef],
      resolve: async (hotel, _args, context) => {
        return context.loaders.roomsByHotelId.load(hotel.id)
      },
    }),
  }),
})

builder.entityMapper(HotelRef, {
  key: builder.selection<{ id: string }>('id'),
  resolveReference: async (key, context) => {
    const orgId = context.role === 'SUPER_ADMIN' ? null : context.organizationId
    return context.getHotel.execute(key.id, orgId)
  },
})

// Queries
builder.queryFields((t) => ({
  hotel: t.field({
    type: HotelRef,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_root, { id }, context) => {
      const orgId = context.role === 'SUPER_ADMIN' ? null : context.organizationId
      return context.getHotel.execute(id, orgId)
    },
  }),
  hotels: t.field({
    type: [HotelRef],
    args: {
      page: t.arg.int({ defaultValue: 1 }),
      limit: t.arg.int({ defaultValue: 100 }),
    },
    resolve: async (_root, { page, limit }, context) => {
      const result = await context.listHotels.execute(
        { page: page ?? 1, limit: limit ?? 100 },
        context.organizationId,
        context.role
      )
      return result.data
    },
  }),
}))

// Mutations
builder.mutationFields((t) => ({
  createHotel: t.field({
    type: HotelRef,
    args: {
      name: t.arg.string({ required: true }),
      address: t.arg.string({ required: false }),
      city: t.arg.string({ required: true }),
      state: t.arg.string({ required: false }),
      country: t.arg.string({ required: true }),
      postalCode: t.arg.string({ required: false }),
      phone: t.arg.string({ required: false }),
      email: t.arg.string({ required: false }),
      website: t.arg.string({ required: false }),
      starRating: t.arg.int({ required: false }),
      timezone: t.arg.string({ required: false }),
      checkInTime: t.arg.string({ required: false }),
      checkOutTime: t.arg.string({ required: false }),
      slug: t.arg.string({ required: false }),
    },
    resolve: async (_root, args, context) => {
      if (!context.organizationId || !context.userId) {
        throw new Error('Authentication/Organization context required')
      }
      return context.createHotel.execute(
        {
          name: args.name,
          address: args.address ?? null,
          city: args.city,
          state: args.state ?? null,
          country: args.country,
          postalCode: args.postalCode ?? null,
          phone: args.phone ?? null,
          email: args.email ?? null,
          website: args.website ?? null,
          starRating: args.starRating ?? null,
          timezone: args.timezone ?? 'UTC',
          checkInTime: args.checkInTime ?? '14:00',
          checkOutTime: args.checkOutTime ?? '11:00',
          slug: args.slug ?? undefined,
        },
        context.organizationId,
        context.userId,
        context.correlationId
      )
    },
  }),
}))
