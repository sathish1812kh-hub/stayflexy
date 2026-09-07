'use client'

import React from 'react'
import { Button, Card, Badge } from '../ui'
import { PlusCircle, RefreshCw, Zap, Sparkles, Building2, Terminal } from 'lucide-react'

export interface QuickActionsBarProps {
  onNewBooking: () => void
  onOtaSync: () => void
  onOptimizeRevenue: () => void
  onBulkClean: () => void
  isSyncing?: boolean
  isOptimizing?: boolean
  activeHotelName?: string
}

export const QuickActionsBar: React.FC<QuickActionsBarProps> = ({
  onNewBooking,
  onOtaSync,
  onOptimizeRevenue,
  onBulkClean,
  isSyncing = false,
  isOptimizing = false,
  activeHotelName = 'Grand Stayflexi Resort & Spa',
}) => {
  return (
    <Card
      variant="glass"
      style={{
        padding: '14px 20px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
      }}
    >
      {/* Left: Active Hotel & Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'rgba(0, 242, 254, 0.1)',
            border: '1px solid rgba(0, 242, 254, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#00f2fe',
          }}
        >
          <Building2 size={16} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#f3f4f6' }}>
              {activeHotelName}
            </span>
            <Badge status="available" pulse size="sm">
              LIVE PMS
            </Badge>
          </div>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>
            Multi-Tenant GraphQL Mesh &middot; Neo4j Synchronized
          </span>
        </div>
      </div>

      {/* Right: Quick Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<Sparkles size={13} />}
          onClick={onBulkClean}
        >
          Clean Dirty Rooms
        </Button>

        <Button
          size="sm"
          variant="secondary"
          leftIcon={<RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />}
          isLoading={isSyncing}
          loadingText="Syncing OTA..."
          onClick={onOtaSync}
        >
          Sync OTAs
        </Button>

        <Button
          size="sm"
          variant="accent"
          leftIcon={<Zap size={13} />}
          isLoading={isOptimizing}
          loadingText="Optimizing..."
          onClick={onOptimizeRevenue}
        >
          AI Yield Surge
        </Button>

        <Button
          size="sm"
          variant="primary"
          leftIcon={<PlusCircle size={14} />}
          onClick={onNewBooking}
        >
          New Reservation
        </Button>
      </div>
    </Card>
  )
}
