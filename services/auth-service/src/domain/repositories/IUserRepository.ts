import type { User } from '../entities/User'

export interface CreateUserData {
  email: string
  passwordHash: string
  firstName: string
  lastName: string
  phone?: string
  primaryRole?: string
}

export interface IUserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  create(data: CreateUserData): Promise<User>
  updateLastLogin(id: string): Promise<void>
  updateStatus(id: string, status: string): Promise<void>
}
