'use client'

import React, { useEffect } from 'react'
import { X } from 'lucide-react'

export interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  title?: React.ReactNode
  subtitle?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  position?: 'right' | 'left'
  width?: string | number
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  position = 'right',
  width = '480px',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const isRight = position === 'right'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(6, 9, 19, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        justifyContent: isRight ? 'flex-end' : 'flex-start',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: width,
          height: '100%',
          backgroundColor: '#0c1224',
          borderLeft: isRight ? '1px solid rgba(0, 242, 254, 0.25)' : 'none',
          borderRight: !isRight ? '1px solid rgba(0, 242, 254, 0.25)' : 'none',
          boxShadow: isRight
            ? '-10px 0 40px rgba(0, 0, 0, 0.7), -5px 0 20px rgba(0, 242, 254, 0.1)'
            : '10px 0 40px rgba(0, 0, 0, 0.7), 5px 0 20px rgba(0, 242, 254, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          animation: isRight
            ? 'slideLeft 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            : 'slideRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(16, 22, 42, 0.8)',
          }}
        >
          <div>
            {title && (
              <h2 style={{ fontSize: '17px', fontWeight: 600, color: '#f3f4f6', margin: 0 }}>
                {title}
              </h2>
            )}
            {subtitle && (
              <p style={{ fontSize: '12px', color: '#9ca3af', margin: '3px 0 0' }}>{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              display: 'flex',
              padding: '6px',
              borderRadius: '6px',
            }}
            aria-label="Close drawer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Content */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1,
            color: '#e5e7eb',
          }}
        >
          {children}
        </div>

        {/* Drawer Footer */}
        {footer && (
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(10, 15, 30, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
