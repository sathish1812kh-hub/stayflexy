'use client'

import React, { useState, useEffect, useMemo } from 'react'
import DashboardShell from '../../components/DashboardShell'
import { Can } from '../../context/PermissionsContext'
import {
  Shield,
  UserPlus,
  Key,
  Mail,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Lock,
  Search,
  Layers,
  CheckSquare,
  Square,
} from 'lucide-react'

interface Role {
  id: string
  name: string
  description: string | null
  isSystem: boolean
  organizationId: string | null
}

interface Permission {
  id: string
  resource: string
  action: string
  key: string
}

interface StaffUser {
  id: string
  name: string
  email: string
  primaryRole: string
  status: 'ACTIVE' | 'INACTIVE'
  lastLogin?: string
}

const DEFAULT_USERS: StaffUser[] = [
  {
    id: 'u-1',
    name: 'Super Admin',
    email: 'super-admin@stayflexi.dev',
    primaryRole: 'SUPER_ADMIN',
    status: 'ACTIVE',
    lastLogin: '2026-08-23 19:42',
  },
  {
    id: 'u-2',
    name: 'Organization Admin',
    email: 'org-admin@stayflexi.dev',
    primaryRole: 'ORG_ADMIN',
    status: 'ACTIVE',
    lastLogin: '2026-08-23 20:15',
  },
  {
    id: 'u-3',
    name: 'Property Manager',
    email: 'manager@stayflexi.dev',
    primaryRole: 'HOTEL_MANAGER',
    status: 'ACTIVE',
    lastLogin: '2026-08-23 18:30',
  },
  {
    id: 'u-4',
    name: 'Front Desk Officer',
    email: 'front-desk@stayflexi.dev',
    primaryRole: 'FRONT_DESK',
    status: 'ACTIVE',
    lastLogin: '2026-08-23 15:10',
  },
  {
    id: 'u-5',
    name: 'Housekeeping Staff',
    email: 'housekeeping@stayflexi.dev',
    primaryRole: 'HOUSEKEEPING',
    status: 'ACTIVE',
    lastLogin: '2026-08-23 14:05',
  },
  {
    id: 'u-6',
    name: 'Finance Accountant',
    email: 'accountant@stayflexi.dev',
    primaryRole: 'ACCOUNTANT',
    status: 'ACTIVE',
    lastLogin: '2026-08-23 12:00',
  },
]

export default function UserRBACPage() {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'roles'>('users')
  const [users, setUsers] = useState<StaffUser[]>(DEFAULT_USERS)
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [permSearch, setPermSearch] = useState('')

  // Invite Staff State
  const [showAddUser, setShowAddUser] = useState(false)
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [selectedRole, setSelectedRole] = useState('')

  // Create Role State
  const [showAddRole, setShowAddRole] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleDesc, setNewRoleDesc] = useState('')
  const [selectedPermIds, setSelectedPermIds] = useState<string[]>([])

  useEffect(() => {
    fetchInitialData()
  }, [])

  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('sf_jwt_token') : null
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  }

  const fetchInitialData = async () => {
    setLoading(true)
    setError(null)
    try {
      // 1. Fetch Roles
      const rolesRes = await fetch('/api/v1/roles', { headers: getAuthHeaders() })
      if (rolesRes.ok) {
        const data = await rolesRes.json()
        if (data.success && data.data) {
          setRoles(data.data)
          if (data.data.length > 0 && !selectedRole) {
            setSelectedRole(data.data[0].id)
          }
        }
      }

      // 2. Fetch Permissions
      const permsRes = await fetch('/api/v1/permissions', { headers: getAuthHeaders() })
      if (permsRes.ok) {
        const data = await permsRes.json()
        if (data.success && data.data) {
          setPermissions(data.data)
        }
      }
    } catch (err: any) {
      console.warn('API data fetch failed, using offline fallback', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoleName.trim()) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/roles', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: newRoleName.trim(),
          description: newRoleDesc.trim() || undefined,
          permissionIds: selectedPermIds,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setSuccessMsg(`Role "${newRoleName}" created successfully!`)
        setNewRoleName('')
        setNewRoleDesc('')
        setSelectedPermIds([])
        setShowAddRole(false)
        await fetchInitialData()
      } else {
        setError(data.error?.message || 'Failed to create role')
      }
    } catch (err: any) {
      setError(err.message || 'Error creating custom role')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!confirm(`Are you sure you want to delete custom role "${roleName}"?`)) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/roles/${roleId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setSuccessMsg(`Role "${roleName}" deleted.`)
        await fetchInitialData()
      } else {
        setError(data.error?.message || 'Failed to delete role')
      }
    } catch (err: any) {
      setError(err.message || 'Error deleting role')
    } finally {
      setLoading(false)
    }
  }

  const togglePermission = (permId: string) => {
    setSelectedPermIds((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId],
    )
  }

  // Group permissions by resource
  const groupedPermissions = useMemo(() => {
    const filtered = permSearch
      ? permissions.filter((p) => p.key.toLowerCase().includes(permSearch.toLowerCase()))
      : permissions

    const groups: Record<string, Permission[]> = {}
    filtered.forEach((p) => {
      const list = groups[p.resource] || []
      list.push(p)
      groups[p.resource] = list
    })
    return groups
  }, [permissions, permSearch])

  const toggleGroup = (resource: string, select: boolean) => {
    const groupPermIds = (groupedPermissions[resource] || []).map((p) => p.id)
    if (select) {
      setSelectedPermIds((prev) => Array.from(new Set([...prev, ...groupPermIds])))
    } else {
      setSelectedPermIds((prev) => prev.filter((id) => !groupPermIds.includes(id)))
    }
  }

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users
    const q = searchQuery.toLowerCase()
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.primaryRole.toLowerCase().includes(q),
    )
  }, [users, searchQuery])

  const filteredRoles = useMemo(() => {
    if (!searchQuery) return roles
    const q = searchQuery.toLowerCase()
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q)),
    )
  }, [roles, searchQuery])

  return (
    <DashboardShell
      activeTab="users"
      title="Staff Directory & Role RBAC"
      subtitle="Federated Role-Based Access Control, Custom Roles, and Permission Matrix"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Navigation & Search Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border-card)',
            paddingBottom: '12px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              onClick={() => setActiveSubTab('users')}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '14px',
                fontWeight: 600,
                color: activeSubTab === 'users' ? 'var(--primary)' : 'var(--text-muted)',
                cursor: 'pointer',
                borderBottom:
                  activeSubTab === 'users' ? '2px solid var(--primary)' : '2px solid transparent',
                paddingBottom: '8px',
              }}
            >
              Personnel Directory ({users.length})
            </button>
            <button
              onClick={() => setActiveSubTab('roles')}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '14px',
                fontWeight: 600,
                color: activeSubTab === 'roles' ? 'var(--primary)' : 'var(--text-muted)',
                cursor: 'pointer',
                borderBottom:
                  activeSubTab === 'roles' ? '2px solid var(--primary)' : '2px solid transparent',
                paddingBottom: '8px',
              }}
            >
              Role Catalog & Matrix ({roles.length || 6})
            </button>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-card)',
                borderRadius: '6px',
                padding: '6px 12px',
              }}
            >
              <Search style={{ width: '14px', height: '14px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeSubTab === 'users' ? 'Search staff by name or email...' : 'Search roles...'
                }
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  fontSize: '12px',
                  outline: 'none',
                  width: '180px',
                }}
              />
            </div>

            {activeSubTab === 'users' ? (
              <Can I="assign" a="user_role">
                <button
                  onClick={() => setShowAddUser(!showAddUser)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                    color: '#060913',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                  }}
                >
                  <UserPlus style={{ width: '15px', height: '15px' }} />
                  <span>Invite Personnel</span>
                </button>
              </Can>
            ) : (
              <Can I="create" a="role">
                <button
                  onClick={() => setShowAddRole(!showAddRole)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                    color: '#060913',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                  }}
                >
                  <Plus style={{ width: '15px', height: '15px' }} />
                  <span>Create Custom Role</span>
                </button>
              </Can>
            )}
          </div>
        </div>

        {/* Feedback banners */}
        {error && (
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444',
              borderRadius: '6px',
              color: '#f87171',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle style={{ width: '16px', height: '16px' }} />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid #10b981',
              borderRadius: '6px',
              color: '#34d399',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 style={{ width: '16px', height: '16px' }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* SUBTAB: USERS DIRECTORY */}
        {activeSubTab === 'users' && (
          <>
            {showAddUser && (
              <div
                className="glass-card"
                style={{ padding: '24px', border: '1px solid rgba(0, 242, 254, 0.2)' }}
              >
                <h3
                  style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    marginBottom: '16px',
                    color: 'var(--primary)',
                  }}
                >
                  Invite Staff Member
                </h3>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!userName || !userEmail) return
                    const newUser: StaffUser = {
                      id: `u-${Date.now()}`,
                      name: userName,
                      email: userEmail,
                      primaryRole: selectedRole || 'FRONT_DESK',
                      status: 'ACTIVE',
                      lastLogin: 'Never',
                    }
                    setUsers([...users, newUser])
                    setUserName('')
                    setUserEmail('')
                    setShowAddUser(false)
                    setSuccessMsg(`Invited ${userEmail} successfully.`)
                  }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr 1fr',
                    gap: '16px',
                    alignItems: 'end',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                      }}
                    >
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border-card)',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                      placeholder="e.g. John Doe"
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                      }}
                    >
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border-card)',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                      placeholder="e.g. john@stayflexi.dev"
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                      }}
                    >
                      Primary Role
                    </label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        background: '#0e1424',
                        border: '1px solid var(--border-card)',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '13px',
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {roles.length > 0 ? (
                        roles.map((r) => (
                          <option key={r.id} value={r.name}>
                            {r.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="HOTEL_MANAGER">Hotel Manager</option>
                          <option value="FRONT_DESK">Front Desk</option>
                          <option value="HOUSEKEEPING">Housekeeping</option>
                          <option value="ACCOUNTANT">Accountant</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="submit"
                      style={{
                        flex: 1,
                        padding: '9px 12px',
                        borderRadius: '6px',
                        background: 'var(--primary)',
                        color: '#060913',
                        border: 'none',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      Invite
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddUser(false)}
                      style={{
                        padding: '9px 12px',
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.05)',
                        color: '#fff',
                        border: '1px solid var(--border-card)',
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Personnel Table */}
            <div className="glass-card" style={{ padding: '0px', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'left',
                    fontSize: '14px',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: '1px solid var(--border-card)',
                        color: 'var(--text-muted)',
                        background: 'rgba(255,255,255,0.01)',
                      }}
                    >
                      <th style={{ padding: '16px' }}>Personnel</th>
                      <th style={{ padding: '16px' }}>Email</th>
                      <th style={{ padding: '16px' }}>Effective Primary Role</th>
                      <th style={{ padding: '16px' }}>Status</th>
                      <th style={{ padding: '16px' }}>Last Access</th>
                      <th style={{ padding: '16px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr
                        key={u.id}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}
                        className="table-row-hover"
                      >
                        <td
                          style={{
                            padding: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                          }}
                        >
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid var(--border-card)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 600,
                              color: 'var(--primary)',
                            }}
                          >
                            {u.name.charAt(0)}
                          </div>
                          <span style={{ fontWeight: 600 }}>{u.name}</span>
                        </td>
                        <td style={{ padding: '16px', color: 'var(--text-muted)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Mail style={{ width: '12px', height: '12px' }} />
                            <span>{u.email}</span>
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              letterSpacing: '0.04em',
                              background: u.primaryRole.includes('ADMIN')
                                ? 'rgba(0, 242, 254, 0.15)'
                                : 'rgba(255, 255, 255, 0.05)',
                              border: u.primaryRole.includes('ADMIN')
                                ? '1px solid var(--primary)'
                                : '1px solid var(--border-card)',
                              color: u.primaryRole.includes('ADMIN') ? 'var(--primary)' : '#fff',
                            }}
                          >
                            {u.primaryRole}
                          </span>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: u.status === 'ACTIVE' ? '#10b981' : '#ef4444',
                                boxShadow: `0 0 8px ${u.status === 'ACTIVE' ? '#10b981' : '#ef4444'}`,
                              }}
                            />
                            <span
                              style={{
                                fontSize: '12px',
                                color: u.status === 'ACTIVE' ? '#10b981' : '#ef4444',
                              }}
                            >
                              {u.status}
                            </span>
                          </div>
                        </td>
                        <td
                          style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '13px' }}
                        >
                          {u.lastLogin || 'Recent'}
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <button
                            onClick={() => {
                              setUsers(
                                users.map((item) =>
                                  item.id === u.id
                                    ? {
                                        ...item,
                                        status: item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                                      }
                                    : item,
                                ),
                              )
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: u.status === 'ACTIVE' ? '#ef4444' : 'var(--primary)',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* SUBTAB: ROLE CATALOG & PERMISSION MATRIX */}
        {activeSubTab === 'roles' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Create Custom Role Drawer */}
            {showAddRole && (
              <div
                className="glass-card"
                style={{ padding: '24px', border: '1px solid rgba(0, 242, 254, 0.2)' }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                  }}
                >
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--primary)' }}>
                    Create Custom Organization Role
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {selectedPermIds.length} Permissions Selected
                  </span>
                </div>

                <form
                  onSubmit={handleCreateRole}
                  style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: 'var(--text-muted)',
                          textTransform: 'uppercase',
                        }}
                      >
                        Role Name
                      </label>
                      <input
                        type="text"
                        required
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                        placeholder="e.g. Concierge Supervisor"
                        style={{
                          padding: '8px 12px',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--border-card)',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '13px',
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: 'var(--text-muted)',
                          textTransform: 'uppercase',
                        }}
                      >
                        Description
                      </label>
                      <input
                        type="text"
                        value={newRoleDesc}
                        onChange={(e) => setNewRoleDesc(e.target.value)}
                        placeholder="Describe role responsibilities..."
                        style={{
                          padding: '8px 12px',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--border-card)',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '13px',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  {/* Grouped Permission Selection Matrix */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <label
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: 'var(--text-muted)',
                          textTransform: 'uppercase',
                        }}
                      >
                        Permission Matrix by Domain Resource
                      </label>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={permSearch}
                          onChange={(e) => setPermSearch(e.target.value)}
                          placeholder="Filter permissions..."
                          style={{
                            padding: '4px 8px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--border-card)',
                            borderRadius: '4px',
                            color: '#fff',
                            fontSize: '11px',
                            outline: 'none',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setSelectedPermIds(permissions.map((p) => p.id))}
                          style={{
                            padding: '4px 8px',
                            background: 'rgba(0, 242, 254, 0.1)',
                            border: '1px solid var(--primary)',
                            borderRadius: '4px',
                            color: 'var(--primary)',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          Select All (118)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedPermIds([])}
                          style={{
                            padding: '4px 8px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--border-card)',
                            borderRadius: '4px',
                            color: '#fff',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div
                      style={{
                        maxHeight: '280px',
                        overflowY: 'auto',
                        border: '1px solid var(--border-card)',
                        borderRadius: '6px',
                        padding: '12px',
                        background: '#0e1424',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                      }}
                    >
                      {Object.entries(groupedPermissions).map(([resource, perms]) => {
                        const allGroupSelected = perms.every((p) => selectedPermIds.includes(p.id))
                        return (
                          <div
                            key={resource}
                            style={{
                              borderBottom: '1px solid rgba(255,255,255,0.03)',
                              paddingBottom: '10px',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '8px',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  color: 'var(--primary)',
                                  textTransform: 'capitalize',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                }}
                              >
                                <Layers style={{ width: '13px', height: '13px' }} />
                                {resource.replace(/_/g, ' ')} ({perms.length})
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleGroup(resource, !allGroupSelected)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: allGroupSelected ? 'var(--text-muted)' : 'var(--primary)',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                }}
                              >
                                {allGroupSelected ? 'Deselect Group' : 'Select Group'}
                              </button>
                            </div>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                gap: '6px',
                              }}
                            >
                              {perms.map((p) => (
                                <label
                                  key={p.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    color: selectedPermIds.includes(p.id)
                                      ? '#fff'
                                      : 'var(--text-muted)',
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedPermIds.includes(p.id)}
                                    onChange={() => togglePermission(p.id)}
                                  />
                                  <span>{p.action}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      justifyContent: 'flex-end',
                      marginTop: '8px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setShowAddRole(false)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.05)',
                        color: '#fff',
                        border: '1px solid var(--border-card)',
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        background: 'var(--primary)',
                        color: '#060913',
                        border: 'none',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      Save Custom Role
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Roles Listing Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '16px',
              }}
            >
              {filteredRoles.map((r) => (
                <div
                  key={r.id}
                  className="glass-card"
                  style={{
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    border: r.isSystem
                      ? '1px solid var(--border-card)'
                      : '1px solid rgba(0, 242, 254, 0.3)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div>
                      <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>{r.name}</h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {r.description || 'No description provided'}
                      </p>
                    </div>
                    {r.isSystem ? (
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid var(--border-card)',
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <Lock style={{ width: '11px', height: '11px' }} />
                        <span>System</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleDeleteRole(r.id, r.name)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '4px',
                        }}
                        title="Delete custom role"
                      >
                        <Trash2 style={{ width: '14px', height: '14px' }} />
                      </button>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      borderTop: '1px solid rgba(255,255,255,0.05)',
                      paddingTop: '8px',
                    }}
                  >
                    <span>
                      Scope: {r.isSystem ? 'Global Platform Core' : 'Organization Custom'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Security Rule Card */}
        <div
          className="glass-card"
          style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            background: 'rgba(0, 242, 254, 0.02)',
            border: '1px solid rgba(0, 242, 254, 0.1)',
          }}
        >
          <Key style={{ width: '24px', height: '24px', color: 'var(--primary)' }} />
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            <strong style={{ color: '#fff' }}>Real-time RBAC Enforcement & Caching:</strong> Changes
            to roles and permissions update the user’s highest effective <code>primaryRole</code>{' '}
            and propagate through the Redis cache layer immediately with automatic invalidation.
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
