import { ListOrganizations } from '../../application/use-cases/ListOrganizations'
import { Organization } from '../../domain/entities/Organization'
import type { IOrganizationRepository } from '../../domain/repositories/IOrganizationRepository'
import type { PaginatedResult } from '@stayflexi/shared-types'

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeOrg(id: string, ownerId: string): Organization {
  return new Organization({
    id,
    name: `Hotel ${id}`,
    legalName: null,
    slug: `hotel-${id}`,
    plan: 'FREE',
    status: 'ACTIVE',
    email: `admin@hotel${id}.com`,
    phone: null,
    website: null,
    logoUrl: null,
    ownerId,
    country: 'US',
    maxHotels: 1,
    metadata: null,
    createdById: ownerId,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  })
}

function makePaginated(orgs: Organization[]): PaginatedResult<Organization> {
  return {
    data: orgs,
    meta: { total: orgs.length, page: 1, limit: 20, totalPages: 1 },
  }
}

// ─── Mock ────────────────────────────────────────────────────────────────────

function makeOrgRepo(): jest.Mocked<IOrganizationRepository> {
  return {
    findById: jest.fn(),
    findBySlug: jest.fn(),
    findByOwnerId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    setOwner: jest.fn(),
    softDelete: jest.fn(),
    findMany: jest.fn(),
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ListOrganizations', () => {
  let orgRepo: jest.Mocked<IOrganizationRepository>
  let useCase: ListOrganizations

  beforeEach(() => {
    jest.clearAllMocks()
    orgRepo = makeOrgRepo()
    useCase = new ListOrganizations(orgRepo)
  })

  it('SUPER_ADMIN sees all orgs (no ownerId filter)', async () => {
    const orgs = [makeOrg('org-1', 'user-A'), makeOrg('org-2', 'user-B')]
    orgRepo.findMany.mockResolvedValue(makePaginated(orgs))

    const result = await useCase.execute({ page: 1, limit: 20 }, 'super-user', 'SUPER_ADMIN')

    expect(orgRepo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: undefined })
    )
    expect(result.data).toHaveLength(2)
  })

  it('non-SUPER_ADMIN sees only their own orgs', async () => {
    const orgs = [makeOrg('org-1', 'user-A')]
    orgRepo.findMany.mockResolvedValue(makePaginated(orgs))

    await useCase.execute({ page: 1, limit: 20 }, 'user-A', 'HOTEL_MANAGER')

    expect(orgRepo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: 'user-A' })
    )
  })

  it('forwards status and plan filters to repository', async () => {
    orgRepo.findMany.mockResolvedValue(makePaginated([]))

    await useCase.execute(
      { page: 1, limit: 10, status: 'ACTIVE', plan: 'PROFESSIONAL' },
      'user-A',
      'HOTEL_MANAGER'
    )

    expect(orgRepo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE', plan: 'PROFESSIONAL', page: 1, limit: 10 })
    )
  })

  it('returns empty result when user has no organizations', async () => {
    orgRepo.findMany.mockResolvedValue(makePaginated([]))

    const result = await useCase.execute({ page: 1, limit: 20 }, 'user-none', 'FRONT_DESK')

    expect(result.data).toHaveLength(0)
    expect(result.meta.total).toBe(0)
  })

  it('passes pagination params to repository', async () => {
    orgRepo.findMany.mockResolvedValue(makePaginated([]))

    await useCase.execute({ page: 3, limit: 5 }, 'user-A', 'SUPER_ADMIN')

    expect(orgRepo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ page: 3, limit: 5 })
    )
  })
})
