'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import dataClient from '../dataClient'
import { Shield, Lock, User, Terminal, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const isDemo =
    process.env.NODE_ENV !== 'production' || process.env['NEXT_PUBLIC_DEMO_MODE'] === 'true'
  const [email, setEmail] = useState(isDemo ? 'super-admin@stayflexi.dev' : '')
  const [password, setPassword] = useState(isDemo ? 'Stayflexi@2026!' : '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sf_jwt_token')
      localStorage.removeItem('sf_user_email')
      localStorage.removeItem('sf_user_role')
      localStorage.removeItem('sf_user_first_name')
      localStorage.removeItem('sf_user_last_name')
    }
  }, [])

  const redirectByRole = (role: string) => {
    if (role === 'HOUSEKEEPING') {
      router.push('/housekeeping/mobile')
    } else if (role === 'HOTEL_MANAGER' || role === 'FRONT_DESK') {
      router.push('/bookings')
    } else {
      router.push('/')
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const response = await dataClient.login(email, password)
      if (response && response.user) {
        localStorage.setItem('sf_user_email', response.user.email)
        localStorage.setItem('sf_user_role', response.user.primaryRole)
        localStorage.setItem('sf_user_first_name', response.user.firstName || '')
        localStorage.setItem('sf_user_last_name', response.user.lastName || '')
        localStorage.setItem('sf_jwt_token', response.accessToken)

        redirectByRole(response.user.primaryRole)
      } else {
        setError('Invalid authorization credentials.')
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid authorization handshake.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleForceLogin = async () => {
    setSubmitting(true)
    setError('')

    try {
      const response = await dataClient.login(email, password, true)
      if (response && response.user) {
        localStorage.setItem('sf_user_email', response.user.email)
        localStorage.setItem('sf_user_role', response.user.primaryRole)
        localStorage.setItem('sf_user_first_name', response.user.firstName || '')
        localStorage.setItem('sf_user_last_name', response.user.lastName || '')
        localStorage.setItem('sf_jwt_token', response.accessToken)

        redirectByRole(response.user.primaryRole)
      } else {
        setError('Invalid authorization credentials.')
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid authorization handshake.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative glass orbs */}
      <div
        style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(0, 242, 254, 0.12) 0%, transparent 70%)',
          top: '-10%',
          left: '-10%',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(127, 0, 255, 0.1) 0%, transparent 70%)',
          bottom: '-10%',
          right: '-10%',
          zIndex: 0,
        }}
      />

      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '40px',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          zIndex: 10,
          position: 'relative',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              color: '#060913',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 800,
              marginBottom: '16px',
              boxShadow: '0 0 20px rgba(0, 242, 254, 0.4)',
            }}
          >
            S
          </div>
          <h2
            style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em', color: '#fff' }}
          >
            Stayflexi Supergraph
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
            Property Management System Auth Gate
          </p>
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              padding: '10px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              marginBottom: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <span>{error}</span>
            {error.includes('limit') && (
              <button
                type="button"
                onClick={handleForceLogin}
                disabled={submitting}
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: 'fit-content',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#dc2626')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#ef4444')}
              >
                Force Logout Other Devices & Log In
              </button>
            )}
          </div>
        )}

        <form
          onSubmit={handleLogin}
          style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
        >
          {/* Email field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Staff Email
            </label>
            <div style={{ position: 'relative' }}>
              <User
                style={{
                  width: '14px',
                  height: '14px',
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                suppressHydrationWarning={true}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-card)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                placeholder="email@stayflexi.com"
                className="input-focus-glow"
              />
            </div>
          </div>

          {/* Password field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Security Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                style={{
                  width: '14px',
                  height: '14px',
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                suppressHydrationWarning={true}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-card)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                placeholder="Enter password"
                className="input-focus-glow"
              />
            </div>
          </div>

          {/* Quick Demo Role Fill (Development & Demo Only) */}
          {isDemo && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Demo Staff Account (Quick Fill)
              </label>
              <div style={{ position: 'relative' }}>
                <Shield
                  style={{
                    width: '14px',
                    height: '14px',
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      setEmail(e.target.value)
                      setPassword('Stayflexi@2026!')
                    }
                  }}
                  suppressHydrationWarning={true}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 36px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-card)',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none',
                    cursor: 'pointer',
                    appearance: 'none',
                  }}
                  defaultValue=""
                >
                  <option value="" disabled style={{ background: '#0e1424' }}>
                    -- Select a demo role to populate credentials --
                  </option>
                  <option value="super-admin@stayflexi.dev" style={{ background: '#0e1424' }}>
                    Super Admin (super-admin@stayflexi.dev)
                  </option>
                  <option value="org-admin@stayflexi.dev" style={{ background: '#0e1424' }}>
                    Organization Admin (org-admin@stayflexi.dev)
                  </option>
                  <option value="manager@stayflexi.dev" style={{ background: '#0e1424' }}>
                    Hotel Manager (manager@stayflexi.dev)
                  </option>
                  <option value="front-desk@stayflexi.dev" style={{ background: '#0e1424' }}>
                    Front Desk (front-desk@stayflexi.dev)
                  </option>
                  <option value="housekeeping@stayflexi.dev" style={{ background: '#0e1424' }}>
                    Housekeeping Staff (housekeeping@stayflexi.dev)
                  </option>
                  <option value="accountant@stayflexi.dev" style={{ background: '#0e1424' }}>
                    Accountant / Finance (accountant@stayflexi.dev)
                  </option>
                </select>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            suppressHydrationWarning={true}
            style={{
              marginTop: '12px',
              padding: '12px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              color: '#060913',
              fontWeight: 600,
              fontSize: '14px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(0, 242, 254, 0.2)',
            }}
            className="login-btn-hover"
          >
            {submitting ? (
              <span>Handshaking security...</span>
            ) : (
              <>
                <span>Enter Operations Control</span>
                <ArrowRight style={{ width: '16px', height: '16px' }} />
              </>
            )}
          </button>
        </form>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '24px',
            fontSize: '11px',
            color: 'var(--text-muted)',
          }}
        >
          <Terminal style={{ width: '12px', height: '12px' }} />
          <span>Local Auth tokens stored securely.</span>
        </div>
      </div>
    </div>
  )
}
