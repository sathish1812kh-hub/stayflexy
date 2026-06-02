'use client'

import React, { useState, useEffect } from 'react'
import DashboardShell from '../../components/DashboardShell'
import { Shield, UserPlus, Key, Mail, CheckCircle2, AlertCircle } from 'lucide-react'

interface StaffUser {
  id: string
  name: string
  email: string
  role: 'Super Admin' | 'Manager' | 'Front Desk' | 'Housekeeping'
  status: 'ACTIVE' | 'INACTIVE'
  accessibleHotels: string[]
  lastLogin: string
}

const DEFAULT_USERS: StaffUser[] = [
  {
    id: "u-1",
    name: "Pradeep K.",
    email: "pradeep@stayflexi.com",
    role: "Super Admin",
    status: "ACTIVE",
    accessibleHotels: ["h1-resort-goa", "h2-suites-blr", "h3-palace-jpr"],
    lastLogin: "2026-05-24 19:42"
  },
  {
    id: "u-2",
    name: "Sathish Kumar",
    email: "sathish@stayflexi.com",
    role: "Manager",
    status: "ACTIVE",
    accessibleHotels: ["h1-resort-goa", "h2-suites-blr"],
    lastLogin: "2026-05-24 20:15"
  },
  {
    id: "u-3",
    name: "Aman Preet",
    email: "aman@stayflexi.com",
    role: "Front Desk",
    status: "ACTIVE",
    accessibleHotels: ["h1-resort-goa"],
    lastLogin: "2026-05-24 18:30"
  },
  {
    id: "u-4",
    name: "Karan Singh",
    email: "karan@stayflexi.com",
    role: "Housekeeping",
    status: "ACTIVE",
    accessibleHotels: ["h2-suites-blr"],
    lastLogin: "2026-05-24 15:10"
  }
]

export default function UserRBACPage() {
  const [users, setUsers] = useState<StaffUser[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'Super Admin' | 'Manager' | 'Front Desk' | 'Housekeeping'>('Front Desk')
  const [selectedHotels, setSelectedHotels] = useState<string[]>(['h1-resort-goa'])
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('sf_rbac_users')
    if (saved) {
      setUsers(JSON.parse(saved))
    } else {
      setUsers(DEFAULT_USERS)
      localStorage.setItem('sf_rbac_users', JSON.stringify(DEFAULT_USERS))
    }
  }, [])

  const saveUsers = (newUsers: StaffUser[]) => {
    setUsers(newUsers)
    localStorage.setItem('sf_rbac_users', JSON.stringify(newUsers))
  }

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email) return

    const newUser: StaffUser = {
      id: `u-${Math.random().toString(36).substr(2, 9)}`,
      name,
      email,
      role,
      status: 'ACTIVE',
      accessibleHotels: selectedHotels,
      lastLogin: 'Never'
    }

    const updated = [...users, newUser]
    saveUsers(updated)
    setName('')
    setEmail('')
    setShowAddForm(false)
  }

  const handleRoleChange = (userId: string, newRole: StaffUser['role']) => {
    const updated = users.map(u => u.id === userId ? { ...u, role: newRole } : u)
    saveUsers(updated)
  }

  const handleStatusToggle = (userId: string) => {
    const updated = users.map(u => u.id === userId ? { ...u, status: (u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE') as any } : u)
    saveUsers(updated)
  }

  return (
    <DashboardShell
      activeTab="users"
      title="Staff Directory & Role RBAC"
      subtitle="Federated Role-Based Access Control and multi-property scope allocations"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Top Control Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Active Personnel Accounts</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Configure roles propagation to downstream services</p>
          </div>
          
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              padding: '10px 16px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              color: '#060913',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px'
            }}
          >
            <UserPlus style={{ width: '15px', height: '15px' }} />
            <span>Invite Personnel</span>
          </button>
        </div>

        {/* Add Personnel Form Drawer/Box */}
        {showAddForm && (
          <div className="glass-card" style={{ padding: '24px', border: '1px solid rgba(0, 242, 254, 0.2)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', color: 'var(--primary)' }}>Invite Staff Member</h3>
            <form onSubmit={handleCreateUser} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', alignItems: 'end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Full Name</label>
                <input 
                  type="text" 
                  required
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '13px', outline: 'none' }}
                  placeholder="Enter name"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Work Email</label>
                <input 
                  type="email" 
                  required
                  value={email} 
                  onChange={e => setEmail(e.target.value)}
                  style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '13px', outline: 'none' }}
                  placeholder="email@stayflexi.com"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Role Assignment</label>
                <select 
                  value={role} 
                  onChange={e => setRole(e.target.value as any)}
                  style={{ padding: '8px 12px', background: '#0e1424', border: '1px solid var(--border-card)', borderRadius: '6px', color: '#fff', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="Super Admin">Super Admin</option>
                  <option value="Manager">Property Manager</option>
                  <option value="Front Desk">Front Desk</option>
                  <option value="Housekeeping">Housekeeping</option>
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
                    fontSize: '13px'
                  }}
                >
                  Create
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowAddForm(false)}
                  style={{
                    padding: '9px 12px',
                    borderRadius: '6px',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#fff',
                    border: '1px solid var(--border-card)',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Directory Listing Table */}
        <div className="glass-card" style={{ padding: '0px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-card)', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.01)' }}>
                  <th style={{ padding: '16px' }}>Staff Name</th>
                  <th style={{ padding: '16px' }}>Email Address</th>
                  <th style={{ padding: '16px' }}>Federated Role</th>
                  <th style={{ padding: '16px' }}>Property Scope</th>
                  <th style={{ padding: '16px' }}>Last Handshake</th>
                  <th style={{ padding: '16px' }}>Account Status</th>
                  <th style={{ padding: '16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.2s' }} className="table-row-hover">
                    <td style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--border-card)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 600,
                        color: 'var(--primary)'
                      }}>
                        {u.name.charAt(0)}
                      </div>
                      <span style={{ fontWeight: 600 }}>{u.name}</span>
                    </td>
                    
                    <td style={{ padding: '16px', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Mail style={{ width: '12px', height: '12px', color: 'var(--text-muted)' }} />
                        <span>{u.email}</span>
                      </div>
                    </td>

                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Shield style={{ 
                          width: '14px', 
                          height: '14px', 
                          color: u.role === 'Super Admin' ? 'var(--primary)' : u.role === 'Manager' ? 'var(--secondary)' : '#f59e0b'
                        }} />
                        <select
                          value={u.role}
                          onChange={e => handleRoleChange(u.id, e.target.value as any)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#fff',
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            outline: 'none'
                          }}
                        >
                          <option value="Super Admin" style={{ background: '#0e1424' }}>Super Admin</option>
                          <option value="Manager" style={{ background: '#0e1424' }}>Property Manager</option>
                          <option value="Front Desk" style={{ background: '#0e1424' }}>Front Desk</option>
                          <option value="Housekeeping" style={{ background: '#0e1424' }}>Housekeeping</option>
                        </select>
                      </div>
                    </td>

                    <td style={{ padding: '16px' }}>
                      <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-card)' }}>
                        {u.accessibleHotels.length} Property Scopes
                      </span>
                    </td>

                    <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                      {u.lastLogin}
                    </td>

                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: u.status === 'ACTIVE' ? '#10b981' : '#ef4444',
                          boxShadow: `0 0 8px ${u.status === 'ACTIVE' ? '#10b981' : '#ef4444'}`
                        }} />
                        <span style={{ fontSize: '12px', fontWeight: 500, color: u.status === 'ACTIVE' ? '#10b981' : '#ef4444' }}>
                          {u.status}
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <button 
                        onClick={() => handleStatusToggle(u.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: u.status === 'ACTIVE' ? '#ef4444' : 'var(--primary)',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textDecoration: 'underline'
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

        {/* Informational Card */}
        <div className="glass-card" style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'rgba(0, 242, 254, 0.02)', border: '1px solid rgba(0, 242, 254, 0.1)' }}>
          <Key style={{ width: '24px', height: '24px', color: 'var(--primary)' }} />
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            <strong style={{ color: '#fff' }}>Security Handshake Rule:</strong> Role updates propagate in real-time to the Federated Gateway. Session cookies are re-validated on downstream subgraphs using the standard <code>x-user-role</code> correlation token mapping.
          </div>
        </div>
        
      </div>
    </DashboardShell>
  )
}
