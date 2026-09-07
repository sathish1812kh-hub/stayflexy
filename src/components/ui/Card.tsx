'use client'

import React from 'react'

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode
  subtitle?: React.ReactNode
  icon?: React.ReactNode
  action?: React.ReactNode
  footer?: React.ReactNode
  variant?: 'glass' | 'solid' | 'accent' | 'outlined'
  isHoverable?: boolean
  glow?: boolean
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  icon,
  action,
  footer,
  variant = 'glass',
  isHoverable = false,
  glow = false,
  className = '',
  style,
  ...props
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'glass':
        return {
          background: 'rgba(16, 22, 42, 0.65)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }
      case 'solid':
        return {
          background: '#0d1326',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        }
      case 'accent':
        return {
          background:
            'linear-gradient(135deg, rgba(16, 22, 42, 0.8) 0%, rgba(127, 0, 255, 0.1) 100%)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(127, 0, 255, 0.25)',
        }
      case 'outlined':
        return {
          background: 'transparent',
          border: '1px solid rgba(255, 255, 255, 0.15)',
        }
    }
  }

  return (
    <div
      style={{
        borderRadius: '12px',
        color: '#f3f4f6',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: glow ? '0 0 20px rgba(0, 242, 254, 0.15)' : '0 4px 20px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        ...getVariantStyles(),
        ...style,
      }}
      className={`stayflexi-card ${isHoverable ? 'stayflexi-card-hover' : ''} ${className}`}
      {...props}
    >
      {(title || action || icon) && (
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {icon && <span style={{ color: '#00f2fe', display: 'inline-flex' }}>{icon}</span>}
            <div>
              {title && (
                <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: '#f3f4f6' }}>
                  {title}
                </h3>
              )}
              {subtitle && (
                <p style={{ fontSize: '12px', color: '#9ca3af', margin: '2px 0 0' }}>{subtitle}</p>
              )}
            </div>
          </div>
          {action && <div>{action}</div>}
        </div>
      )}

      <div style={{ padding: '20px' }}>{children}</div>

      {footer && (
        <div
          style={{
            padding: '12px 20px',
            background: 'rgba(0, 0, 0, 0.15)',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          {footer}
        </div>
      )}
    </div>
  )
}
