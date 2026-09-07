'use client'

import React from 'react'

export type BadgeStatus =
  | 'available'
  | 'occupied'
  | 'housekeeping'
  | 'maintenance'
  | 'outoforder'
  | 'blocked'
  | 'cyan'
  | 'neutral'
  | 'purple'

export type BadgeSize = 'sm' | 'md'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: BadgeStatus
  size?: BadgeSize
  pulse?: boolean
  icon?: React.ReactNode
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  status = 'neutral',
  size = 'md',
  pulse = false,
  icon,
  className = '',
  style,
  ...props
}) => {
  const getStatusStyles = (): { bg: string; color: string; border: string; dot: string } => {
    switch (status) {
      case 'available':
        return {
          bg: 'rgba(16, 185, 129, 0.15)',
          color: '#10b981',
          border: 'rgba(16, 185, 129, 0.3)',
          dot: '#10b981',
        }
      case 'occupied':
        return {
          bg: 'rgba(239, 68, 68, 0.15)',
          color: '#ef4444',
          border: 'rgba(239, 68, 68, 0.3)',
          dot: '#ef4444',
        }
      case 'housekeeping':
        return {
          bg: 'rgba(168, 85, 247, 0.15)',
          color: '#a855f7',
          border: 'rgba(168, 85, 247, 0.3)',
          dot: '#a855f7',
        }
      case 'maintenance':
        return {
          bg: 'rgba(59, 130, 246, 0.15)',
          color: '#3b82f6',
          border: 'rgba(59, 130, 246, 0.3)',
          dot: '#3b82f6',
        }
      case 'outoforder':
        return {
          bg: 'rgba(245, 158, 11, 0.15)',
          color: '#f59e0b',
          border: 'rgba(245, 158, 11, 0.3)',
          dot: '#f59e0b',
        }
      case 'cyan':
        return {
          bg: 'rgba(0, 242, 254, 0.15)',
          color: '#00f2fe',
          border: 'rgba(0, 242, 254, 0.3)',
          dot: '#00f2fe',
        }
      case 'purple':
        return {
          bg: 'rgba(127, 0, 255, 0.15)',
          color: '#c084fc',
          border: 'rgba(127, 0, 255, 0.3)',
          dot: '#7f00ff',
        }
      case 'blocked':
      case 'neutral':
      default:
        return {
          bg: 'rgba(156, 163, 175, 0.15)',
          color: '#9ca3af',
          border: 'rgba(156, 163, 175, 0.3)',
          dot: '#9ca3af',
        }
    }
  }

  const currentStatus = getStatusStyles()

  const sizeStyles: React.CSSProperties =
    size === 'sm'
      ? { padding: '2px 6px', fontSize: '10px', borderRadius: '4px' }
      : { padding: '3px 10px', fontSize: '11px', borderRadius: '6px' }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        background: currentStatus.bg,
        color: currentStatus.color,
        border: `1px solid ${currentStatus.border}`,
        ...sizeStyles,
        ...style,
      }}
      className={`stayflexi-badge stayflexi-badge-${status} ${className}`}
      {...props}
    >
      {pulse && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: currentStatus.dot,
            boxShadow: `0 0 8px ${currentStatus.dot}`,
            display: 'inline-block',
          }}
        />
      )}
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      <span>{children}</span>
    </span>
  )
}
