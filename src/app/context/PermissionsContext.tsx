'use client'

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from 'react'

export interface UserPermissions {
  userId: string | null
  primaryRole: string
  permissionKeys: string[]
  organizationId: string | null
  hotelId: string | null
}

interface PermissionsContextType {
  user: UserPermissions
  loading: boolean
  hasPermission: (permissionKey: string) => boolean
  can: (action: string, resource: string) => boolean
  hasRole: (...roles: string[]) => boolean
  refreshPermissions: () => Promise<void>
}

const DEFAULT_PERMISSIONS: UserPermissions = {
  userId: null,
  primaryRole: 'GUEST',
  permissionKeys: [],
  organizationId: null,
  hotelId: null,
}

const PermissionsContext = createContext<PermissionsContextType>({
  user: DEFAULT_PERMISSIONS,
  loading: true,
  hasPermission: () => false,
  can: () => false,
  hasRole: () => false,
  refreshPermissions: async () => {},
})

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserPermissions>(DEFAULT_PERMISSIONS)
  const [loading, setLoading] = useState(true)

  const refreshPermissions = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('sf_jwt_token') : null
      const storedRole = typeof window !== 'undefined' ? localStorage.getItem('sf_user_role') : null
      const storedUserId = typeof window !== 'undefined' ? localStorage.getItem('sf_user_id') : null
      const storedOrgId = typeof window !== 'undefined' ? localStorage.getItem('sf_org_id') : null
      const storedHotelId =
        typeof window !== 'undefined' ? localStorage.getItem('sf_hotel_id') : null

      if (!token) {
        setUser({
          userId: storedUserId || 'guest',
          primaryRole: storedRole || 'GUEST',
          permissionKeys: [],
          organizationId: storedOrgId || null,
          hotelId: storedHotelId || null,
        })
        setLoading(false)
        return
      }

      // Fetch live permissions from backend
      const res = await fetch('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const body = await res.json()
        if (body.success && body.data) {
          const userData = body.data.user || body.data
          const keys: string[] = body.data.permissionKeys || []

          setUser({
            userId: userData.id || storedUserId,
            primaryRole: userData.primaryRole || storedRole || 'FRONT_DESK',
            permissionKeys: keys,
            organizationId: userData.organizationId || storedOrgId || null,
            hotelId: userData.hotelId || storedHotelId || null,
          })
          setLoading(false)
          return
        }
      }

      // Fail-closed fallback if unauthenticated or offline
      setUser({
        userId: storedUserId || null,
        primaryRole: storedRole || 'GUEST',
        permissionKeys: [],
        organizationId: storedOrgId || null,
        hotelId: storedHotelId || null,
      })
    } catch {
      setUser({
        userId: null,
        primaryRole: 'GUEST',
        permissionKeys: [],
        organizationId: null,
        hotelId: null,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshPermissions()
  }, [])

  const hasPermission = (permissionKey: string): boolean => {
    if (user.primaryRole === 'SUPER_ADMIN') return true
    return user.permissionKeys.includes(permissionKey)
  }

  const can = (action: string, resource: string): boolean => {
    if (user.primaryRole === 'SUPER_ADMIN') return true
    const key = `${resource}:${action}`
    return user.permissionKeys.includes(key)
  }

  const hasRole = (...roles: string[]): boolean => {
    if (user.primaryRole === 'SUPER_ADMIN') return true
    return roles.includes(user.primaryRole)
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      hasPermission,
      can,
      hasRole,
      refreshPermissions,
    }),
    [user, loading],
  )

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>
}

export function usePermissions() {
  return useContext(PermissionsContext)
}

/**
 * Action-level declarative RBAC component
 * Usage:
 * <Can I="delete" a="hotel">
 *   <button onClick={handleDelete}>Delete Hotel</button>
 * </Can>
 */
export function Can({
  I,
  a,
  fallback = null,
  children,
}: {
  I: string
  a: string
  fallback?: ReactNode
  children: ReactNode
}) {
  const { can, loading } = usePermissions()
  if (loading) return null
  return can(I, a) ? <>{children}</> : <>{fallback}</>
}
