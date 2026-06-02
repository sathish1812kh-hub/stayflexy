'use client'

import React, { useState, useEffect } from 'react'
import { 
  CheckCircle, 
  Home, 
  Wifi, 
  WifiOff, 
  RotateCw, 
  Building, 
  Check, 
  Loader2, 
  Sparkles,
  AlertTriangle,
  Clock,
  HelpCircle,
  Menu
} from 'lucide-react'
import dataClient, { Room, Hotel } from '../../dataClient'

interface HousekeepingQueueItem {
  id: string
  roomId: string
  status: Room['status']
  checklist: string[]
  timestamp: string
}

export default function HousekeepingMobile() {
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [selectedHotelId, setSelectedHotelId] = useState<string>('')
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  
  // Clean checklist states
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({
    linen: false,
    dusting: false,
    bathroom: false,
    minibar: false
  })

  // Connectivity Simulation
  const [isOnline, setIsOnline] = useState<boolean>(true)
  const [syncQueue, setSyncQueue] = useState<HousekeepingQueueItem[]>([])
  const [isSyncing, setIsSyncing] = useState<boolean>(false)
  const [filterStatus, setFilterStatus] = useState<string>('HOUSEKEEPING')

  // Load properties & room inventory
  useEffect(() => {
    async function loadInitialData() {
      const h = await dataClient.getHotels()
      setHotels(h)
      
      const savedHotel = localStorage.getItem('sf_selected_hotel')
      const targetHotelId = savedHotel || (h.length > 0 ? h[0]!.id : '')
      setSelectedHotelId(targetHotelId)
      
      if (targetHotelId) {
        const allRooms = await dataClient.getRooms()
        setRooms(allRooms.filter(r => r.hotelId === targetHotelId))
      }

      // Load local sync queue
      if (typeof window !== 'undefined') {
        const savedQueue = localStorage.getItem('sf_housekeeping_sync_queue')
        if (savedQueue) {
          setSyncQueue(JSON.parse(savedQueue))
        }
      }
    }
    loadInitialData()
  }, [])

  // Sync effect when connectivity flips to ONLINE
  useEffect(() => {
    if (isOnline && syncQueue.length > 0) {
      flushSyncQueue()
    }
  }, [isOnline])

  const handleHotelChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const hotelId = e.target.value
    setSelectedHotelId(hotelId)
    localStorage.setItem('sf_selected_hotel', hotelId)
    const allRooms = await dataClient.getRooms()
    setRooms(allRooms.filter(r => r.hotelId === hotelId))
    setSelectedRoom(null)
  }

  const selectRoomForCleaning = (room: Room) => {
    setSelectedRoom(room)
    // Pre-populate clean checkpoints
    setCheckedItems({
      linen: room.status === 'AVAILABLE',
      dusting: room.status === 'AVAILABLE',
      bathroom: room.status === 'AVAILABLE',
      minibar: room.status === 'AVAILABLE'
    })
  }

  const toggleChecklist = (key: string) => {
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Flush offline queue changes back to server
  const flushSyncQueue = async () => {
    if (syncQueue.length === 0) return
    setIsSyncing(true)
    
    // Process items sequentially
    for (const item of syncQueue) {
      try {
        await dataClient.updateRoomStatus(item.roomId, item.status, `Housekeeper completed checklist offline: ${item.checklist.join(', ')}`)
      } catch (err) {
        console.error('Error syncing item:', err)
      }
    }

    // Refresh rooms catalog
    const allRooms = await dataClient.getRooms()
    setRooms(allRooms.filter(r => r.hotelId === selectedHotelId))

    // Clear sync queue
    setSyncQueue([])
    localStorage.removeItem('sf_housekeeping_sync_queue')
    setIsSyncing(false)
  }

  const completeRoomCleaning = async () => {
    if (!selectedRoom) return

    const checklistNames = Object.entries(checkedItems)
      .filter(([_, checked]) => checked)
      .map(([name]) => name.toUpperCase())

    if (isOnline) {
      setIsSyncing(true)
      await dataClient.updateRoomStatus(
        selectedRoom.id, 
        'AVAILABLE', 
        `Turnover completed: Linen, Dusting, Bathroom, Minibar. Room clean and verified.`
      )
      
      const allRooms = await dataClient.getRooms()
      setRooms(allRooms.filter(r => r.hotelId === selectedHotelId))
      setIsSyncing(false)
    } else {
      // Queue offline status update
      const newQueueItem: HousekeepingQueueItem = {
        id: `q-${Math.random().toString(36).substr(2, 9)}`,
        roomId: selectedRoom.id,
        status: 'AVAILABLE',
        checklist: checklistNames,
        timestamp: new Date().toISOString()
      }

      const updatedQueue = [...syncQueue, newQueueItem]
      setSyncQueue(updatedQueue)
      localStorage.setItem('sf_housekeeping_sync_queue', JSON.stringify(updatedQueue))

      // Instant local state update to simulate quick turnaround visually
      setRooms(prev => prev.map(r => r.id === selectedRoom.id ? { ...r, status: 'AVAILABLE' } : r))
    }

    setSelectedRoom(null)
  }

  // Room status badges and glow configs
  const getStatusConfig = (status: Room['status']) => {
    switch (status) {
      case 'AVAILABLE':
        return { label: 'AVAILABLE', color: '#10b981', glow: 'rgba(16, 185, 129, 0.25)', border: 'rgba(16, 185, 129, 0.4)' }
      case 'OCCUPIED':
        return { label: 'OCCUPIED', color: '#ef4444', glow: 'rgba(239, 68, 68, 0.2)', border: 'rgba(239, 68, 68, 0.4)' }
      case 'HOUSEKEEPING':
        return { label: 'TURNOVER', color: '#a855f7', glow: 'rgba(168, 85, 247, 0.35)', border: 'rgba(168, 85, 247, 0.6)' }
      case 'MAINTENANCE':
        return { label: 'MAINTENANCE', color: '#3b82f6', glow: 'rgba(59, 130, 246, 0.2)', border: 'rgba(59, 130, 246, 0.4)' }
      default:
        return { label: 'BLOCKED', color: '#6b7280', glow: 'rgba(107, 114, 128, 0.2)', border: 'rgba(107, 114, 128, 0.4)' }
    }
  }

  const filteredRooms = rooms.filter(r => filterStatus === 'ALL' || r.status === filterStatus)

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', background: '#060913', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: '#f3f4f6', fontFamily: 'var(--font-sans)', borderLeft: '1px solid rgba(255,255,255,0.05)', borderRight: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
      
      {/* Dynamic Connectivity Notification Panel */}
      <div 
        style={{ 
          background: isOnline ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
          borderBottom: `1px solid ${isOnline ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.25)'}`,
          padding: '8px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          fontWeight: 600
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isOnline ? (
            <>
              <Wifi size={14} color="#10b981" />
              <span style={{ color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sync Connected - Cloud Active</span>
            </>
          ) : (
            <>
              <WifiOff size={14} color="#f59e0b" style={{ animation: 'pulse 1.5s infinite' }} />
              <span style={{ color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Offline Cache Active</span>
            </>
          )}
        </div>

        {/* Sync queue indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {syncQueue.length > 0 && (
            <span style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 6px', borderRadius: '4px', fontSize: '9px' }}>
              {syncQueue.length} Pending Actions
            </span>
          )}
          
          {/* Simulated Signal Toggle Switch */}
          <button 
            onClick={() => setIsOnline(!isOnline)} 
            style={{ 
              background: 'rgba(255,255,255,0.03)', 
              border: '1px solid rgba(255,255,255,0.1)', 
              padding: '2px 8px', 
              borderRadius: '4px', 
              color: '#9ca3af', 
              fontSize: '9px',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Force {isOnline ? 'Offline' : 'Online'}
          </button>
        </div>
      </div>

      {/* Header Profile details */}
      <header style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'linear-gradient(to bottom, rgba(16, 22, 42, 0.4), transparent)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #a855f7, #7f00ff)', display: 'flex', alignItems: 'center', color: '#060913', fontWeight: 700, fontSize: '14px', justifyContent: 'center' }}>
              H
            </div>
            <div>
              <h1 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>Housekeeping Turn</h1>
              <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>Shift: Morning Crew (8h Slots)</p>
            </div>
          </div>

          {/* Selector Switch Property */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '8px' }}>
            <Building size={12} color="#a855f7" />
            <select 
              value={selectedHotelId} 
              onChange={handleHotelChange}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: '11px', fontWeight: 600, cursor: 'pointer', outline: 'none' }}
            >
              {hotels.map(h => (
                <option key={h.id} value={h.id} style={{ background: '#060913', color: '#fff' }}>
                  {h.city} Resort
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab Filters */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
          {['ALL', 'HOUSEKEEPING', 'AVAILABLE', 'OCCUPIED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 600,
                border: filterStatus === st ? '1px solid #a855f7' : '1px solid rgba(255,255,255,0.05)',
                background: filterStatus === st ? 'rgba(168, 85, 247, 0.08)' : 'rgba(255,255,255,0.02)',
                color: filterStatus === st ? '#a855f7' : '#9ca3af',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              {st === 'HOUSEKEEPING' ? 'DIRTY TURNOVER' : st}
            </button>
          ))}
        </div>
      </header>

      {/* Main clean task list */}
      <main style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {filteredRooms.map(room => {
            const config = getStatusConfig(room.status)
            const isSelected = selectedRoom?.id === room.id

            return (
              <button
                key={room.id}
                onClick={() => selectRoomForCleaning(room)}
                style={{
                  background: isSelected ? 'rgba(168, 85, 247, 0.08)' : 'rgba(16, 22, 42, 0.5)',
                  border: isSelected ? '1px solid #a855f7' : `1px solid ${config.border}`,
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isSelected ? '0 0 15px rgba(168, 85, 247, 0.15)' : `0 4px 10px ${config.glow}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Room {room.roomNumber}</span>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: config.color, background: `${config.color}15`, padding: '2px 6px', borderRadius: '4px', border: `1px solid ${config.color}25` }}>
                    {config.label}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>Floor: {room.floor || 1}</span>
                  <span style={{ fontSize: '10px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                    {room.notes || 'No special requests'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Empty Catalog View */}
        {filteredRooms.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '240px', color: '#6b7280', gap: '12px' }}>
            <Home size={32} />
            <span style={{ fontSize: '13px', fontWeight: 500 }}>No rooms match the selected filter.</span>
          </div>
        )}
      </main>

      {/* Checklist Panel Drawer (Visible when room is selected) */}
      {selectedRoom && (
        <div 
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            background: 'rgba(10, 15, 30, 0.95)',
            borderTop: '1px solid var(--border-card-active)',
            borderRadius: '20px 20px 0 0',
            padding: '24px 20px',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 -10px 30px rgba(168, 85, 247, 0.1)',
            zIndex: 100,
            animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#a855f7', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Task Detail</span>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: '2px 0 0' }}>Clean Room {selectedRoom.roomNumber}</h2>
            </div>
            <button 
              onClick={() => setSelectedRoom(null)} 
              style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              ×
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {/* Checklist options */}
            {[
              { id: 'linen', label: 'Linen & Bedding Refresh', desc: 'Swap all towels, sheets, pillowcases with sanitised items.' },
              { id: 'dusting', label: 'Dusting & Surface Sanitation', desc: 'Disinfect desks, TV remotes, light switches and sideboards.' },
              { id: 'bathroom', label: 'Bathroom Disinfection & Polish', desc: 'Sanitise toilet, shower stall, mirrors, and replenish soaps.' },
              { id: 'minibar', label: 'Minibar & Amenities Restock', desc: 'Verify minibar counters, refill custom snacks, waters, coffees.' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => toggleChecklist(item.id)}
                style={{
                  background: checkedItems[item.id] ? 'rgba(168, 85, 247, 0.05)' : 'rgba(255,255,255,0.02)',
                  border: checkedItems[item.id] ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  width: '100%',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ 
                  width: '18px', 
                  height: '18px', 
                  borderRadius: '4px', 
                  border: `1px solid ${checkedItems[item.id] ? '#a855f7' : 'rgba(255,255,255,0.2)'}`,
                  background: checkedItems[item.id] ? '#a855f7' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s'
                }}>
                  {checkedItems[item.id] && <Check size={12} color="#060913" strokeWidth={3} />}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: checkedItems[item.id] ? '#fff' : '#cbd5e1' }}>{item.label}</div>
                  <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>{item.desc}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Call to action button */}
          <button
            onClick={completeRoomCleaning}
            disabled={isSyncing}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #a855f7, #7f00ff)',
              border: 'none',
              padding: '14px',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: isSyncing ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 15px rgba(168, 85, 247, 0.3)'
            }}
          >
            {isSyncing ? (
              <>
                <Loader2 size={16} className="spinner" />
                <span>Syncing Status...</span>
              </>
            ) : (
              <>
                <CheckCircle size={16} />
                <span>Mark Room Clean & Ready ({isOnline ? 'Instant' : 'Queue Offline'})</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Inject slideUp drawer animations */}
      <style jsx global>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .spinner {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
