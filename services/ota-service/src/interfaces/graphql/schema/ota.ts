import { builder, GraphQLContext } from '../builder'
import { UnauthorizedError } from '@stayflexi/shared-errors'

// ─── Object Refs ──────────────────────────────────────────────────────────────

const OtaProviderRef = builder.objectRef<{
  id: string
  providerCode: string
  providerName: string
  status: string
  description: string | null
  webhookUrl: string | null
  createdAt: Date
  updatedAt: Date
}>('OtaProvider')

const OtaMappingRef = builder.objectRef<{
  id: string
  organizationId: string
  hotelId: string
  roomTypeId: string | null
  providerId: string
  externalHotelId: string
  externalRoomTypeId: string | null
  syncStatus: string
  isActive: boolean
  lastSyncedAt: Date | null
  createdAt: Date
  updatedAt: Date
}>('OtaMapping')

const SyncJobRef = builder.objectRef<{
  id: string
  organizationId: string
  hotelId: string
  providerId: string
  syncType: string
  syncStatus: string
  idempotencyKey: string
  startedAt: Date | null
  completedAt: Date | null
  retryCount: number
  maxRetries: number
  errorMessage: string | null
  createdById: string | null
  createdAt: Date
  updatedAt: Date
}>('SyncJob')

// ─── Implementation ───────────────────────────────────────────────────────────

OtaProviderRef.implement({
  fields: (t) => ({
    id: t.exposeString('id'),
    providerCode: t.exposeString('providerCode'),
    providerName: t.exposeString('providerName'),
    status: t.exposeString('status'),
    description: t.exposeString('description', { nullable: true }),
    webhookUrl: t.exposeString('webhookUrl', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
  }),
})

OtaMappingRef.implement({
  fields: (t) => ({
    id: t.exposeString('id'),
    organizationId: t.exposeString('organizationId'),
    hotelId: t.exposeString('hotelId'),
    roomTypeId: t.exposeString('roomTypeId', { nullable: true }),
    providerId: t.exposeString('providerId'),
    externalHotelId: t.exposeString('externalHotelId'),
    externalRoomTypeId: t.exposeString('externalRoomTypeId', { nullable: true }),
    syncStatus: t.exposeString('syncStatus'),
    isActive: t.exposeBoolean('isActive'),
    lastSyncedAt: t.expose('lastSyncedAt', { type: 'DateTime', nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
  }),
})

SyncJobRef.implement({
  fields: (t) => ({
    id: t.exposeString('id'),
    organizationId: t.exposeString('organizationId'),
    hotelId: t.exposeString('hotelId'),
    providerId: t.exposeString('providerId'),
    syncType: t.exposeString('syncType'),
    syncStatus: t.exposeString('syncStatus'),
    idempotencyKey: t.exposeString('idempotencyKey'),
    startedAt: t.expose('startedAt', { type: 'DateTime', nullable: true }),
    completedAt: t.expose('completedAt', { type: 'DateTime', nullable: true }),
    retryCount: t.exposeInt('retryCount'),
    maxRetries: t.exposeInt('maxRetries'),
    errorMessage: t.exposeString('errorMessage', { nullable: true }),
    createdById: t.exposeString('createdById', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
  }),
})

// Support Apollo Federation entity resolution
builder.asEntity(OtaProviderRef, {
  key: builder.selection<{ id: string }>('id'),
  resolveReference: async (providerRef, context: GraphQLContext) => {
    const p = await context.providerRepo.findById(providerRef.id)
    if (!p) throw new Error('OTA Provider not found')
    return p.toJSON()
  },
})

builder.asEntity(OtaMappingRef, {
  key: builder.selection<{ id: string }>('id'),
  resolveReference: async (mappingRef, context: GraphQLContext) => {
    const m = await context.mappingRepo.findById(mappingRef.id)
    if (!m) throw new Error('OTA Mapping not found')
    return m.toJSON()
  },
})

// ─── Input Types ──────────────────────────────────────────────────────────────

const RoomTypeMappingInput = builder.inputType('RoomTypeMappingInput', {
  fields: (t) => ({
    roomTypeId: t.string({ required: true }),
    externalRoomTypeId: t.string({ required: true }),
  }),
})

// ─── Queries ──────────────────────────────────────────────────────────────────

builder.queryFields((t) => ({
  otaProviders: t.field({
    type: [OtaProviderRef],
    resolve: async (_root: unknown, _args: {}, context: GraphQLContext) => {
      const providers = await context.providerRepo.findAll()
      return providers.map(p => p.toJSON())
    },
  }),
  otaMappings: t.field({
    type: [OtaMappingRef],
    args: {
      hotelId: t.arg.string({ required: true }),
    },
    resolve: async (_root: unknown, args: { hotelId: string }, context: GraphQLContext) => {
      if (!context.organizationId) {
        throw new UnauthorizedError('Unauthorized session context', 'UNAUTHORIZED')
      }
      const mappings = await context.mappingRepo.findByOrganization(context.organizationId, args.hotelId)
      return mappings.map(m => m.toJSON())
    },
  }),
  syncJobs: t.field({
    type: [SyncJobRef],
    args: {
      hotelId: t.arg.string({ required: true }),
      syncType: t.arg.string(),
      limit: t.arg.int(),
    },
    resolve: async (_root: unknown, args: { hotelId: string; syncType?: string | null; limit?: number | null }, context: GraphQLContext) => {
      const result = await context.syncJobRepo.findByHotel(args.hotelId, {
        syncType: args.syncType ?? undefined,
        limit: args.limit ?? 20,
      })
      return result.map(j => j.toJSON())
    },
  }),
}))

// ─── Mutations ────────────────────────────────────────────────────────────────

builder.mutationFields((t) => ({
  connectOta: t.field({
    type: OtaMappingRef,
    args: {
      hotelId: t.arg.string({ required: true }),
      providerId: t.arg.string({ required: true }),
      externalHotelId: t.arg.string({ required: true }),
      roomTypeMappings: t.arg({ type: [RoomTypeMappingInput], required: true }),
    },
    resolve: async (
      _root: unknown,
      args: { hotelId: string; providerId: string; externalHotelId: string; roomTypeMappings: any[] },
      context: GraphQLContext
    ) => {
      if (!context.userId || !context.organizationId) {
        throw new UnauthorizedError('Unauthorized session context', 'UNAUTHORIZED')
      }

      const mapping = await context.connectOtaProvider.execute({
        hotelId: args.hotelId,
        providerId: args.providerId,
        externalHotelId: args.externalHotelId,
        roomTypeMappings: args.roomTypeMappings,
        metadata: null,
      }, context.organizationId, context.userId, context.correlationId)

      return mapping.toJSON()
    },
  }),
  triggerSync: t.field({
    type: SyncJobRef,
    args: {
      hotelId: t.arg.string({ required: true }),
      providerId: t.arg.string({ required: true }),
      syncType: t.arg.string({ required: true }),
    },
    resolve: async (
      _root: unknown,
      args: { hotelId: string; providerId: string; syncType: string },
      context: GraphQLContext
    ) => {
      if (!context.userId || !context.organizationId) {
        throw new UnauthorizedError('Unauthorized session context', 'UNAUTHORIZED')
      }

      let job
      if (args.syncType === 'INVENTORY_PUSH') {
        job = await context.syncInventory.execute({
          hotelId: args.hotelId,
          providerId: args.providerId,
        }, context.organizationId, context.userId, context.correlationId)
      } else if (args.syncType === 'RATE_PUSH') {
        job = await context.syncRates.execute({
          hotelId: args.hotelId,
          providerId: args.providerId,
        }, context.organizationId, context.userId, context.correlationId)
      } else {
        job = await context.syncReservations.execute({
          hotelId: args.hotelId,
          providerId: args.providerId,
        }, context.organizationId, context.userId, context.correlationId)
      }

      return job.toJSON()
    },
  }),
}))
