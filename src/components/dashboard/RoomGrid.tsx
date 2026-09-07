'use client'

import React, { useState, useMemo } from 'react'
import { RoomCard } from './RoomCard'
import { Button, Card, Skeleton } from '../ui'
import { Search, Filter, RefreshCw, SlidersHorizontal } from 'lucide-react'

export interface RoomGridItem {
  id: string
  roomNumber: string
  typeName: string
  floor?: number | null
  status: 'AVAILABLE' | 'OCCUPIED' | 'OUT_OF_ORDER' | 'HOUSEKEEPING' | 'MAINTENANCE' | 'BLOCKED'
  pricePerNight?: number
  guestName?: string | null
}

export interface RoomGridProps {
  rooms: RoomGridItem[]
  isLoading?: boolean
  onStatusChange?: (roomId: string, newStatus: string) => void
  onRoomSelect?: (roomId: string) => void
  onRefresh?: () => void
}

type FilterTab = 'ALL' | 'AVAILABLE' | 'OCCUPIED' | 'HOUSEKEEPING' | 'MAINTENANCE' | 'OUT_OF_ORDER'

export const RoomGrid: React.FC<RoomGridProps> = ({
  rooms,
  isLoading = false,
  onStatusChange,
  onRoomSelect,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFloor, setSelectedFloor] = useState<string>('ALL')

  // Available floors extracted from rooms
  const floors = useMemo(() => {
    const set = new Set<number>()
    rooms.forEach((r) => {
      if (r.floor !== null && r.floor !== undefined) set.add(r.floor)
    })
    return Array.from(set).sort((a, b) => a - b)
  }, [rooms])

  // Count summaries
  const counts = useMemo(() => {
    return {
      all: rooms.length,
      available: rooms.filter((r) => r.status === 'AVAILABLE').length,
      occupied: rooms.filter((r) => r.status === 'OCCUPIED').length,
      housekeeping: rooms.filter((r) => r.status === 'HOUSEKEEPING').length,
      maintenance: rooms.filter((r) => r.status === 'MAINTENANCE').length,
      outOfOrder: rooms.filter((r) => r.status === 'OUT_OF_ORDER').length,
    }
  }, [rooms])

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      // Tab filter
      if (activeTab !== 'ALL' && room.status !== activeTab) return false

      // Floor filter
      if (selectedFloor !== 'ALL' && room.floor !== parseInt(selectedFloor, 10)) return false

      // Search query filter (room number, type, guest name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchNumber = room.roomNumber.toLowerCase().includes(q)
        const matchType = room.typeName.toLowerCase().includes(q)
        const matchGuest = room.guestName ? room.guestName.toLowerCase().includes(q) : false
        if (!matchNumber && !matchType && !matchGuest) return false
      }

      return true
    })
  }, [rooms, activeTab, selectedFloor, searchQuery])

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Skeleton width="100%" height="48px" />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '16px',
          }}
        >
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} width="100%" height="150px" borderRadius="12px" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Filter & Search Bar */}
      <Card
        variant="glass"
        style={{
          padding: '12px 16px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {(
            [
              { key: 'ALL', label: 'All Rooms', count: counts.all },
              { key: 'AVAILABLE', label: 'Available', count: counts.available, color: '#10b981' },
              { key: 'OCCUPIED', label: 'Occupied', count: counts.occupied, color: '#ef4444' },
              { key: 'HOUSEKEEPING', label: 'Dirty', count: counts.housekeeping, color: '#a855f7' },
              {
                key: 'MAINTENANCE',
                label: 'Maintenance',
                count: counts.maintenance,
                color: '#3b82f6',
              },
              {
                key: 'OUT_OF_ORDER',
                label: 'Out of Order',
                count: counts.outOfOrder,
                color: '#f59e0b',
              },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  background: isActive ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                  color: isActive ? '#00f2fe' : '#9ca3af',
                  border: isActive
                    ? '1px solid rgba(0, 242, 254, 0.4)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s',
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    background: isActive ? 'rgba(0, 242, 254, 0.25)' : 'rgba(0, 0, 0, 0.3)',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    fontSize: '10px',
                  }}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Right side: Search, Floor Select, Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              padding: '4px 10px',
              gap: '6px',
            }}
          >
            <Search size={14} color="#9ca3af" />
            <input
              type="text"
              placeholder="Search room, guest..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#f3f4f6',
                fontSize: '12px',
                outline: 'none',
                width: '140px',
              }}
            />
          </div>

          {/* Floor filter */}
          {floors.length > 0 && (
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#f3f4f6',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '12px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">All Floors</option>
              {floors.map((f) => (
                <option key={f} value={f.toString()}>
                  Floor {f}
                </option>
              ))}
            </select>
          )}

          {onRefresh && (
            <Button size="sm" variant="ghost" onClick={onRefresh} aria-label="Refresh rooms">
              <RefreshCw size={14} />
            </Button>
          )}
        </div>
      </Card>

      {/* Grid of Room Cards */}
      {filteredRooms.length === 0 ? (
        <Card variant="glass" style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>
            No rooms match your filter criteria.
          </p>
        </Card>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
            gap: '16px',
          }}
        >
          {filteredRooms.map((room) => (
            <RoomCard
              key={room.id}
              id={room.id}
              roomNumber={room.roomNumber}
              typeName={room.typeName}
              floor={room.floor}
              status={room.status}
              pricePerNight={room.pricePerNight}
              guestName={room.guestName}
              onStatusChange={onStatusChange}
              onClick={onRoomSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}
