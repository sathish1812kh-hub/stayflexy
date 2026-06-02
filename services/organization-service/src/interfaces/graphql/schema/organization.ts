import { builder } from '../builder'
import { UnauthorizedError } from '@stayflexi/shared-errors'

// Organization shape representing B2B setups
const OrganizationRef = builder.objectRef<{
  id: string
  name: string
  legalName: string | null
  slug: string
  plan: string
  status: string
  email: string
  phone: string | null
  website: string | null
  logoUrl: string | null
  ownerId: string
  country: string
  maxHotels: number
  createdAt: Date
  updatedAt: Date
}>('Organization')

OrganizationRef.implement({
  fields: (t) => ({
    id: t.exposeString('id'),
    name: t.exposeString('name'),
    legalName: t.exposeString('legalName', { nullable: true }),
    slug: t.exposeString('slug'),
    plan: t.exposeString('plan'),
    status: t.exposeString('status'),
    email: t.exposeString('email'),
    phone: t.exposeString('phone', { nullable: true }),
    website: t.exposeString('website', { nullable: true }),
    logoUrl: t.exposeString('logoUrl', { nullable: true }),
    ownerId: t.exposeString('ownerId'),
    country: t.exposeString('country'),
    maxHotels: t.exposeInt('maxHotels'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
  }),
})

// Support Apollo Federation entity resolution
builder.asEntity(OrganizationRef, {
  key: builder.selection<{ id: string }>('id'),
  resolveReference: async (orgRef, context) => {
    const org = await context.getOrganization.execute(orgRef.id)
    return org.toJSON()
  },
})

// Queries
builder.queryFields((t) => ({
  organization: t.field({
    type: OrganizationRef,
    nullable: true,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, context) => {
      const org = await context.getOrganization.execute(args.id)
      return org.toJSON()
    },
  }),
  organizations: t.field({
    type: [OrganizationRef],
    resolve: async (_root, _args, context) => {
      if (!context.userId) {
        throw new UnauthorizedError('Unauthorized session', 'UNAUTHORIZED')
      }
      const list = await context.listOrganizations.execute(context.userId)
      return list.map(org => org.toJSON())
    },
  }),
}))

// Mutations
builder.mutationFields((t) => ({
  createOrganization: t.field({
    type: OrganizationRef,
    args: {
      name: t.arg.string({ required: true }),
      email: t.arg.string({ required: true }),
      country: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, context) => {
      if (!context.userId) {
        throw new UnauthorizedError('Unauthorized session', 'UNAUTHORIZED')
      }
      const org = await context.createOrganization.execute({
        name: args.name,
        email: args.email,
        country: args.country,
        legalName: null,
        phone: null,
        website: null,
        logoUrl: null,
        ownerId: context.userId,
        createdById: context.userId
      })
      return org.toJSON()
    },
  }),
}))
