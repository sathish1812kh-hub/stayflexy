'use client'

import React from 'react'
import { Card, Badge, BadgeStatus, Button } from '../ui'
import { KeyRound, Sparkles, Wrench, Ban, User, BedSingle } from 'lucide-react'

export interface RoomCardProps {
  id: string
  roomNumber: string
  typeName: string
  floor?: number | null
  status: 'AVAILABLE' | 'OCCUPIED' | 'OUT_OF_ORDER' | 'HOUSEKEEPING' | 'MAINTENANCE' | 'BLOCKED'
  pricePerNight?: number
  guestName?: string | null
  onStatusChange?: (roomId: string, newStatus: string) => void
  onClick?: (roomId: string) => void
}

export const RoomCard: React.FC<RoomCardProps> = ({
  id,
  roomNumber,
  typeName,
  floor,
  status,
  pricePerNight,
  guestName,
  onStatusChange,
  onClick,
}) => {
  const getBadgeStatus = (): BadgeStatus => {
    switch (status) {
      case 'AVAILABLE':
        return 'available'
      case 'OCCUPIED':
        return 'occupied'
      case 'HOUSEKEEPING':
        return 'housekeeping'
      case 'MAINTENANCE':
        return 'maintenance'
      case 'OUT_OF_ORDER':
        return 'outoforder'
      case 'BLOCKED':
      default:
        return 'blocked'
    }
  }

  const getStatusLabel = (): string => {
    switch (status) {
      case 'AVAILABLE':
        return 'Available'
      case 'OCCUPIED':
        return 'Occupied'
      case 'HOUSEKEEPING':
        return 'Dirty'
      case 'MAINTENANCE':
        return 'Maintenance'
      case 'OUT_OF_ORDER':
        return 'Out of Order'
      case 'BLOCKED':
        return 'Blocked'
    }
  }

  return (
    <Card
      variant="glass"
      isHoverable
      onClick={() => onClick && onClick(id)}
      style={{
        padding: '16px',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '140px',
      }}
    >
      {/* Top row: Room number & status badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '10px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#f3f4f6' }}>
              #{roomNumber}
            </span>
            {floor !== null && floor !== undefined && (
              <span
                style={{
                  fontSize: '11px',
                  color: '#6b7280',
                  background: 'rgba(255,255,255,0.05)',
                  padding: '1px 5px',
                  borderRadius: '4px',
                }}
              >
                Fl {floor}
              </span>
            )}
          </div>
          <span
            style={{
              fontSize: '12px',
              color: '#9ca3af',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: '2px',
            }}
          >
            <BedSingle size={12} /> {typeName}
          </span>
        </div>

        <Badge
          status={getBadgeStatus()}
          pulse={status === 'AVAILABLE' || status === 'OCCUPIED'}
          size="sm"
        >
          {getStatusLabel()}
        </Badge>
      </div>

      {/* Guest name if occupied */}
      {status === 'OCCUPIED' && guestName && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '6px',
            padding: '6px 8px',
            fontSize: '11px',
            color: '#fca5a5',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '10px',
          }}
        >
          <User size={12} />
          <span
            style={{
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {guestName}
          </span>
        </div>
      )}

      {/* Bottom row: Price & Quick Action */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 'auto',
          paddingTop: '8px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {pricePerNight !== undefined ? (
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#00f2fe' }}>
            ${pricePerNight}
            <span style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 400 }}>/nt</span>
          </span>
        ) : (
          <span />
        )}

        {/* Quick status cycle button */}
        {onStatusChange && (
          <div style={{ display: 'flex', gap: '4px' }}>
            {status === 'HOUSEKEEPING' && (
              <Button
                size="xs"
                variant="outline"
                leftIcon={<Sparkles size={11} />}
                onClick={(e) => {
                  e.stopPropagation()
                  onStatusChange(id, 'AVAILABLE')
                }}
              >
                Mark Clean
              </Button>
            )}
            {status === 'AVAILABLE' && (
              <Button
                size="xs"
                variant="secondary"
                leftIcon={<KeyRound size={11} />}
                onClick={(e) => {
                  e.stopPropagation()
                  onStatusChange(id, 'OCCUPIED')
                }}
              >
                Check In
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
