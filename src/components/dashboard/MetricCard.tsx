'use client'

import React from 'react'
import { Card, Skeleton } from '../ui'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export interface MetricCardProps {
  title: string
  value: string | number
  unit?: string
  change?: number // e.g. +12.5 or -3.2
  changePeriod?: string // e.g. "vs yesterday" or "vs last month"
  icon?: React.ReactNode
  accentColor?: string // e.g. "#00f2fe", "#10b981", "#7f00ff"
  isLoading?: boolean
  tooltip?: string
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  change,
  changePeriod = 'vs yesterday',
  icon,
  accentColor = '#00f2fe',
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <Card variant="glass" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <Skeleton width="100px" height="14px" />
          <Skeleton variant="circle" width="32px" height="32px" />
        </div>
        <Skeleton width="120px" height="28px" style={{ marginBottom: '8px' }} />
        <Skeleton width="80px" height="12px" />
      </Card>
    )
  }

  const isPositive = change !== undefined && change > 0
  const isNegative = change !== undefined && change < 0
  const isZero = change !== undefined && change === 0

  return (
    <Card
      variant="glass"
      isHoverable
      style={{
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle top accent line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
        }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
        }}
      >
        <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 500 }}>{title}</span>
        {icon && (
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: `rgba(255, 255, 255, 0.04)`,
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: accentColor,
              boxShadow: `0 0 12px ${accentColor}20`,
            }}
          >
            {icon}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '10px' }}>
        <span
          style={{ fontSize: '26px', fontWeight: 700, color: '#f3f4f6', letterSpacing: '-0.02em' }}
        >
          {value}
        </span>
        {unit && (
          <span style={{ fontSize: '14px', color: '#9ca3af', fontWeight: 500 }}>{unit}</span>
        )}
      </div>

      {change !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              fontWeight: 600,
              color: isPositive ? '#10b981' : isNegative ? '#ef4444' : '#9ca3af',
              background: isPositive
                ? 'rgba(16, 185, 129, 0.12)'
                : isNegative
                  ? 'rgba(239, 68, 68, 0.12)'
                  : 'rgba(156, 163, 175, 0.12)',
              padding: '2px 6px',
              borderRadius: '4px',
            }}
          >
            {isPositive && <TrendingUp size={12} />}
            {isNegative && <TrendingDown size={12} />}
            {isZero && <Minus size={12} />}
            {isPositive ? `+${change}%` : `${change}%`}
          </span>
          <span style={{ color: '#6b7280', fontSize: '11px' }}>{changePeriod}</span>
        </div>
      )}
    </Card>
  )
}
