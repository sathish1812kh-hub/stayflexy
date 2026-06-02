import { GetOrganization } from '../../application/use-cases/GetOrganization'
import { Organization } from '../../domain/entities/Organization'
import { NotFoundError, ForbiddenError } from '@stayflexi/shared-errors'
import type { IOrganizationRepository } from '../../domain/repositories/IOrganizationRepository'
import type { OrganizationCache } from '../../application/services/OrganizationCache'

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeOrg(deletedAt: Date | null = null): Organization {
  return new Organization({
    id: 'org-1',
    name: 'Acme Hotels',
    legalName: null,
    slug: 'acme-hotels',
    plan: 'FREE',
    status: 'ACTIVE',
    email: 'admin@acme.com',
    phone: null,
    website: null,
    logoUrl: null,
    ownerId: 'owner-1',
    country: 'US',
    maxHotels: 1,
    metadata: null,
    createdById: 'owner-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt,
  })
}

// ─── Mocks ───────────────────────────────────────────────────────────────────

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

function makeCache(): jest.Mocked<OrganizationCache> {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    invalidate: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<OrganizationCache>
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GetOrganization', () => {
  let orgRepo: jest.Mocked<IOrganizationRepository>
  let cache: jest.Mocked<OrganizationCache>
  let useCase: GetOrganization

  beforeEach(() => {
    jest.clearAllMocks()
    orgRepo = makeOrgRepo()
    cache = makeCache()
    useCase = new GetOrganization(orgRepo, cache)
  })

  it('returns org from DB and populates cache on cache miss', async () => {
    cache.get.mockResolvedValue(null)
    orgRepo.findById.mockResolvedValue(makeOrg())

    const result = await useCase.execute('org-1', null)

    expect(orgRepo.findById).toHaveBeenCalledWith('org-1')
    expect(cache.set).toHaveBeenCalledWith(expect.objectContaining({ id: 'org-1' }))
    expect(result.id).toBe('org-1')
  })

  it('returns org from cache and skips DB on cache hit', async () => {
    cache.get.mockResolvedValue(makeOrg())

    const result = await useCase.execute('org-1', null)

    expect(orgRepo.findById).not.toHaveBeenCalled()
    expect(result.id).toBe('org-1')
  })

  it('throws NotFoundError when org does not exist', async () => {
    cache.get.mockResolvedValue(null)
    orgRepo.findById.mockResolvedValue(null)

    await expect(useCase.execute('org-1', null)).rejects.toThrow(NotFoundError)
  })

  it('throws NotFoundError when org is soft-deleted', async () => {
    cache.get.mockResolvedValue(null)
    orgRepo.findById.mockResolvedValue(makeOrg(new Date()))

    await expect(useCase.execute('org-1', null)).rejects.toThrow(NotFoundError)
  })

  it('throws ForbiddenError when requester belongs to a different org', async () => {
    await expect(
      useCase.execute('org-1', 'org-999')
    ).rejects.toThrow(ForbiddenError)

    expect(orgRepo.findById).not.toHaveBeenCalled()
  })

  it('allows access when requestingOrgId matches the requested org', async () => {
    cache.get.mockResolvedValue(null)
    orgRepo.findById.mockResolvedValue(makeOrg())

    await expect(useCase.execute('org-1', 'org-1')).resolves.toBeDefined()
  })

  it('allows SUPER_ADMIN access (null requestingOrgId) to any org', async () => {
    cache.get.mockResolvedValue(null)
    orgRepo.findById.mockResolvedValue(makeOrg())

    await expect(useCase.execute('org-1', null)).resolves.toBeDefined()
  })
})
