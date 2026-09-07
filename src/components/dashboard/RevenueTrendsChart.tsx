'use client'

import React from 'react'
import { Card, Badge } from '../ui'
import { TrendingUp, DollarSign, BarChart3, Zap } from 'lucide-react'

export interface RevenueMetricItem {
  label: string
  value: string
  subvalue?: string
  trend?: number
  isPositive?: boolean
}

export interface RevenueTrendsChartProps {
  adr: number
  revPar: number
  occupancyRate: number
  totalRevenue: number
  surgeMultiplier?: number
  metrics?: RevenueMetricItem[]
  dailyOccupancy?: { day: string; rate: number; revenue: number }[]
}

export const RevenueTrendsChart: React.FC<RevenueTrendsChartProps> = ({
  adr,
  revPar,
  occupancyRate,
  totalRevenue,
  surgeMultiplier = 1.15,
  dailyOccupancy = [
    { day: 'Mon', rate: 72, revenue: 14200 },
    { day: 'Tue', rate: 78, revenue: 15600 },
    { day: 'Wed', rate: 85, revenue: 17200 },
    { day: 'Thu', rate: 89, revenue: 18400 },
    { day: 'Fri', rate: 96, revenue: 21200 },
    { day: 'Sat', rate: 98, revenue: 22800 },
    { day: 'Sun', rate: 84, revenue: 16900 },
  ],
}) => {
  const maxRevenue = Math.max(...dailyOccupancy.map((d) => d.revenue), 25000)

  return (
    <Card
      variant="glass"
      title="Dynamic Yield & Revenue Performance"
      subtitle="Real-time ADR, RevPAR, and Surge Pricing Curves"
      icon={<BarChart3 size={18} />}
      action={
        <Badge status="cyan" pulse size="sm">
          <Zap size={11} /> Surge {surgeMultiplier}x Active
        </Badge>
      }
    >
      {/* Top 4 KPI metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <span style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase' }}>
            Gross Revenue
          </span>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#f3f4f6', marginTop: '4px' }}>
            ${totalRevenue.toLocaleString()}
          </div>
          <span
            style={{
              fontSize: '10px',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              marginTop: '2px',
            }}
          >
            <TrendingUp size={10} /> +8.4% vs last wk
          </span>
        </div>

        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <span style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase' }}>
            ADR (Avg Daily Rate)
          </span>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#00f2fe', marginTop: '4px' }}>
            ${adr.toFixed(2)}
          </div>
          <span style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px', display: 'block' }}>
            Yield optimized
          </span>
        </div>

        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <span style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase' }}>
            RevPAR
          </span>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#c084fc', marginTop: '4px' }}>
            ${revPar.toFixed(2)}
          </div>
          <span
            style={{
              fontSize: '10px',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              marginTop: '2px',
            }}
          >
            <TrendingUp size={10} /> +12.1%
          </span>
        </div>

        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <span style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase' }}>
            Occupancy Rate
          </span>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>
            {occupancyRate.toFixed(1)}%
          </div>
          <span style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px', display: 'block' }}>
            Near peak threshold
          </span>
        </div>
      </div>

      {/* Visual 7-day Bar Chart */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#e5e7eb' }}>
            Weekly Occupancy & Revenue Velocity
          </span>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>Current Week</span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${dailyOccupancy.length}, 1fr)`,
            gap: '12px',
            alignItems: 'flex-end',
            height: '140px',
            paddingTop: '20px',
            paddingBottom: '8px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {dailyOccupancy.map((item) => {
            const heightPercent = (item.revenue / maxRevenue) * 100
            return (
              <div
                key={item.day}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'flex-end',
                  gap: '6px',
                }}
              >
                {/* Value label on top */}
                <span style={{ fontSize: '9px', color: '#9ca3af' }}>{item.rate}%</span>

                {/* Animated bar */}
                <div
                  style={{
                    width: '100%',
                    maxWidth: '36px',
                    height: `${heightPercent}%`,
                    minHeight: '8px',
                    borderRadius: '6px 6px 2px 2px',
                    background:
                      item.rate >= 90
                        ? 'linear-gradient(180deg, #00f2fe 0%, rgba(0, 242, 254, 0.4) 100%)'
                        : 'linear-gradient(180deg, #4facfe 0%, rgba(79, 172, 254, 0.4) 100%)',
                    boxShadow: item.rate >= 90 ? '0 0 12px rgba(0, 242, 254, 0.3)' : 'none',
                    transition: 'height 0.4s ease-out',
                  }}
                  title={`${item.day}: $${item.revenue.toLocaleString()} (${item.rate}% occ)`}
                />

                {/* Day label */}
                <span style={{ fontSize: '11px', fontWeight: 500, color: '#d1d5db' }}>
                  {item.day}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
