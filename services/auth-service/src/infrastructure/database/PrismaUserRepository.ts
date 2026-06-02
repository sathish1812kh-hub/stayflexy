import { fromPrismaError } from '@stayflexi/shared-errors'
import { getPrismaClient } from '@stayflexi/shared-database'
import { Prisma } from '@stayflexi/shared-database'
import type { PrismaClient } from '@prisma/client'
import { User } from '../../domain/entities/User'
import type { UserProps } from '../../domain/entities/User'
import type { IUserRepository, CreateUserData } from '../../domain/repositories/IUserRepository'

// Use Prisma's generated validator to get the correct field types
const userSelect = Prisma.validator<Prisma.UserDefaultArgs>()({})
type RawUser = Prisma.UserGetPayload<typeof userSelect>

function mapToUser(raw: RawUser): User {
  return new User({
    id: raw.id,
    email: raw.email,
    passwordHash: raw.passwordHash,
    firstName: raw.firstName,
    lastName: raw.lastName,
    phone: raw.phone,
    primaryRole: raw.primaryRole as UserProps['primaryRole'],
    status: raw.status as UserProps['status'],
    organizationId: raw.organizationId,
    lastLoginAt: raw.lastLoginAt,
    emailVerifiedAt: raw.emailVerifiedAt,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    deletedAt: raw.deletedAt,
  })
}

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly db: PrismaClient = getPrismaClient()) {}

  async findById(id: string): Promise<User | null> {
    try {
      const raw = await this.db.user.findFirst({ where: { id } })
      return raw ? mapToUser(raw) : null
    } catch (err) {
      const appErr = fromPrismaError(err)
      if (appErr) throw appErr
      throw err
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const raw = await this.db.user.findUnique({
        where: { email: email.toLowerCase() },
      })
      return raw ? mapToUser(raw) : null
    } catch (err) {
      const appErr = fromPrismaError(err)
      if (appErr) throw appErr
      throw err
    }
  }

  async create(data: CreateUserData): Promise<User> {
    try {
      const raw = await this.db.user.create({
        data: {
          email: data.email.toLowerCase(),
          passwordHash: data.passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone ?? null,
          primaryRole: (data.primaryRole ?? 'FRONT_DESK') as UserProps['primaryRole'],
          status: 'PENDING_VERIFICATION',
        },
      })
      return mapToUser(raw)
    } catch (err) {
      const appErr = fromPrismaError(err)
      if (appErr) throw appErr
      throw err
    }
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.db.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    })
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await this.db.user.update({
      where: { id },
      data: { status: status as UserProps['status'] },
    })
  }
}
