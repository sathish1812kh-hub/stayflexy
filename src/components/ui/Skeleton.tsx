'use client'

import React from 'react'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'rect' | 'circle' | 'text'
  width?: string | number
  height?: string | number
  borderRadius?: string | number
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rect',
  width = '100%',
  height = '20px',
  borderRadius,
  className = '',
  style,
  ...props
}) => {
  const getRadius = () => {
    if (borderRadius) return borderRadius
    if (variant === 'circle') return '50%'
    if (variant === 'text') return '4px'
    return '8px'
  }

  return (
    <div
      style={{
        width,
        height,
        borderRadius: getRadius(),
        background:
          'linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.09) 50%, rgba(255, 255, 255, 0.04) 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-pulse 1.8s infinite cubic-bezier(0.4, 0, 0.6, 1)',
        display: 'inline-block',
        ...style,
      }}
      className={`stayflexi-skeleton ${className}`}
      {...props}
    />
  )
}
