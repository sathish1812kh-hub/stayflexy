import { z } from 'zod'
import { emailSchema, passwordSchema } from '@stayflexi/shared-validation'

export const registerDtoSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().max(20).optional(),
})
export type RegisterDto = z.infer<typeof registerDtoSchema>

export const loginDtoSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
})
export type LoginDto = z.infer<typeof loginDtoSchema>

export const refreshDtoSchema = z.object({
  refreshToken: z.string().min(1),
})
export type RefreshDto = z.infer<typeof refreshDtoSchema>

export const logoutDtoSchema = z.object({
  refreshToken: z.string().min(1),
})
export type LogoutDto = z.infer<typeof logoutDtoSchema>

export interface AuthTokensResponse {
  accessToken: string
  refreshToken: string
  accessExpiresIn: number
  tokenType: 'Bearer'
}

export interface AuthUserResponse {
  userId: string
  email: string
  firstName: string
  lastName: string
  primaryRole: string
  organizationId: string | null
  status: string
  lastLoginAt: string | null
  emailVerifiedAt: string | null
  createdAt: string
}

export interface LoginResponse extends AuthTokensResponse {
  user: AuthUserResponse
}
