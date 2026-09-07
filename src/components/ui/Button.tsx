'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'accent'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  loadingText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  className = '',
  style,
  ...props
}) => {
  // Variant styles mapped to Stayflexi design tokens
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
          color: '#060913',
          border: '1px solid rgba(0, 242, 254, 0.4)',
          boxShadow: '0 0 16px rgba(0, 242, 254, 0.25)',
          fontWeight: 600,
        }
      case 'secondary':
        return {
          background: 'rgba(255, 255, 255, 0.05)',
          color: '#f3f4f6',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(8px)',
        }
      case 'danger':
        return {
          background:
            'linear-gradient(135deg, rgba(239, 68, 68, 0.9) 0%, rgba(185, 28, 28, 0.9) 100%)',
          color: '#ffffff',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          boxShadow: '0 0 14px rgba(239, 68, 68, 0.3)',
          fontWeight: 600,
        }
      case 'accent':
        return {
          background: 'linear-gradient(135deg, #7f00ff 0%, #e100ff 100%)',
          color: '#ffffff',
          border: '1px solid rgba(127, 0, 255, 0.4)',
          boxShadow: '0 0 16px rgba(127, 0, 255, 0.3)',
          fontWeight: 600,
        }
      case 'outline':
        return {
          background: 'transparent',
          color: '#00f2fe',
          border: '1px solid rgba(0, 242, 254, 0.5)',
        }
      case 'ghost':
        return {
          background: 'transparent',
          color: '#9ca3af',
          border: '1px solid transparent',
        }
    }
  }

  const getSizeStyles = (): React.CSSProperties => {
    switch (size) {
      case 'xs':
        return { padding: '4px 8px', fontSize: '11px', borderRadius: '4px', gap: '4px' }
      case 'sm':
        return { padding: '6px 12px', fontSize: '12px', borderRadius: '6px', gap: '6px' }
      case 'md':
        return { padding: '8px 16px', fontSize: '13px', borderRadius: '8px', gap: '8px' }
      case 'lg':
        return { padding: '12px 24px', fontSize: '15px', borderRadius: '10px', gap: '10px' }
    }
  }

  const isDisabled = disabled || isLoading

  return (
    <button
      disabled={isDisabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.6 : 1,
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        width: fullWidth ? '100%' : 'auto',
        userSelect: 'none',
        outline: 'none',
        ...getVariantStyles(),
        ...getSizeStyles(),
        ...style,
      }}
      className={`stayflexi-btn stayflexi-btn-${variant} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2
            style={{ animation: 'spin 1s linear infinite', width: '14px', height: '14px' }}
          />
          <span>{loadingText || children}</span>
        </>
      ) : (
        <>
          {leftIcon && (
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>{leftIcon}</span>
          )}
          <span>{children}</span>
          {rightIcon && (
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>{rightIcon}</span>
          )}
        </>
      )}
    </button>
  )
}
