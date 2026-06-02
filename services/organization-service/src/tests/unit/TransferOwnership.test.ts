import { TransferOwnership } from '../../application/use-cases/TransferOwnership'
import { Organization } from '../../domain/entities/Organization'
import { Member } from '../../domain/entities/Member'
import { NotFoundError, ForbiddenError, BadRequestError } from '@stayflexi/shared-errors'
import type { IOrganizationRepository } from '../../domain/repositories/IOrganizationRepository'
import type { IMemberRepository } from '../../domain/repositories/IMemberRepository'
import type { Logger } from '@stayflexi/shared-logger'

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeOrg(ownerId = 'owner-1', deletedAt: Date | null = null): Organization {
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
    ownerId,
    country: 'US',
    maxHotels: 1,
    metadata: null,
    createdById: ownerId,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt,
  })
}

function makeMember(userId = 'new-owner', removedAt: Date | null = null): Member {
  return new Member({
    id: 'mem-2',
    organizationId: 'org-1',
    userId,
    isOwner: false,
    joinedAt: new Date(),
    removedAt,
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

function makeMemberRepo(): jest.Mocked<IMemberRepository> {
  return {
    findByOrgAndUser: jest.fn(),
    findActiveByOrg: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
    countActiveByOrg: jest.fn(),
  }
}

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('TransferOwnership', () => {
  let orgRepo: jest.Mocked<IOrganizationRepository>
  let memberRepo: jest.Mocked<IMemberRepository>
  let useCase: TransferOwnership

  beforeEach(() => {
    jest.clearAllMocks()
    orgRepo = makeOrgRepo()
    memberRepo = makeMemberRepo()
    useCase = new TransferOwnership(orgRepo, memberRepo, mockLogger)
  })

  it('transfers ownership and returns the updated org', async () => {
    const updatedOrg = makeOrg('new-owner')
    orgRepo.findById.mockResolvedValue(makeOrg('owner-1'))
    memberRepo.findByOrgAndUser.mockResolvedValue(makeMember('new-owner'))
    orgRepo.setOwner.mockResolvedValue(updatedOrg)

    const result = await useCase.execute('org-1', 'new-owner', 'owner-1', 'corr-1')

    expect(orgRepo.setOwner).toHaveBeenCalledWith('org-1', 'new-owner')
    expect(result.ownerId).toBe('new-owner')
  })

  it('throws NotFoundError when org does not exist', async () => {
    orgRepo.findById.mockResolvedValue(null)

    await expect(
      useCase.execute('org-1', 'new-owner', 'owner-1')
    ).rejects.toThrow(NotFoundError)

    expect(orgRepo.setOwner).not.toHaveBeenCalled()
  })

  it('throws NotFoundError when org is soft-deleted', async () => {
    orgRepo.findById.mockResolvedValue(makeOrg('owner-1', new Date()))

    await expect(
      useCase.execute('org-1', 'new-owner', 'owner-1')
    ).rejects.toThrow(NotFoundError)
  })

  it('throws ForbiddenError when requester is not the current owner', async () => {
    orgRepo.findById.mockResolvedValue(makeOrg('owner-1'))

    await expect(
      useCase.execute('org-1', 'new-owner', 'not-owner')
    ).rejects.toThrow(ForbiddenError)

    expect(orgRepo.setOwner).not.toHaveBeenCalled()
  })

  it('throws BadRequestError when new owner is the same as current owner', async () => {
    orgRepo.findById.mockResolvedValue(makeOrg('owner-1'))

    await expect(
      useCase.execute('org-1', 'owner-1', 'owner-1')
    ).rejects.toThrow(BadRequestError)

    expect(orgRepo.setOwner).not.toHaveBeenCalled()
  })

  it('throws BadRequestError when new owner is not an active member', async () => {
    orgRepo.findById.mockResolvedValue(makeOrg('owner-1'))
    memberRepo.findByOrgAndUser.mockResolvedValue(makeMember('new-owner', new Date()))

    await expect(
      useCase.execute('org-1', 'new-owner', 'owner-1')
    ).rejects.toThrow(BadRequestError)
  })

  it('throws BadRequestError when new owner has no membership record', async () => {
    orgRepo.findById.mockResolvedValue(makeOrg('owner-1'))
    memberRepo.findByOrgAndUser.mockResolvedValue(null)

    await expect(
      useCase.execute('org-1', 'new-owner', 'owner-1')
    ).rejects.toThrow(BadRequestError)
  })

  it('logs the transfer with correlationId', async () => {
    orgRepo.findById.mockResolvedValue(makeOrg('owner-1'))
    memberRepo.findByOrgAndUser.mockResolvedValue(makeMember('new-owner'))
    orgRepo.setOwner.mockResolvedValue(makeOrg('new-owner'))

    await useCase.execute('org-1', 'new-owner', 'owner-1', 'corr-log')

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: 'org-1', from: 'owner-1', to: 'new-owner', correlationId: 'corr-log' }),
      expect.any(String)
    )
  })
})
