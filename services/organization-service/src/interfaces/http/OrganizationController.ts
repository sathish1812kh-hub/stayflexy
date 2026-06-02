import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { validate } from '@stayflexi/shared-validation'
import { successResponse, buildPaginationMeta } from '@stayflexi/shared-types'
import { UnauthorizedError, ForbiddenError } from '@stayflexi/shared-errors'
import {
  createOrgDtoSchema,
  updateOrgDtoSchema,
  addMemberDtoSchema,
  listOrgsDtoSchema,
} from '../../application/dtos/organization.dto'
import type { CreateOrganization } from '../../application/use-cases/CreateOrganization'
import type { GetOrganization } from '../../application/use-cases/GetOrganization'
import type { UpdateOrganization } from '../../application/use-cases/UpdateOrganization'
import type { AddMember } from '../../application/use-cases/AddMember'
import type { RemoveMember } from '../../application/use-cases/RemoveMember'
import type { TransferOwnership } from '../../application/use-cases/TransferOwnership'
import type { ListOrganizations } from '../../application/use-cases/ListOrganizations'
import type { IMemberRepository } from '../../domain/repositories/IMemberRepository'

const transferOwnershipDtoSchema = z.object({
  newOwnerId: z.string().uuid(),
})

interface AuthContext {
  userId: string
  orgId: string | null
  role: string
  correlationId: string | undefined
}

export class OrganizationController {
  constructor(
    private readonly createOrgUseCase: CreateOrganization,
    private readonly getOrgUseCase: GetOrganization,
    private readonly updateOrgUseCase: UpdateOrganization,
    private readonly addMemberUseCase: AddMember,
    private readonly removeMemberUseCase: RemoveMember,
    private readonly transferOwnershipUseCase: TransferOwnership,
    private readonly listOrgsUseCase: ListOrganizations,
    private readonly memberRepo: IMemberRepository
  ) {}

  private getAuthContext(req: Request): AuthContext {
    const userId = req.headers['x-user-id'] as string | undefined
    const orgId = req.headers['x-organization-id'] as string | undefined
    const role = req.headers['x-user-role'] as string | undefined
    const correlationId = req.headers['x-correlation-id'] as string | undefined
    if (!userId) throw new UnauthorizedError('Authentication required')
    return {
      userId,
      orgId: orgId ?? null,
      role: role ?? 'FRONT_DESK',
      correlationId,
    }
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, correlationId } = this.getAuthContext(req)
      const dto = validate(createOrgDtoSchema, req.body)
      const org = await this.createOrgUseCase.execute(dto, userId, correlationId)
      res.status(201).json({ ...successResponse(org.toJSON(), correlationId) })
    } catch (err) {
      next(err)
    }
  }

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuthContext(req)
      const id = req.params['id']
      if (!id) {
        next(new Error('Missing id param'))
        return
      }
      const org = await this.getOrgUseCase.execute(id, orgId)
      res.json({ ...successResponse(org.toJSON(), correlationId) })
    } catch (err) {
      next(err)
    }
  }

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, orgId, correlationId } = this.getAuthContext(req)
      const id = req.params['id']
      if (!id) {
        next(new Error('Missing id param'))
        return
      }
      const dto = validate(updateOrgDtoSchema, req.body)
      const org = await this.updateOrgUseCase.execute(id, dto, userId, orgId, correlationId)
      res.json({ ...successResponse(org.toJSON(), correlationId) })
    } catch (err) {
      next(err)
    }
  }

  listMembers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orgId, correlationId } = this.getAuthContext(req)
      const id = req.params['id']
      if (!id) {
        next(new Error('Missing id param'))
        return
      }

      // Tenant isolation on member listing
      if (orgId && orgId !== id) {
        next(new ForbiddenError('Access denied to this organization', 'ORG_ACCESS_DENIED'))
        return
      }

      const page = Math.max(1, parseInt(String(req.query['page'] ?? '1'), 10))
      const limit = Math.min(
        100,
        Math.max(1, parseInt(String(req.query['limit'] ?? '20'), 10))
      )

      const { members, total } = await this.memberRepo.findActiveByOrg(id, page, limit)

      res.json({
        success: true,
        data: members.map((m) => m.toJSON()),
        meta: {
          ...buildPaginationMeta(total, page, limit),
          correlationId,
        },
      })
    } catch (err) {
      next(err)
    }
  }

  addMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, correlationId } = this.getAuthContext(req)
      const id = req.params['id']
      if (!id) {
        next(new Error('Missing id param'))
        return
      }
      const dto = validate(addMemberDtoSchema, req.body)
      const member = await this.addMemberUseCase.execute(id, dto, userId, correlationId)
      res.status(201).json({
        success: true,
        data: member.toJSON(),
        correlationId,
      })
    } catch (err) {
      next(err)
    }
  }

  removeMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, correlationId } = this.getAuthContext(req)
      const orgId = req.params['id']
      const memberId = req.params['memberId']
      if (!orgId || !memberId) {
        next(new Error('Missing route params'))
        return
      }
      await this.removeMemberUseCase.execute(orgId, memberId, userId, correlationId)
      res.status(204).send()
    } catch (err) {
      next(err)
    }
  }

  // PATCH /organizations/:id/members/:memberId — transfers ownership when body contains
  // { newOwnerId } equal to :memberId, matching the REST convention for member updates.
  patchMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, correlationId } = this.getAuthContext(req)
      const orgId = req.params['id']
      const memberId = req.params['memberId']
      if (!orgId || !memberId) {
        next(new Error('Missing route params'))
        return
      }
      // Only ownership transfer is supported via PATCH member
      const dto = validate(transferOwnershipDtoSchema, { ...req.body, newOwnerId: memberId })
      const updated = await this.transferOwnershipUseCase.execute(
        orgId,
        dto.newOwnerId,
        userId,
        correlationId
      )
      res.json({ success: true, data: updated.toJSON(), correlationId })
    } catch (err) {
      next(err)
    }
  }

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId, role, correlationId } = this.getAuthContext(req)
      const dto = validate(
        listOrgsDtoSchema,
        req.query as Record<string, string | undefined>
      )
      const result = await this.listOrgsUseCase.execute(dto, userId, role)
      res.json({
        success: true,
        data: result.data.map((o) => o.toJSON()),
        meta: { ...result.meta, correlationId },
      })
    } catch (err) {
      next(err)
    }
  }
}
